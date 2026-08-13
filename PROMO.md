# Promotion Brief — pi-mlx-vision

> Handoff for posting the project to X (Twitter) and Reddit. All facts verified as of 2026-08-13.

---

## 1. WHAT THIS IS (one-liner)

**pi-mlx-vision** — a pi extension that gives text-only AI coding models (like DeepSeek V4 Flash) local vision on Apple Silicon Macs, using an MLX vision model. No API keys. No cloud. No cost. Images never leave the machine.

## 2. LINKS

- npm package: https://www.npmjs.com/package/pi-mlx-vision (v0.2.1)
- GitHub (public): https://github.com/abdulchotu7/pi-mlx-vision
- Vision model: https://huggingface.co/LiquidAI/LFM2.5-VL-3B-MLX-8bit
- pi docs on packages: https://pi.dev/docs/latest/packages
- pi.dev catalog listing: **pending** — published to npm today, catalog crawler has not indexed it yet (check pi.dev/packages → search "pi-mlx-vision" before posting; if still absent, do not claim it's listed — say "published on npm")

## 3. INSTALL (for readers)

```bash
pi install npm:pi-mlx-vision
```

Requirements: macOS on Apple Silicon (M1–M5), [uv](https://docs.astral.sh/uv/) installed, ~3.5 GB free disk (model downloads to HF cache on first run).

## 4. HOW IT WORKS

1. Registers a `describe_image` tool in pi (image path/URL + optional question).
2. The main model (e.g. DeepSeek) decides when it needs to see an image and calls the tool — the vision model never decides anything itself.
3. Attached images are saved to `.pi/attachments/` and surfaced to the model automatically.
4. Backed by a persistent stdio server: the VLM is loaded once per session and stays resident.
5. If the active model already supports images natively (Gemini, Claude), the extension stays out of the way.

## 5. VERIFIED NUMBERS (all measured on MacBook Air M5, 16 GB)

| Metric | Value |
|---|---|
| Vision model | LiquidAI LFM2.5-VL-3B-MLX-8bit (3B params, 8-bit MLX) |
| Model size | ~3.5 GB download, ~2–3 GB RAM resident |
| Package size | ~93 kB (unpacked ~300 kB, 8 files) |
| Warm call (server resident) | **0.3–1.3 s** |
| Cold start (first call in session) | ~3–8 s (import + model load) |
| Before optimization (v0.1.0) | ~3.7 s per call, model reloaded every time |
| pi end-to-end, warm | ~3.2 s total (mostly DeepSeek API + thinking, not vision) |
| Parallel tool calls | serialized on one resident model (was: 2× model loads) |

## 6. THE STORY ARC (3 milestones, built in one day)

1. **M1 — Validate:** standalone CLI (`uv run vision.py img.png --prompt "..."`), verified LFM2.5-VL runs on Apple Silicon via mlx-vlm.
2. **M2 — Integrate:** reusable `VisionModel` interface + pi extension with `describe_image` tool; DeepSeek decides when to invoke it; attached images handled.
3. **M3 — Optimize:** measured the flow (85% of latency was fixed startup: import + model reload per call), built a persistent stdio server → warm calls 0.3–1.3 s, parallel-safe, no orphan processes.

## 7. PROOF / DOGFOODING (good stories)

- The author's own pi session (DeepSeek) used describe_image to read a benchmark chart screenshot, a 2FA screenshot from iCloud Keychain, and test photos — correctly answered every time.
- A 3B model on a 16 GB Air M5 is fast enough for real interactive use.
- The tool reads 2FA codes / charts / UI mockups that text-only models would otherwise silently drop.

## 8. HONEST POSITIONING (important — do NOT claim first-mover)

Research found ~13 existing pi packages for "vision for text-only models". Most delegate to remote APIs (Gemini, Qwen VL, Grok, Codex CLI) — paid, keys required, images leave the machine. Ours is one of only ~3 **fully local** options and the only one that is a **minimal single-purpose describe_image tuned for budget Macs (16 GB)**.

Safe claims:
- "Fully local — no API keys, no cloud, no per-token cost, images never leave your Mac"
- "Runs on a base 16 GB MacBook Air"
- "Sub-second warm calls via persistent server"

Unsafe claims (avoid): "the first", "the only vision extension for pi", "best" (unbenchmarked).

## 9. X / TWITTER POST (thread draft)

Post 1 (hook):
> Your reasoning model is blind. DeepSeek V4 Flash is great at coding but can't see images. I gave it local eyes.
> pi-mlx-vision: a pi extension running LiquidAI LFM2.5-VL-3B-MLX-8bit fully locally on Apple Silicon via MLX.
> No API keys. No cloud. No cost. 🧵

Post 2 (how):
> When you attach an image or reference a path/URL, DeepSeek decides when to call the describe_image tool — the VLM only answers the specific question asked. Attached images are surfaced automatically; the tool stays out of the way on native-vision models.

Post 3 (numbers):
> Built a persistent stdio server so the model loads once per session:
> • warm calls: 0.3–1.3 s (was ~3.7 s reloading a 3.5 GB model every call)
> • runs on a 16 GB MacBook Air M5
> • parallel tool calls serialize on one resident model

Post 4 (install + close):
> Install: `pi install npm:pi-mlx-vision`
> Works with any text-only model in pi. Fully local — nothing leaves your Mac.
> 📦 https://www.npmjs.com/package/pi-mlx-vision
> ⭐ https://github.com/abdulchotu7/pi-mlx-vision

Tags/hashtags: #MLX #AppleSilicon #DeepSeek #LocalAI #VLM #pi #AppleIntelligence(no — skip) — use: #MLX #AppleSilicon #DeepSeek #LocalAI #VLM #MachineLearning #macOS

## 10. REDDIT POST (draft for r/LocalLLaMA — best fit)

Title options:
- "Gave my text-only DeepSeek-based coding agent local vision with a 3B MLX model (no API, no cloud)"
- "pi-mlx-vision: fully local vision for text-only coding agents — 3B MLX VLM, sub-second warm calls, runs on 16GB Mac"

Body:
> I run DeepSeek V4 Flash in pi (a coding agent), which is text-only — pasting a screenshot, chart, or 2FA code gets silently dropped. I built a small extension that adds a describe_image tool backed by LiquidAI LFM2.5-VL-3B-MLX-8bit, running fully locally via MLX.
>
> Design: the main model decides when to invoke vision (it asks the VLM only the specific question it needs answered). A persistent stdio server keeps the model resident — warm calls are 0.3–1.3 s, and parallel tool calls serialize on one model. First call in a session pays ~3–8 s load.
>
> It's one of the few fully local options in this niche (most pi vision extensions proxy to Gemini/Qwen/Grok APIs). Runs on a 16 GB MacBook Air M5, model is ~3.5 GB.
>
> ```bash
> pi install npm:pi-mlx-vision
> ```
>
> GitHub: https://github.com/abdulchotu7/pi-mlx-vision
> Happy to answer questions — and suggestions for faster models (Qwen3-VL 4B? Moondream?) are welcome.

Subreddit etiquette:
- r/LocalLLaMA: primary (MLX + local models audience). Flair like "Discussion"/"Resource" if required.
- r/deepseek: good alt (DeepSeek-adjacent), if it accepts tooling posts.
- r/AppleSilicon / r/macapps: shorter variant, MLX angle.
- Do NOT post to r/machinelearning (research-only) or r/programming (self-promo heavy).

## 11. GENERAL TIPS FOR HERMES

- Keep X thread ≤ 4 posts; Reddit body ≤ ~200 words with a clear TL;DR.
- Put the "fully local / no cost / privacy" angle first — it's the differentiator.
- Include the verified numbers (section 5) but don't overload.
- Reply-to comments with the install line and GitHub link.
- If pi.dev catalog still hasn't indexed it when posting, say "published on npm" — not "on the official catalog".
- Mention it was built/validated in a single day (3 milestones) as a compelling meta-story, but keep it brief.
- One screenshot for Reddit helps: e.g. terminal showing describe_image answering. (Can be generated from `pi` output.)
