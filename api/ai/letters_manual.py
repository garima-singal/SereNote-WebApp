import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth import verify_token
from lib.firestore   import save_letter
from lib.helpers     import send_json, send_error, send_options, read_json_body


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_POST(self):
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        try:
            body       = read_json_body(self)
            letter     = body.get("letter", "").strip()
            deliver_at = body.get("deliverAt", "").strip()

            if not letter:
                return send_error(self, "letter is required", 400)
            if not deliver_at:
                return send_error(self, "deliverAt is required", 400)
        except Exception:
            return send_error(self, "Invalid request body", 400)

        try:
            letter_id = save_letter(uid, letter, deliver_at, 0, "")
            send_json(self, {"letterId": letter_id, "deliverAt": deliver_at})
        except Exception as e:
            send_error(self, f"Failed to save: {str(e)}", 500)

    def log_message(self, format, *args):
        pass