# pi-mlx-vision

Local vision for text-only models in pi — **for Apple Silicon Macs (MLX)**.

Registers a `describe_image` tool backed by a local vision language model so your main reasoning model can decide when it needs visual understanding — even if that model cannot see images itself (e.g. **DeepSeek V4 Flash**, or any text-only model).

**Vision model:** [LiquidAI LFM2.5-VL-3B-MLX-8bit](https://huggingface.co/LiquidAI/LFM2.5-VL-3B-MLX-8bit) — a 3B parameter VLM, MLX-quantized to 8-bit, running fully locally via [mlx-vlm](https://github.com/Blaizzy/mlx-vlm). Nothing leaves your machine.

## How it works

- **`describe_image` tool** — takes an image path or URL and an optional question; runs the local VLM and returns a text description.
- **Persistent inference server** — the model is loaded once per session and kept resident (`vision_server.py`, a minimal stdio protocol). Warm calls take ~0.3–1.3 s instead of re-loading the 3.5 GB model every time; parallel tool calls serialize on one model.
- **Attached images** — when you attach an image to a pi prompt, the extension saves it to `.pi/attachments/` and tells the model about it. The model then decides whether to call `describe_image`.
- The vision model is a passive responder: it only answers the specific question the main model asks. It never plans or decides anything.

## Requirements

- macOS on Apple Silicon (M1/M2/M3/M4/M5 — MLX only runs on Macs)
- [uv](https://docs.astral.sh/uv/) (`brew install uv`)
- ~3.5 GB free disk for the model (downloaded to the Hugging Face cache on first use)

## Install

```bash
# from the npm registry (listed on pi.dev/packages)
pi install npm:pi-mlx-vision@0.1.0

# or directly from git
pi install git:github.com/abdulchotu7/pi-mlx-vision@v0.1.0
```

First run downloads the model weights; after that each call takes a few seconds.

## Usage

In any pi session:

- Attach an image and ask a question about it, or
- Ask about an image at a path or URL, e.g. "What's in `~/Downloads/photo.png`?"

The model decides when to invoke `describe_image`; no special syntax needed. If your active model already supports images natively (e.g. Gemini, Claude), the extension stays out of the way.

## Overriding the model

The default vision model is `LiquidAI/LFM2.5-VL-3B-MLX-8bit`. Override with the `VISION_MODEL_ID` environment variable (must be an MLX-compatible VLM):

```bash
VISION_MODEL_ID=mlx-community/other-vlm-4bit uv run vision.py image.png
```

## Development

```bash
uv run vision.py path/to/image.png --prompt "What do you see?"   # one-shot CLI
uv run vision_server.py                                          # persistent stdio server (used by the extension)
```

`vision.py` and `vision_server.py` are thin wrappers over the reusable `VisionModel` interface in `vision_model.py`.
