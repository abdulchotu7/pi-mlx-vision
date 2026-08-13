"""Reusable interface over the local LFM2.5-VL vision model (Milestone 2).

Usage:
    from vision_model import VisionModel

    model = VisionModel()
    description = model.describe("path/to/image.png", "What do you see?")
"""

from __future__ import annotations

import os

from mlx_vlm import apply_chat_template, generate, load
from mlx_vlm.utils import load_image

MODEL_ID = "LiquidAI/LFM2.5-VL-3B-MLX-8bit"

DEFAULT_PROMPT = "Describe this image in detail."


class VisionModel:
    """Minimal interface for running local vision inference.

    The model is loaded lazily on the first call so importing this class
    (or constructing a VisionModel) is cheap.
    """

    def __init__(self, model_id: str | None = None) -> None:
        """`model_id` defaults to the env var VISION_MODEL_ID, then to the default model."""
        self._model_id = model_id or os.environ.get("VISION_MODEL_ID") or MODEL_ID
        self._model = None
        self._processor = None

    def _ensure_loaded(self) -> None:
        if self._model is None:
            self._model, self._processor = load(self._model_id)

    def describe(
        self,
        image: str,
        prompt: str = DEFAULT_PROMPT,
        *,
        max_tokens: int = 200,
        temperature: float = 0.2,
    ) -> str:
        """Analyze `image` (a local path or http(s) URL) and return the model's response."""
        self._ensure_loaded()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": prompt},
                ],
            }
        ]

        prompt_text = apply_chat_template(
            self._processor,
            self._model.config,
            messages,
            add_generation_prompt=True,
            num_images=1,
        )

        result = generate(
            self._model,
            self._processor,
            prompt_text,
            [load_image(image)],
            max_tokens=max_tokens,
            temp=temperature,
            repetition_penalty=1.0,
        )
        return result.text
