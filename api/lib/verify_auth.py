import os
import firebase_admin
from firebase_admin import auth, credentials

# Initialise Firebase Admin SDK once (module-level singleton)
# Vercel serverless functions can reuse this across warm invocations
_firebase_app = None

def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    # Build credentials from individual env vars
    # (safer than storing the entire JSON file)
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id":   os.environ["FIREBASE_ADMIN_PROJECT_ID"],
        "client_email": os.environ["FIREBASE_ADMIN_CLIENT_EMAIL"],
        "private_key":  os.environ["FIREBASE_ADMIN_PRIVATE_KEY"].replace("\\n", "\n"),
        "token_uri":    "https://oauth2.googleapis.com/token",
    })
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_token(authorization_header: str | None) -> str:
    """
    Takes the raw Authorization header value (e.g. "Bearer eyJ...")
    Returns the verified uid string.
    Raises ValueError with a human-readable message on any failure.
    """
    if not authorization_header:
        raise ValueError("Missing Authorization header")

    parts = authorization_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ValueError("Authorization header must be: Bearer <token>")

    id_token = parts[1]

    try:
        _get_firebase_app()
        decoded = auth.verify_id_token(id_token)
        return decoded["uid"]
    except firebase_admin.exceptions.FirebaseError as e:
        raise ValueError(f"Invalid or expired token: {e}")