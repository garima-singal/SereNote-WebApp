# api/ai/reflect.py
# ─────────────────────────────────────────────────────────────
# POST /api/ai/reflect
# Generates a short AI reflection for a journal entry.
#
# Request body:
#   { "entryId": "abc123" }
#
# Response:
#   { "reflection": "..." }
#
# Flow:
#   1. Verify Firebase token
#   2. Check rate limit (20/day)
#   3. Check user has AI opted in
#   4. Fetch entry from Firestore
#   5. Call GPT-4o
#   6. Save reflection back to entry
#   7. Return reflection text
# ─────────────────────────────────────────────────────────────

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entry, get_user_settings, update_entry_fields
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in

SYSTEM_PROMPT = """You are a warm, thoughtful journaling companion. 
Your role is to offer a brief, personal reflection on what someone has written in their journal.

Guidelines:
- Be empathetic and non-judgmental
- Notice emotions, themes, and patterns in the writing
- Ask one gentle, open-ended question at the end to encourage deeper reflection
- Keep it to 3-4 sentences maximum
- Write in second person ("you", "your")
- Do NOT give advice unless explicitly asked
- Do NOT be overly positive or use hollow affirmations
- Sound like a thoughtful friend, not a therapist or chatbot
- If the entry is very short or lacks context, reflect on what little is there with curiosity"""


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
        allowed, count, limit = check_rate_limit(uid, "reflect")
        if not allowed:
            return send_error(
                self,
                f"Daily reflection limit reached ({limit}/day). Try again tomorrow.",
                429
            )

        # ── 3. Parse request body ─────────────────────────────
        try:
            body    = read_json_body(self)
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

        body_text = entry.get("bodyText", "").strip()
        title     = entry.get("title", "").strip()

        if not body_text and not title:
            return send_error(self, "Entry has no content to reflect on", 400)

        # ── 6. Build prompt ───────────────────────────────────
        moods = entry.get("moods", [])
        tags  = entry.get("tags",  [])

        user_prompt_parts = []
        if title:
            user_prompt_parts.append(f"Title: {title}")
        if moods:
            user_prompt_parts.append(f"Mood: {', '.join(moods)}")
        if tags:
            user_prompt_parts.append(f"Tags: {', '.join(tags)}")
        user_prompt_parts.append(f"\nEntry:\n{body_text[:3000]}")  # cap at 3000 chars

        user_prompt = "\n".join(user_prompt_parts)

        # ── 7. Call GPT-4o ────────────────────────────────────
        try:
            reflection = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=200,
                temperature=0.75,
            )
        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 8. Save to Firestore ──────────────────────────────
        try:
            update_entry_fields(uid, entry_id, {
                "aiReflection": reflection,
            })
        except Exception as e:
            # Don't fail the request if save fails — still return the reflection
            print(f"Warning: could not save reflection to Firestore: {e}")

        # ── 9. Return ─────────────────────────────────────────
        send_json(self, {
            "reflection": reflection,
            "remaining":  limit - count,
        })

    def log_message(self, format, *args):
        pass  # suppress default request logging