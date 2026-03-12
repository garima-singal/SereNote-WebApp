import os
import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        checks = {
            "openai_key":       bool(os.environ.get("OPENAI_API_KEY")),
            "upstash_url":      bool(os.environ.get("UPSTASH_REDIS_REST_URL")),
            "upstash_token":    bool(os.environ.get("UPSTASH_REDIS_REST_TOKEN")),
            "firebase_project": bool(os.environ.get("FIREBASE_ADMIN_PROJECT_ID")),
            "firebase_email":   bool(os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")),
            "firebase_key":     bool(os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY")),
        }

        all_ok = all(checks.values())
        status = 200 if all_ok else 500

        body = json.dumps({
            "status":  "ok" if all_ok else "missing env vars",
            "checks":  checks,
        }).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()