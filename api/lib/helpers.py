import json
from http.server import BaseHTTPRequestHandler


def send_json(handler: BaseHTTPRequestHandler, data: dict, status: int = 200):
    """Send a JSON response."""
    body = json.dumps(data).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    _send_cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)


def send_error(handler: BaseHTTPRequestHandler, message: str, status: int = 400):
    """Send a JSON error response."""
    send_json(handler, {"error": message}, status)


def send_options(handler: BaseHTTPRequestHandler):
    """Handle CORS preflight OPTIONS request."""
    handler.send_response(204)
    _send_cors_headers(handler)
    handler.end_headers()


def _send_cors_headers(handler: BaseHTTPRequestHandler):
    """
    Add CORS headers so the React frontend can call these endpoints.
    In production, restrict origin to your Vercel domain.
    """
    handler.send_header("Access-Control-Allow-Origin",  "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")


def read_json_body(handler: BaseHTTPRequestHandler) -> dict:
    """Read and parse the JSON request body."""
    length = int(handler.headers.get("Content-Length", 0))
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def check_ai_opt_in(settings: dict) -> bool:
    """Returns True if the user has opted into AI features."""
    return settings.get("aiOptIn", False)