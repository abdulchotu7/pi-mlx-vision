/**
 * Pi Vision Integration — local vision for text-only models.
 *
 * Registers a `describe_image` tool backed by a local MLX vision model
 * (LiquidAI LFM2.5-VL-3B-MLX-8bit) so the primary reasoning model can decide
 * when visual understanding is required. Also surfaces user-attached images to
 * the model by saving them to disk and injecting a note, since text-only
 * models cannot see base64 images.
 *
 * The tool talks to a persistent stdio server (vision_server.py): the model is
 * loaded once per session and reused across calls, instead of re-loading the
 * 3.5 GB model on every invocation. The server exits when pi closes its stdin.
 *
 * Install: `pi install npm:pi-mlx-vision@0.1.0` (or git:...@tag).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { isAbsolute, join, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Package root: this file lives at <root>/extensions/vision.ts
const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const ATTACHMENTS_DIR = join(PROJECT_ROOT, ".pi", "attachments");
const REQUEST_TIMEOUT_MS = 180_000;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

interface PendingRequest {
  resolve: (result: { text?: string; error?: string }) => void;
  timer: NodeJS.Timeout;
}

let server: ChildProcess | null = null;
let serverReady: Promise<void> | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function startServer(pi: ExtensionAPI): Promise<void> {
  if (serverReady) return serverReady;

  serverReady = new Promise<void>((resolveReady, rejectReady) => {
    const child = spawn("uv", ["run", "vision_server.py"], {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    server = child;

    const onExit = () => {
      // Server died: fail any in-flight requests, allow restart on next call.
      for (const [, req] of pending) {
        clearTimeout(req.timer);
        req.resolve({ error: "vision server exited unexpectedly" });
      }
      pending.clear();
      server = null;
      serverReady = null;
      rejectReady(new Error("vision server exited before ready"));
    };
    child.on("exit", onExit);
    child.stderr?.on("data", () => {}); // swallow tqdm/huggingface progress noise

    const rl = createInterface({ input: child.stdout! });
    rl.on("line", (line) => {
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if (msg.event === "ready") {
        resolveReady();
        return;
      }
      if (typeof msg.id === "number") {
        const req = pending.get(msg.id);
        if (req) {
          clearTimeout(req.timer);
          pending.delete(msg.id);
          req.resolve(msg.error ? { error: msg.error } : { text: msg.text });
        }
      }
    });
    child.on("error", (err) => {
      // e.g. uv not found — fail ready so the tool reports a clear error.
      rejectReady(new Error(`failed to start vision server: ${err.message}`));
    });
  });

  // If the server fails to start, clear state so the next call retries.
  serverReady.catch(() => {
    serverReady = null;
  });
  return serverReady;
}

async function describe(
  pi: ExtensionAPI,
  image: string,
  prompt?: string,
  maxTokens?: number,
): Promise<{ text?: string; error?: string }> {
  await startServer(pi); // loads model on first use; reuses it afterwards

  const id = nextRequestId++;
  const payload = { id, image, prompt, max_tokens: maxTokens };

  return new Promise<{ text?: string; error?: string }>((resolveReq, rejectReq) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolveReq({ error: `vision server timed out after ${REQUEST_TIMEOUT_MS / 1000}s` });
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve: resolveReq, timer });

    if (!server || !server.stdin?.writable) {
      clearTimeout(timer);
      pending.delete(id);
      resolveReq({ error: "vision server is not running" });
      return;
    }
    server.stdin.write(JSON.stringify(payload) + "\n");
  });
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "describe_image",
    label: "Describe Image",
    description:
      "Analyze an image with a local vision model (LiquidAI LFM2.5-VL-3B-MLX-8bit, runs on this Mac) and return a text description. " +
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

      const result = await describe(pi, image, params.prompt, params.max_tokens);
      if (result.error) {
        return {
          content: [{ type: "text", text: `describe_image failed: ${result.error}` }],
          details: {},
        };
      }
      return { content: [{ type: "text", text: result.text ?? "" }], details: {} };
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

  // Long-lived process lifecycle: the server dies on its own when pi closes
  // stdin, but kill explicitly on session teardown for prompt cleanup.
  pi.on("session_shutdown", () => {
    server?.kill();
    server = null;
    serverReady = null;
    pending.clear();
  });
}
