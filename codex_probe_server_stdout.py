from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import time


def write_log(record):
    print("REQUEST " + json.dumps(record, ensure_ascii=False), flush=True)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _read_json(self):
        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length) if length else b""
        try:
            return json.loads(raw.decode("utf-8")) if raw else None
        except Exception:
            return raw.decode("utf-8", errors="replace")

    def _send_json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_sse(self, events):
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.send_header("cache-control", "no-cache")
        self.send_header("connection", "close")
        self.end_headers()
        for event in events:
            self.wfile.write(("data: " + json.dumps(event) + "\n\n").encode("utf-8"))
            self.wfile.flush()
            time.sleep(0.02)
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    def do_GET(self):
        write_log({"method": "GET", "path": self.path, "headers": dict(self.headers)})
        if self.path.endswith("/models"):
            self._send_json(200, {"object": "list", "data": [{"id": "probe-model", "object": "model"}]})
        else:
            self._send_json(200, {"ok": True})

    def do_POST(self):
        body = self._read_json()
        write_log({"method": "POST", "path": self.path, "headers": dict(self.headers), "body": body})
        text = "Probe response from local fake server."
        if self.path.endswith("/responses"):
            if isinstance(body, dict) and body.get("stream"):
                self._send_sse([
                    {"type": "response.created", "response": {"id": "resp_probe_001", "object": "response", "status": "in_progress"}},
                    {"type": "response.output_item.added", "output_index": 0, "item": {"id": "msg_001", "type": "message", "status": "in_progress", "role": "assistant", "content": []}},
                    {"type": "response.content_part.added", "item_id": "msg_001", "output_index": 0, "content_index": 0, "part": {"type": "output_text", "text": ""}},
                    {"type": "response.output_text.delta", "item_id": "msg_001", "output_index": 0, "content_index": 0, "delta": text},
                    {"type": "response.output_text.done", "item_id": "msg_001", "output_index": 0, "content_index": 0, "text": text},
                    {"type": "response.content_part.done", "item_id": "msg_001", "output_index": 0, "content_index": 0, "part": {"type": "output_text", "text": text}},
                    {"type": "response.output_item.done", "output_index": 0, "item": {"id": "msg_001", "type": "message", "status": "completed", "role": "assistant", "content": [{"type": "output_text", "text": text}]}},
                    {"type": "response.completed", "response": {"id": "resp_probe_001", "object": "response", "status": "completed", "output": [{"id": "msg_001", "type": "message", "status": "completed", "role": "assistant", "content": [{"type": "output_text", "text": text}]}]}},
                ])
                return
            self._send_json(200, {"id": "resp_probe_001", "object": "response", "status": "completed", "output": [{"id": "msg_001", "type": "message", "status": "completed", "role": "assistant", "content": [{"type": "output_text", "text": text}]}]})
            return
        self._send_json(404, {"error": {"message": "unknown path", "path": self.path}})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    print("codex probe server listening on http://127.0.0.1:8765", flush=True)
    server.serve_forever()
