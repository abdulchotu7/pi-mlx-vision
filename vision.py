"""CLI entry point for local vision inference (Milestone 1, thin wrapper over VisionModel).

Usage:
    uv run vision.py <image> [--prompt "question"] [--max-tokens 200]

`<image>` may be a local file path or an http(s) URL.
"""

from __future__ import annotations

import argparse
import sys

from vision_model import DEFAULT_PROMPT, VisionModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local vision inference with LFM2.5-VL")
    parser.add_argument("image", help="Path or URL of the image to analyze")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Text prompt (default: describe the image)")
    parser.add_argument("--max-tokens", type=int, default=200, help="Maximum tokens to generate (default: 200)")
    parser.add_argument("--temperature", type=float, default=0.2, help="Sampling temperature (default: 0.2)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        model = VisionModel()
        text = model.describe(
            args.image,
            args.prompt,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
        )
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
