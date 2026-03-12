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

VALID_MOODS = ['calm', 'grateful', 'energized', 'low', 'anxious', 'inspired', 'frustrated', 'reflective']

SYSTEM_PROMPT = """You are an emotionally intelligent journaling assistant.
Your job is to read a journal entry and identify which moods the writer is experiencing.

Available moods (you may only use these exact values):
- calm: peaceful, relaxed, content, at ease
- grateful: thankful, appreciative, blessed
- energized: excited, motivated, enthusiastic, pumped
- low: sad, down, melancholic, tired, drained
- anxious: worried, nervous, stressed, overwhelmed
- inspired: creative, motivated by ideas, visionary
- frustrated: annoyed, irritated, stuck, blocked
- reflective: thoughtful, introspective, contemplative, nostalgic

Rules:
- Return 1 to 3 moods maximum that best match the entry
- Only use the exact mood values listed above
- Pick moods based on the EMOTIONAL TONE, not just keywords
- If someone writes "It was a pleasant day" → calm, grateful
- If someone writes "I have so many ideas" → inspired, energized
- Return your answer as valid JSON only, no extra text

Response format:
{
  "moods": ["mood1", "mood2"],
  "reasoning": "One sentence explaining why these moods were chosen"
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
        allowed, count, limit = check_rate_limit(uid, "mood")
        if not allowed:
            return send_error(self, f"Daily mood prediction limit reached ({limit}/day).", 429)

        # ── 3. Parse request body ─────────────────────────────
        try:
            body     = read_json_body(self)
            entry_id = body.get("entryId")
            raw_text = body.get("text", "").strip()
        except Exception:
            return send_error(self, "Invalid JSON body", 400)

        if not entry_id and not raw_text:
            return send_error(self, "Either entryId or text is required", 400)

        # ── 4. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled. Enable them in Settings.", 403)

        # ── 5. Get text to analyse ────────────────────────────
        text_to_analyse = raw_text

        if entry_id:
            entry = get_entry(uid, entry_id)
            if not entry:
                return send_error(self, "Entry not found", 404)
            text_to_analyse = entry.get("bodyText", "").strip()
            if not text_to_analyse:
                text_to_analyse = entry.get("title", "").strip()

        if not text_to_analyse or len(text_to_analyse) < 5:
            return send_error(self, "Entry has too little content to predict moods", 400)

        # ── 6. Call GPT-4o-mini ───────────────────────────────
        try:
            response_text = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=f"Journal entry:\n{text_to_analyse[:2000]}",
                max_tokens=150,
                temperature=0.3,   # low temp = more consistent mood picks
                json_mode=True,
            )

            result    = json.loads(response_text)
            moods     = result.get("moods", [])
            reasoning = result.get("reasoning", "")

            # Validate — only allow known mood values
            moods = [m for m in moods if m in VALID_MOODS][:3]

            if not moods:
                return send_error(self, "Could not predict moods from this entry", 400)

        except json.JSONDecodeError:
            return send_error(self, "AI returned invalid response", 500)
        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 7. Save moods back to Firestore (if entryId given) ─
        if entry_id:
            try:
                update_entry_fields(uid, entry_id, {"moods": moods})
            except Exception as e:
                print(f"Warning: could not save moods to Firestore: {e}")

        # ── 8. Return ─────────────────────────────────────────
        send_json(self, {
            "moods":     moods,
            "reasoning": reasoning,
            "remaining": limit - count,
        })

    def log_message(self, format, *args):
        pass