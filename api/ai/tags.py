# api/ai/tags.py
# ─────────────────────────────────────────────────────────────
# POST /api/ai/tags
# Suggests relevant tags for a journal entry using GPT-4o-mini.
#
# Request body:
#   { "entryId": "abc123" }
#
# Response:
#   { "tags": ["work", "stress", "family"], "remaining": 25 }
# ─────────────────────────────────────────────────────────────

import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entry, get_user_settings
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in

SYSTEM_PROMPT = """You are a smart tagging assistant for a journaling app.
Your job is to suggest 2-5 short, relevant tags for a journal entry.

Rules:
- Tags must be lowercase, single words or short hyphenated phrases (e.g. "work", "self-care")
- Suggest tags that are genuinely useful for finding this entry later
- Focus on: topics, themes, people, places, emotions, activities
- Do NOT suggest overly generic tags like "journal", "entry", "writing", "thoughts"
- Do NOT suggest mood words (those are handled separately)
- Tags should be specific enough to be useful but general enough to reuse
- Return 2-5 tags maximum
- Return ONLY a JSON object, no extra text

Examples of good tags: work, family, health, travel, fitness, money, relationships,
  morning-routine, gratitude, anxiety, career, friends, weekend, project-name

Response format:
{
  "tags": ["tag1", "tag2", "tag3"]
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

        # ── 2. Rate limit (30/day) ────────────────────────────
        allowed, count, limit = check_rate_limit(uid, "tags")
        if not allowed:
            return send_error(self, f"Daily tag suggestion limit reached ({limit}/day).", 429)

        # ── 3. Parse body ─────────────────────────────────────
        try:
            body     = read_json_body(self)
            entry_id = body.get("entryId")
            if not entry_id:
                return send_error(self, "entryId is required", 400)
        except Exception:
            return send_error(self, "Invalid request body", 400)

        # ── 4. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled.", 403)

        # ── 5. Fetch entry ────────────────────────────────────
        entry = get_entry(uid, entry_id)
        if not entry:
            return send_error(self, "Entry not found", 404)

        title     = entry.get("title", "").strip()
        body_text = entry.get("bodyText", "").strip()
        existing  = entry.get("tags", [])

        if not body_text and not title:
            return send_error(self, "Entry has no content to analyse", 400)

        # ── 6. Call GPT-4o-mini ───────────────────────────────
        user_prompt = f"Journal entry title: {title}\n\nContent:\n{body_text[:1500]}"
        if existing:
            user_prompt += f"\n\nAlready has these tags (don't repeat): {', '.join(existing)}"

        try:
            response_text = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=100,
                temperature=0.3,
                json_mode=True,
            )

            result   = json.loads(response_text)
            tags     = result.get("tags", [])

            # Clean and validate
            tags = [
                t.lower().strip().replace(' ', '-')
                for t in tags
                if isinstance(t, str) and t.strip()
            ]
            # Remove duplicates with existing tags
            tags = [t for t in tags if t not in existing][:5]

        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 7. Return ─────────────────────────────────────────
        send_json(self, {
            "tags":      tags,
            "remaining": limit - count,
        })

    def log_message(self, format, *args):
        pass