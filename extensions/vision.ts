/**
 * Pi Vision Integration — local vision for text-only models.
 *
 * Registers a `describe_image` tool backed by a local MLX vision model
 * (LiquidAI LFM2.5-VL-3B-MLX-8bit) so the primary reasoning model can decide
 * when visual understanding is required. Also surfaces user-attached images to
 * the model by saving them to disk and injecting a note, since text-only
 * models cannot see base64 images.
 *
 * Install: `pi install <this directory>` (global) or `pi install git:...@tag`.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isAbsolute, join, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Package root: this file lives at <root>/extensions/vision.ts
const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const ATTACHMENTS_DIR = join(PROJECT_ROOT, ".pi", "attachments");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "describe_image",
    label: "Describe Image",
    description:
      "Analyze an image with a local vision model and return a text description. " +
      "Use when the user asks about the contents of an image (an attached image or an image at a path or URL).",
    promptSnippet: "Analyze an image and describe its contents",
    promptGuidelines: [
      "Use describe_image when the user's request requires seeing an attached image or an image at a known path/URL; the model itself cannot see images.",
    ],
    parameters: Type.Object({
      image: Type.String({ description: "Path or URL of the image to analyze (relative paths resolve against the working directory)" }),
      prompt: Type.Optional(Type.String({ description: "Question to ask about the image (default: describe it)" })),
      max_tokens: Type.Optional(Type.Integer({ description: "Maximum tokens to generate (default: 200)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      onUpdate?.({ content: [{ type: "text", text: "Running local vision model…" }] });

      // Resolve relative image paths against the user's working directory,
      // not the package root (the tool may be called from any project).
      const image =
        /^https?:\/\//i.test(params.image) || isAbsolute(params.image)
          ? params.image
          : join(ctx.cwd, params.image);

      const args = ["run", "vision.py", image];
      if (params.prompt) args.push("--prompt", params.prompt);
      if (params.max_tokens) args.push("--max-tokens", String(params.max_tokens));

      let result;
      try {
        result = await pi.exec("uv", args, { cwd: PROJECT_ROOT, signal, timeout: 180_000 });
      } catch (err) {
        return {
          content: [{ type: "text", text: `describe_image failed to run: ${String(err)}` }],
          details: {},
        };
      }

      const output = result.stdout.trim();
      if (result.code !== 0 || !output) {
        return {
          content: [
            { type: "text", text: `describe_image failed (exit ${result.code}): ${result.stderr?.trim() || "no output"}` },
          ],
          details: {},
        };
      }
      return { content: [{ type: "text", text: output }], details: { exitCode: result.code } };
    },
  });

  // When the user attaches images, save them to disk and tell the model, so it
  // can decide to invoke describe_image. Skip when the active model sees images natively.
  pi.on("before_agent_start", async (event, ctx) => {
    if (!event.images?.length) return;
    if (ctx.model?.input?.includes("image")) return;

    const paths: string[] = [];
    for (const [i, img] of event.images.entries()) {
      const file = join(ATTACHMENTS_DIR, `image-${Date.now()}-${i}${MIME_TO_EXT[img.mimeType] ?? ".img"}`);
      mkdirSync(ATTACHMENTS_DIR, { recursive: true });
      writeFileSync(file, Buffer.from(img.data, "base64"));
      paths.push(file);
    }

    const list = paths.map((p) => `- ${p}`).join("\n");
    return {
      message: {
        customType: "vision-attachments",
        content:
          `The user attached ${paths.length} image(s) with this prompt. ` +
          `You cannot see the images directly; use the describe_image tool when the prompt requires visual understanding:\n${list}`,
        display: true,
      },
    };
  });
}
