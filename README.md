# pi-local-vision

Local vision for text-only models in pi. Registers a `describe_image` tool backed by a local MLX vision model so the main reasoning model (e.g. DeepSeek) can decide when it needs visual understanding — it cannot see images itself.

## How it works

- **`describe_image` tool** — takes an image path or URL and an optional question; runs the local VLM and returns a text description.
- **Attached images** — when you attach an image to a pi prompt, the extension saves it to `.pi/attachments/` and tells the model about it. The model then decides whether to call `describe_image`.
- The vision model is a passive responder: it only answers the specific question the main model asks. It never plans or decides anything.

## Requirements

- macOS with Apple Silicon (MLX)
- [uv](https://docs.astral.sh/uv/) (`brew install uv`)
- ~3.5 GB free disk for the model (downloaded to the Hugging Face cache on first use)

The model is [LiquidAI/LFM2.5-VL-3B-MLX-8bit](https://huggingface.co/LiquidAI/LFM2.5-VL-3B-MLX-8bit). Override with the `VISION_MODEL_ID` environment variable (model must be MLX-compatible).

## Install

```bash
# from a local checkout
pi install /path/to/pi-local-vision

# or from git
pi install git:github.com/abdulchotu7/pi-local-vision@v0.1.0

# or via npm (once published)
pi install npm:pi-local-vision@0.1.0
```

First run downloads the model weights; after that each call takes a few seconds.

## Usage

In any pi session:

- Attach an image and ask a question about it, or
- Ask about an image at a path or URL, e.g. "What's in `~/Downloads/photo.png`?"

The model decides when to invoke `describe_image`; no special syntax needed. If your active model already supports images natively (e.g. Gemini, Claude), the extension stays out of the way.

## Development

```bash
uv run vision.py path/to/image.png --prompt "What do you see?"
```

`vision.py` is a thin CLI over the reusable `VisionModel` interface in `vision_model.py`.
