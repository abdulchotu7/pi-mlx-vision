# AGENTS.md

# Project

Pi Vision Integration

## Goal

This repository is for experimenting with integrating a local Vision Language Model (VLM) into Pi.

The long-term objective is to augment the existing DeepSeek V4 Flash reasoning model with local vision capabilities.

DeepSeek remains the primary reasoning model.

A local vision model should be invoked only when visual understanding is required.

Current vision model:

- LiquidAI LFM2.5-VL-3B-MLX-8bit
- https://huggingface.co/LiquidAI/LFM2.5-VL-3B-MLX-8bit

The project is being developed on an Apple Silicon Mac (M5 Air) using MLX.

---

## Current Scope

This repository is in the prototype phase.

We are currently implementing Milestone 2: exposing the validated vision model behind a reusable interface and integrating it into Pi as a callable capability.

Avoid building unnecessary abstractions or production infrastructure.

---

## Milestone 1 (COMPLETE)

Standalone script that:

- loads the LFM2.5-VL model
- accepts an image
- accepts a text prompt
- performs inference
- prints the generated response

Status: complete and validated on the M5 Air (local file and URL inputs).

Deliverable: `vision.py` (CLI entry point).

---

## Milestone 2 (ACTIVE)

- expose the vision model behind a reusable interface
- integrate it into Pi as a callable capability
- allow DeepSeek to decide when vision should be invoked

Plan:

- `vision_model.py` — reusable `VisionModel` interface (lazy model load, `describe(image, prompt)`)
- `vision.py` — thin CLI wrapper over `VisionModel`
- `.pi/extensions/vision.ts` — Pi extension registering a `describe_image` tool that runs the local model
- attached images are saved to `.pi/attachments/` and surfaced to DeepSeek, which decides whether to invoke `describe_image`

DeepSeek remains responsible for planning and generating the final response.

The vision model only provides visual understanding.

---

## Tech Stack

- Python
- uv
- mlx-vlm

---

## Development Principles

- Keep implementations simple.
- Prefer readable code over abstractions.
- Build incrementally.
- Do not introduce frameworks unless necessary.
- Avoid premature optimization.
- Keep files small and modular.

---

## Coding Standards

- Use Python type hints.
- Write clear function and variable names.
- Handle errors gracefully.
- Avoid duplicate code.
- Document non-obvious logic.

---

## Decision Making

When multiple implementations are possible:

1. Choose the simplest solution.
2. Minimize dependencies.
3. Prefer MLX-native APIs over custom implementations.
4. Verify functionality before optimizing.

---

## Out of Scope

Until Milestone 2 is complete, do not implement:

- memory systems
- RAG
- web search
- production APIs
- UI
- benchmarking infrastructure
- agentic behavior in the vision model (it remains a passive image-to-text responder; DeepSeek does the reasoning and tool orchestration)

Stay focused on the local vision capability inside Pi.