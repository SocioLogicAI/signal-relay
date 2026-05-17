import { TOOL_DEFINITIONS } from "../src/tools.js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const VERSION = "2.0.0";
const MCP_URL = "https://mcp.sociologic.ai";
const HOMEPAGE = "https://sociologic.ai/signal-relay";
const REPO = "https://github.com/SocioLogicAI/signal-relay";

const toolSummaries = TOOL_DEFINITIONS.map((t) => ({
  name: t.name,
  description: t.description,
}));

const serverJson = {
  $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  name: "io.github.SocioLogicAI/signal-relay",
  description: "Connect AI agents to SocioLogic's synthetic persona platform for market research.",
  version: VERSION,
  author: { name: "SocioLogic", url: "https://sociologic.ai" },
  repository: { url: REPO, source: "github", id: "1137101872" },
  homepage: HOMEPAGE,
  license: "MIT",
  categories: ["market-research", "customer-intelligence", "sales"],
  tags: ["personas", "synthetic-users", "market-research", "interviews", "campaigns", "focus-groups", "rng", "x402"],
  packages: [
    {
      registryType: "npm",
      identifier: "signal-relay-mcp",
      version: VERSION,
      runtime: "node",
      transport: { type: "streamable-http", url: MCP_URL },
    },
  ],
  remotes: [
    {
      type: "streamable-http",
      url: MCP_URL,
      headers: [
        { name: "X-API-Key", isRequired: true, isSecret: true, description: "Your SocioLogic API key" },
      ],
    },
  ],
  tools: toolSummaries,
};

writeFileSync(resolve(ROOT, "server.json"), JSON.stringify(serverJson, null, 2) + "\n");
console.log(`server.json written with ${toolSummaries.length} tools`);

const smitheryTools = toolSummaries.map((t) => `  - name: ${t.name}\n    description: ${t.description}`).join("\n\n");

const smitheryYaml = `# Smithery Registry Configuration
# https://smithery.ai/docs/publishing

name: signal-relay-mcp
title: "Signal Relay - Revenue Intelligence for AI Agents"
description: |
  Connect any MCP-compatible AI agent to SocioLogic's synthetic persona platform.
  Interview realistic customer personas, run multi-persona research campaigns,
  and export board-ready reports—all through natural conversation.

  Features:
  - ${toolSummaries.length} MCP tools for personas, campaigns, focus groups, web research, RNG, and payments
  - High-fidelity synthetic personas with consistent behavior
  - Semantic memory retrieval (RAG) for persona continuity
  - Edge-deployed on Cloudflare Workers (300+ locations, <50ms latency)

  Use cases:
  - Product teams validating features with synthetic buyers
  - Sales teams practicing objection handling
  - Marketing teams testing messaging resonance
  - AI agents conducting autonomous market research

author: SocioLogic
authorUrl: https://www.sociologic.ai
repository: ${REPO}
homepage: ${HOMEPAGE}
documentation: https://www.sociologic.ai/docs
icon: https://www.sociologic.ai/apple-touch-icon.png

license: MIT
version: ${VERSION}

configSchema:
  type: object
  properties:
    apiKey:
      type: string
      title: API Key
      description: "Your SocioLogic API key for authentication. Get one at https://sociologic.ai/dashboard/api-keys (100 free credits on signup)"
      x-from:
        header: X-API-Key
  required:
    - apiKey

server:
  transport: http
  url: ${MCP_URL}

auth:
  type: header
  header: X-API-Key
  description: "Get your API key at https://sociologic.ai/dashboard/api-keys (100 free credits on signup)"

categories:
  - market-research
  - personas
  - customer-intelligence
  - sales
  - product-management

tags:
  - personas
  - synthetic-users
  - market-research
  - customer-research
  - revenue-intelligence
  - interviews
  - campaigns
  - focus-groups
  - rng
  - x402

tools:
${smitheryTools}

examples:
  - prompt: "Create a persona for a mid-market SaaS CFO who is cost-conscious"
    description: Generate a new synthetic persona from a description

  - prompt: "Run a campaign asking 10 personas what would make them churn"
    description: Systematic multi-persona research on churn triggers

  - prompt: "Export the competitive audit campaign as a PDF"
    description: Get board-ready reports from completed research

pricing:
  model: usage-based
  free_tier: "100 credits on signup"
  details_url: https://sociologic.ai/pricing
`;

writeFileSync(resolve(ROOT, "smithery.yaml"), smitheryYaml);
console.log(`smithery.yaml written with ${toolSummaries.length} tools`);
