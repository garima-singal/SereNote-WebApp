# api/ai/chat.py
# ─────────────────────────────────────────────────────────────
# POST /api/ai/chat
# Multi-turn conversation with RAG — retrieves only the most
# relevant entries for each user message using Upstash Vector.
#
# Request body:
#   {
#     "messages": [
#       { "role": "user",      "content": "What stressed me lately?" },
#       { "role": "assistant", "content": "Based on your entries..." },
#       { "role": "user",      "content": "What about last week?" }
#     ]
#   }
#
# Response:
#   { "reply": "...", "entriesUsed": 5 }
# ─────────────────────────────────────────────────────────────

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entries, get_user_settings
from lib.vector_store  import query_similar
from lib.openai_client import chat_with_history
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in


def build_system_prompt(relevant_entries: list[dict]) -> str:
    """Build system prompt with only the most relevant entries injected."""

    entry_context_parts = []
    for entry in relevant_entries:
        title   = entry.get("title",   "Untitled").strip()
        date    = entry.get("date",    "").strip()
        moods   = entry.get("moods",   [])
        snippet = entry.get("snippet", "").strip()

        parts = [f"[{date}] {title}"]
        if moods:
            parts.append(f"Mood: {', '.join(moods)}")
        if snippet:
            parts.append(snippet)

        entry_context_parts.append("\n".join(parts))

    journal_context = "\n\n---\n\n".join(entry_context_parts) if entry_context_parts else "No relevant entries found."

    return f"""You are a warm, insightful journaling companion who has read this person's journal.
Your job is to have a meaningful conversation about their journal entries — helping them
reflect, understand patterns, and gain insight about their own life.

The following journal entries are the most relevant to the current conversation
(retrieved using semantic search from the full journal):

=== RELEVANT JOURNAL ENTRIES ===
{journal_context}
=== END OF ENTRIES ===

Guidelines:
- Answer based ONLY on what is written in the entries above
- Be warm, empathetic, and conversational — not clinical
- Reference specific dates or titles naturally when relevant
- If the answer isn't in the entries, say so honestly
- Keep responses to 2-4 sentences unless more detail is truly needed
- You can ask one gentle follow-up question if it adds value
- Do NOT give unsolicited advice — focus on reflection and insight
- Respond in the same language the person uses (English or Hinglish)"""


def fallback_entries(uid: str, query: str) -> list[dict]:
    """
    Fallback: if Upstash Vector is not set up or query fails,
    fetch recent entries from Firestore directly.
    """
    entries = get_entries(uid, limit=10)
    result  = []
    for entry in entries:
        title      = entry.get("title", "Untitled").strip()
        body_text  = entry.get("bodyText", "").strip()
        moods      = entry.get("moods", [])
        created_at = entry.get("createdAt")

        date_str = ""
        if created_at:
            try:
                from datetime import datetime, timezone
                if hasattr(created_at, 'timestamp'):
                    dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
                    date_str = dt.strftime("%b %d, %Y")
            except Exception:
                pass

        result.append({
            "title":   title,
            "date":    date_str,
            "moods":   moods,
            "snippet": body_text[:300],
        })
    return result


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
        allowed, count, limit = check_rate_limit(uid, "chat")
        if not allowed:
            return send_error(self, f"Daily chat limit reached ({limit} messages/day).", 429)

        # ── 3. Parse body ─────────────────────────────────────
        try:
            body     = read_json_body(self)
            messages = body.get("messages", [])
            if not messages:
                return send_error(self, "messages array is required", 400)
            for msg in messages:
                if msg.get("role") not in ("user", "assistant"):
                    return send_error(self, "Invalid message role", 400)
                if not msg.get("content", "").strip():
                    return send_error(self, "Message content cannot be empty", 400)
        except Exception:
            return send_error(self, "Invalid JSON body", 400)

        # ── 4. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled.", 403)

        # ── 5. RAG — retrieve relevant entries ────────────────
        # Use the last user message as the search query
        last_user_message = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"),
            ""
        )

        # Also include previous user messages for better context
        all_user_text = " ".join(
            m["content"] for m in messages[-4:] if m["role"] == "user"
        )

        try:
            relevant_entries = query_similar(uid, all_user_text, top_k=8)
            used_rag = True
        except Exception as e:
            print(f"RAG query failed, falling back to Firestore: {e}")
            relevant_entries = fallback_entries(uid, last_user_message)
            used_rag = False

        if not relevant_entries:
            # Try fallback if RAG returned nothing (entries not embedded yet)
            relevant_entries = fallback_entries(uid, last_user_message)
            used_rag = False

        if not relevant_entries:
            return send_error(self, "No journal entries found. Write some entries first!", 400)

        # ── 6. Build system prompt with relevant context ──────
        system_prompt = build_system_prompt(relevant_entries)

        # ── 7. Call GPT-4o-mini ───────────────────────────────
        try:
            recent_messages = messages[-10:]

            reply = chat_with_history(
                system_prompt=system_prompt,
                messages=recent_messages,
                max_tokens=400,
                temperature=0.7,
            )

            if not reply:
                raise ValueError("Empty reply returned")

        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 8. Return ─────────────────────────────────────────
        send_json(self, {
            "reply":       reply,
            "entriesUsed": len(relevant_entries),
            "usedRag":     used_rag,
            "remaining":   limit - count,
        })

    def log_message(self, format, *args):
        pass