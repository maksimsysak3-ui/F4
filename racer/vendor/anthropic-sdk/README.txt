The official Anthropic TypeScript SDK (@anthropic-ai/sdk 1.8.0), bundled into one browser ES module with esbuild:
  esbuild entry.mjs --bundle --format=esm --platform=browser --minify
where entry.mjs is: export { default } from "@anthropic-ai/sdk";
Loaded on demand by src/engineer.js (only when the race engineer is asked something with an API key set).
