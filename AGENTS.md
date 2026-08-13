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

Milestone 1 (CLI) and Milestone 2 (Pi integration) are complete; the package is published on npm and GitHub. Milestone 3 (persistent inference server) is complete.

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

## Milestone 2 (COMPLETE)

- expose the vision model behind a reusable interface
- integrate it into Pi as a callable capability
- allow DeepSeek to decide when vision should be invoked

Deliverables:

- `vision_model.py` — reusable `VisionModel` interface (lazy model load, `describe(image, prompt)`)
- `vision.py` — thin CLI wrapper over `VisionModel`
- `extensions/vision.ts` — Pi extension registering a `describe_image` tool that runs the local model
- attached images are saved to `.pi/attachments/` and surfaced to DeepSeek, which decides whether to invoke `describe_image`

Status: published as `pi-mlx-vision` on npm (pi.dev catalog) and GitHub.

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

## Milestone 3 (COMPLETE)

Infrastructure optimization of the inference path.

Problem: each `describe_image` call spawned a fresh process that re-imported mlx_vlm and re-loaded the 3.5 GB model (~3 s of fixed startup per call); parallel tool calls meant two concurrent model loads.

Solution: a persistent stdio server (`vision_server.py`) that keeps the model resident for the session. The extension spawns it on first use, serializes requests by id, and kills it on session shutdown.

Measured: warm calls 0.3-1.3 s (was ~3.7 s); pi end-to-end cold 8.2 s -> warm 3.2 s; no orphan processes (server exits on stdin EOF).

DeepSeek remains responsible for planning and generating the final response.

The vision model only provides visual understanding.

---

## Out of Scope

Do not implement:

- memory systems
- RAG
- web search
- production APIs
- UI
- benchmarking infrastructure
- agentic behavior in the vision model (it remains a passive image-to-text responder; DeepSeek does the reasoning and tool orchestration)

Stay focused on the local vision capability inside Pi.