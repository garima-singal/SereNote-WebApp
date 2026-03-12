from firebase_admin import firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP


def get_db():
    """Returns the Firestore client. Safe to call multiple times."""
    return firestore.client()


# ── ENTRIES ───────────────────────────────────────────────────

def get_entry(uid: str, entry_id: str) -> dict | None:
    """Fetch a single entry document. Returns dict or None."""
    db = get_db()
    doc = db.collection("users").document(uid)\
            .collection("entries").document(entry_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def get_entries(uid: str, limit: int = 30) -> list[dict]:
    """
    Fetch the most recent N entries for a user.
    Filters out soft-deleted entries in Python (avoids composite index).
    Returns list of dicts sorted newest first.
    """
    db = get_db()
    docs = db.collection("users").document(uid)\
             .collection("entries")\
             .order_by("createdAt", direction="DESCENDING")\
             .limit(limit + 10)\
             .stream()

    entries = []
    for doc in docs:
        data = doc.to_dict()
        if data.get("isDeleted", False):
            continue
        data["id"] = doc.id
        entries.append(data)
        if len(entries) >= limit:
            break

    return entries


def get_entries_for_week(uid: str, week_start, week_end) -> list[dict]:
    """Fetch entries within a date range (for weekly summary)."""
    db = get_db()
    docs = db.collection("users").document(uid)\
             .collection("entries")\
             .where("createdAt", ">=", week_start)\
             .where("createdAt", "<=", week_end)\
             .order_by("createdAt", direction="DESCENDING")\
             .stream()

    entries = []
    for doc in docs:
        data = doc.to_dict()
        if not data.get("isDeleted", False):
            data["id"] = doc.id
            entries.append(data)

    return entries


def update_entry_fields(uid: str, entry_id: str, fields: dict):
    """
    Update specific fields on an entry document.
    Always sets updatedAt to server timestamp.
    """
    db = get_db()
    fields["updatedAt"] = SERVER_TIMESTAMP
    db.collection("users").document(uid)\
      .collection("entries").document(entry_id)\
      .update(fields)


# ── USER ──────────────────────────────────────────────────────

def get_user_settings(uid: str) -> dict:
    """Fetch user settings. Returns empty dict if not found."""
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return {}
    data = doc.to_dict()
    return data.get("settings", {})


def get_user_profile(uid: str) -> dict | None:
    """Fetch the full user profile document."""
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["uid"] = doc.id
    return data


# ── WEEKLY SUMMARIES ──────────────────────────────────────────

def save_weekly_summary(uid: str, week_of: str, summary: str, entry_count: int):
    """
    Save an AI-generated weekly summary.
    week_of is a date string like "2026-03-10" (Monday of that week).
    """
    db = get_db()
    db.collection("users").document(uid)\
      .collection("weeklySummaries").document(week_of)\
      .set({
          "summary":    summary,
          "entryCount": entry_count,
          "weekOf":     week_of,
          "createdAt":  SERVER_TIMESTAMP,
      })


def get_weekly_summary(uid: str, week_of: str) -> dict | None:
    """Fetch a weekly summary by week_of date string."""
    db = get_db()
    doc = db.collection("users").document(uid)\
            .collection("weeklySummaries").document(week_of).get()
    if not doc.exists:
        return None
    return doc.to_dict()