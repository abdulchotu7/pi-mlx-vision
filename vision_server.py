"""Persistent stdio inference server for the local vision model (Milestone 3).

Keeps the model resident across requests so the pi extension avoids re-loading
it (and re-importing mlx_vlm) on every describe_image call. The extension
spawns this process on first use and feeds it requests over stdin.

Protocol (JSON lines):

  Request:  {"id": 1, "image": "path-or-url", "prompt": "?", "max_tokens": 200, "temperature": 0.2}
  Response: {"id": 1, "text": "..."}          or         {"id": 1, "error": "..."}
  Startup:  {"event": "ready"}   (written once, after the model is loaded)

Requests are processed sequentially (one model). The server exits when stdin
closes (EOF), so it dies automatically if the parent process goes away.

Usage:
    uv run vision_server.py
"""

from __future__ import annotations

import json
import sys

from vision_model import DEFAULT_PROMPT, VisionModel


def main() -> int:
    try:
        model = VisionModel()
        model.warm()
    except Exception as exc:
        print(json.dumps({"event": "error", "error": f"model load failed: {exc}"}), flush=True)
        return 1

    print(json.dumps({"event": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        try:
            text = model.describe(
                req["image"],
                req.get("prompt", DEFAULT_PROMPT),
                max_tokens=int(req.get("max_tokens", 200)),
                temperature=float(req.get("temperature", 0.2)),
            )
            print(json.dumps({"id": req_id, "text": text}), flush=True)
        except Exception as exc:
            print(json.dumps({"id": req_id, "error": str(exc)}), flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
