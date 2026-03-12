import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entry, get_user_settings, update_entry_fields
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in

SYSTEM_PROMPT = """You are a careful writing editor for a private journaling app.
Your job is to gently improve the grammar, clarity, and flow of a journal entry
while completely preserving the writer's personal voice, tone, and meaning.

Rules:
- Detect the language(s) the writer is using before making any changes
- If the entry is in Hinglish (Hindi + English mixed), Roman Urdu, or any other
  mixed/regional language style — preserve that mix completely. Do NOT translate
  Hindi/Urdu words to English. Do NOT correct Hinglish as if it were broken English.
- If the entry is in pure Hindi (Devanagari or Roman), preserve it as-is and only
  fix obvious typos
- If the entry is in pure English, fix grammar and clarity normally
- Fix only clear spelling mistakes within whatever language the writer is using
- Improve sentence clarity where needed without changing the language style
- Keep the same emotional tone — do NOT make it sound formal or clinical
- Do NOT add new ideas, opinions, or content that wasn't there
- Do NOT remove personal details, emotions, or specific memories
- Preserve informal language, slang, and personality — that is the writer's voice
- The entry is in HTML format — preserve ALL HTML tags exactly as they are
- Only change the text content inside the tags, never the tags themselves
- Return ONLY a JSON object, no extra text or markdown

Examples of what NOT to change:
- "aaj bahut thaka hua feel ho raha hai" → keep as-is, do not translate
- "yaar it was such a vibe today" → keep "yaar" and "vibe", just fix if misspelled
- "maine socha ki maybe I should just chill" → preserve the mix, don't flatten it

Response format:
{
  "polishedHtml": "<p>The corrected HTML here...</p>",
  "changes": "Brief one-sentence summary of what was changed (mention language preserved if mixed)"
}"""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_POST(self):
        # ── 1. Verify auth ────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── 2. Rate limit ─────────────────────────────────────
        allowed, count, limit = check_rate_limit(uid, "polish")
        if not allowed:
            return send_error(self, f"Daily polish limit reached ({limit}/day). Try again tomorrow.", 429)

        # ── 3. Parse body ─────────────────────────────────────
        try:
            body     = read_json_body(self)
            entry_id = body.get("entryId")
            if not entry_id:
                return send_error(self, "entryId is required", 400)
        except Exception:
            return send_error(self, "Invalid JSON body", 400)

        # ── 4. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled. Enable them in Settings.", 403)

        # ── 5. Fetch entry ────────────────────────────────────
        entry = get_entry(uid, entry_id)
        if not entry:
            return send_error(self, "Entry not found", 404)

        body_html = entry.get("body", "").strip()
        body_text = entry.get("bodyText", "").strip()

        if not body_text or len(body_text) < 10:
            return send_error(self, "Entry has too little content to polish", 400)

        # ── 6. Call GPT-4o-mini ───────────────────────────────
        try:
            response_text = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=(
                    f"Please polish this journal entry.\n\n"
                    f"HTML content:\n{body_html[:4000]}"
                ),
                max_tokens=1500,
                temperature=0.3,
                json_mode=True,
            )

            result       = json.loads(response_text)
            polished_html = result.get("polishedHtml", "").strip()
            changes      = result.get("changes", "")

            if not polished_html:
                return send_error(self, "AI returned empty content", 500)

        except json.JSONDecodeError:
            return send_error(self, "AI returned invalid response", 500)
        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 7. Save polished content to Firestore ─────────────
        # Strip HTML tags for bodyText
        import re
        plain_text = re.sub(r'<[^>]+>', ' ', polished_html)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        word_count = len(plain_text.split()) if plain_text else 0

        try:
            update_entry_fields(uid, entry_id, {
                "body":      polished_html,
                "bodyText":  plain_text,
                "wordCount": word_count,
            })
        except Exception as e:
            print(f"Warning: could not save polished entry: {e}")

        # ── 8. Return ─────────────────────────────────────────
        send_json(self, {
            "polishedHtml": polished_html,
            "changes":      changes,
            "remaining":    limit - count,
        })

    def log_message(self, format, *args):
        pass