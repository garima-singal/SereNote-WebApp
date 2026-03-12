import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entries, get_user_settings
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, check_ai_opt_in

SYSTEM_PROMPT = """You are a thoughtful journaling coach who creates deeply personal
writing prompts based on what someone has recently been experiencing.

Your job is to read summaries of a person's recent journal entries and craft
one meaningful writing prompt that connects to their actual life right now.

Rules:
- Make the prompt specific to themes, emotions, or situations from their recent entries
- Do NOT reference the entries directly or say "you mentioned..."
- The prompt should feel like a natural next step in their self-reflection journey
- Keep it to one clear, open-ended question or gentle directive
- Make it warm, curious, and inviting — not clinical or therapeutic
- If entries are in Hinglish or Hindi, write the prompt in the same language mix
- Do NOT give generic prompts like "What are you grateful for today?"

Response format (JSON only):
{
  "prompt": "The writing prompt here",
  "theme": "2-3 word theme label e.g. 'work-life balance' or 'self-doubt'"
}"""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_GET(self):
        # ── 1. Verify auth ────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── 2. Rate limit ─────────────────────────────────────
        allowed, count, limit = check_rate_limit(uid, "prompt")
        if not allowed:
            return send_error(self, f"Daily prompt limit reached ({limit}/day).", 429)

        # ── 3. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled.", 403)

        # ── 4. Fetch last 5 entries ───────────────────────────
        entries = get_entries(uid, limit=5)

        if not entries:
            # No entries yet — return a good starter prompt
            return send_json(self, {
                "prompt": "What's been on your mind lately that you haven't had a chance to sit with?",
                "theme":  "getting started",
            })

        # ── 5. Build context from entries ─────────────────────
        # Send only title + first 200 chars of bodyText per entry
        # to keep token usage low
        entry_summaries = []
        for i, entry in enumerate(entries[:5], 1):
            title     = entry.get("title", "").strip()
            body_text = entry.get("bodyText", "").strip()[:200]
            moods     = entry.get("moods", [])
            summary   = f"Entry {i}:"
            if title:
                summary += f" '{title}'"
            if moods:
                summary += f" (mood: {', '.join(moods)})"
            if body_text:
                summary += f"\n{body_text}"
            entry_summaries.append(summary)

        context = "\n\n".join(entry_summaries)

        # ── 6. Call GPT-4o-mini ───────────────────────────────
        try:
            response_text = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=(
                    f"Here are this person's recent journal entries:\n\n"
                    f"{context}\n\n"
                    f"Generate a personalized writing prompt for them."
                ),
                max_tokens=150,
                temperature=0.8,  # slightly creative for varied prompts
                json_mode=True,
            )

            result = json.loads(response_text)
            prompt = result.get("prompt", "").strip()
            theme  = result.get("theme", "").strip()

            if not prompt:
                raise ValueError("Empty prompt returned")

        except Exception as e:
            # Fallback to a decent generic prompt on any error
            return send_json(self, {
                "prompt": "What's one thing from this week that deserves more of your attention?",
                "theme":  "reflection",
            })

        # ── 7. Return ─────────────────────────────────────────
        send_json(self, {
            "prompt":    prompt,
            "theme":     theme,
            "remaining": limit - count,
        })

    def log_message(self, format, *args):
        pass