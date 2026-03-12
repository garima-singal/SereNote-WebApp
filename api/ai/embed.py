import sys
import os
from datetime import datetime, timezone
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth  import verify_token
from lib.firestore    import get_entry
from lib.vector_store import upsert_entry
from lib.helpers      import send_json, send_error, send_options, read_json_body


def _format_date(created_at) -> str:
    """Safely format a Firestore Timestamp or datetime to string."""
    if created_at is None:
        return ""
    try:
        if hasattr(created_at, 'timestamp'):
            dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
        elif isinstance(created_at, datetime):
            dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
        else:
            return ""
        return dt.strftime("%b %d, %Y")
    except Exception:
        return ""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_POST(self):
        # ── 1. Verify auth ────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── 2. Parse body ─────────────────────────────────────
        try:
            body     = read_json_body(self)
            entry_id = body.get("entryId")
            if not entry_id:
                return send_error(self, "entryId is required", 400)
        except Exception:
            return send_error(self, "Invalid JSON body", 400)

        # ── 3. Fetch entry from Firestore ─────────────────────
        entry = get_entry(uid, entry_id)
        if not entry:
            return send_error(self, "Entry not found", 404)

        # Skip deleted entries
        if entry.get("isDeleted", False):
            return send_json(self, {"success": True, "skipped": "deleted"})

        # ── 4. Build text to embed ────────────────────────────
        # Combine title + bodyText for richer semantic representation
        title     = entry.get("title", "").strip()
        body_text = entry.get("bodyText", "").strip()
        moods     = entry.get("moods", [])
        tags      = entry.get("tags", [])
        date_str  = _format_date(entry.get("createdAt"))

        # Build a rich text representation for better embeddings
        parts = []
        if title:
            parts.append(f"Title: {title}")
        if date_str:
            parts.append(f"Date: {date_str}")
        if moods:
            parts.append(f"Mood: {', '.join(moods)}")
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")
        if body_text:
            parts.append(f"\n{body_text}")

        embed_text = "\n".join(parts)

        if not embed_text.strip() or len(embed_text.strip()) < 5:
            return send_json(self, {"success": True, "skipped": "too_short"})

        # ── 5. Build metadata to store with vector ────────────
        metadata = {
            "title":   title or "Untitled",
            "date":    date_str,
            "moods":   moods,
            "tags":    tags,
            "snippet": body_text[:300],   # for display in chat context
        }

        # ── 6. Upsert into Upstash Vector ─────────────────────
        try:
            upsert_entry(uid, entry_id, embed_text, metadata)
        except Exception as e:
            # Non-fatal — log and continue, chat will fall back to Firestore
            print(f"Warning: embed failed for {entry_id}: {e}")
            return send_error(self, f"Embedding failed: {str(e)}", 500)

        # ── 7. Return ─────────────────────────────────────────
        send_json(self, {"success": True, "entryId": entry_id})

    def log_message(self, format, *args):
        pass