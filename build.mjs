import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts", "src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  // LLM SDKs are optional peer dependencies — keep them as dynamic imports
  // so the CLI works without them unless --llm is explicitly used.
  external: ["@anthropic-ai/sdk", "@github/copilot-sdk"],
});

console.log("Build complete → dist/");
