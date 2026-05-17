/**
 * SocioLogic MCP Server - Cloudflare Workers Entry Point
 *
 * This is a remote MCP server that provides access to the SocioLogic
 * Revenue Intelligence Platform via the Model Context Protocol.
 *
 * Deploy to Cloudflare Workers for global edge deployment.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { SocioLogicClient } from "./api-client";
import {
  TOOL_DEFINITIONS,
  ListPersonasSchema,
  GetPersonaSchema,
  CreatePersonaSchema,
  GetPersonaMemoriesSchema,
  ListCampaignsSchema,
  GetCampaignSchema,
  CreateCampaignSchema,
  ExecuteCampaignSchema,
  ExportCampaignSchema,
  ListFocusGroupsSchema,
  GetFocusGroupSchema,
  CreateFocusGroupSchema,
  AddPersonasToFocusGroupSchema,
  // x402 payment schemas
  CreatePersonaWithPaymentSchema,
  GetX402DiscoverySchema,
  // Web research schemas (Firecrawl integration)
  SearchWebSchema,
  ResearchTopicSchema,
  // RNG schemas
  RngUuidSchema,
  RngRandomSchema,
  RngIntSchema,
  RngDiceSchema,
  RngCoinSchema,
  RngShuffleSchema,
  RngWeightedSchema,
} from "./tools";

const VERSION = "2.0.0";

// ============================================
// VALIDATION HELPER
// ============================================

/**
 * Safely parse input with Zod and return clean error messages.
 * Avoids exposing internal schema details in error responses.
 */
function safeParseArgs<T extends z.ZodSchema>(
  schema: T,
  args: unknown
): z.infer<T> {
  const result = schema.safeParse(args);

  if (!result.success) {
    // Create a clean error message without exposing schema internals
    const errors = result.error.errors.map((err) => {
      const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
      return `${path}${err.message}`;
    });

    throw new Error(`Invalid parameters: ${errors.join(", ")}`);
  }

  return result.data;
}

// ============================================
// TYPES
// ============================================

interface Env {
  SOCIOLOGIC_API_URL?: string;
  OAUTH_KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Error Codes
const MCP_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

// Maximum request body size (1MB - generous for JSON-RPC)
const MAX_REQUEST_SIZE = 1024 * 1024;

// ============================================
// MCP PROTOCOL HANDLER
// ============================================

class MCPHandler {
  private client: SocioLogicClient;

  constructor(apiUrl: string, apiKey: string) {
    this.client = new SocioLogicClient({ apiUrl, apiKey });
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case "initialize":
          return await this.handleInitialize(id);

        case "tools/list":
          return this.handleToolsList(id);

        case "tools/call":
          return this.handleToolsCall(id, params as { name: string; arguments: unknown });

        case "prompts/list":
          return this.handlePromptsList(id);

        case "resources/list":
          return this.handleResourcesList(id);

        case "ping":
          return { jsonrpc: "2.0", id, result: { pong: true } };

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: MCP_ERRORS.METHOD_NOT_FOUND,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      console.error("MCP handler error:", error);
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: MCP_ERRORS.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Internal error",
        },
      };
    }
  }

  private async handleInitialize(id: string | number): Promise<MCPResponse> {
    // Validate API key by making a lightweight call to check credits
    const validation = await this.client.getCreditsBalance();

    if (validation.error) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: MCP_ERRORS.INVALID_REQUEST,
          message: `API key validation failed: ${validation.error.message}`,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
        serverInfo: {
          name: "sociologic-mcp-server",
          version: VERSION,
          description: "SocioLogic Revenue Intelligence Platform - High-fidelity synthetic personas for market research",
        },
      },
    };
  }

  private handleToolsList(id: string | number): MCPResponse {
    const tools = TOOL_DEFINITIONS.map((tool) => {
      // Convert Zod schema to JSON Schema using the proper library
      const jsonSchema = zodToJsonSchema(tool.inputSchema, {
        target: "jsonSchema7",
        $refStrategy: "none",
      });

      return {
        name: tool.name,
        description: tool.description,
        inputSchema: jsonSchema,
        annotations: tool.annotations,
        ...((tool as any)._meta ? { _meta: (tool as any)._meta } : {}),
      };
    });

    return {
      jsonrpc: "2.0",
      id,
      result: { tools },
    };
  }

  private handlePromptsList(id: string | number): MCPResponse {
    const prompts = [
      {
        name: "run_research_campaign",
        description: "Run a multi-persona research campaign to gather diverse perspectives",
        arguments: [
          {
            name: "research_question",
            description: "The main research question you want to answer",
            required: true,
          },
          {
            name: "persona_count",
            description: "Number of personas to interview (default: 10)",
            required: false,
          },
        ],
      },
      {
        name: "competitive_analysis",
        description: "Get synthetic customer perspectives on competitive products",
        arguments: [
          {
            name: "product",
            description: "Your product or service name",
            required: true,
          },
          {
            name: "competitors",
            description: "Comma-separated list of competitor names",
            required: true,
          },
        ],
      },
    ];

    return {
      jsonrpc: "2.0",
      id,
      result: { prompts },
    };
  }

  private handleResourcesList(id: string | number): MCPResponse {
    const resources = [
      {
        uri: "sociologic://personas/marketplace",
        name: "Persona Marketplace",
        description: "Browse available synthetic personas in the SocioLogic marketplace",
        mimeType: "application/json",
      },
      {
        uri: "sociologic://campaigns/templates",
        name: "Campaign Templates",
        description: "Pre-built research campaign templates for common use cases",
        mimeType: "application/json",
      },
      {
        uri: "sociologic://account/credits",
        name: "Credits Balance",
        description: "Your current SocioLogic credits balance and usage",
        mimeType: "application/json",
      },
    ];

    return {
      jsonrpc: "2.0",
      id,
      result: { resources },
    };
  }

  private async handleToolsCall(
    id: string | number,
    params: { name: string; arguments: unknown }
  ): Promise<MCPResponse> {
    const { name, arguments: args } = params;

    try {
      const result = await this.executeTool(name, args);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: MCP_ERRORS.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Tool execution failed",
          data: { tool: name },
        },
      };
    }
  }

  private async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case "sociologic_list_personas": {
        const parsed = safeParseArgs(ListPersonasSchema, args);
        return this.client.listPersonas(parsed);
      }

      case "sociologic_get_persona": {
        const parsed = safeParseArgs(GetPersonaSchema, args);
        return this.client.getPersona(parsed.slug);
      }

      case "sociologic_create_persona": {
        const parsed = safeParseArgs(CreatePersonaWithPaymentSchema, args);
        // Extract x402 payment config if provided
        const x402Payment = parsed.x402_payment
          ? {
              payload: parsed.x402_payment.payload,
              scheme: parsed.x402_payment.scheme,
              network: parsed.x402_payment.network,
            }
          : undefined;
        return this.client.createPersona(
          {
            description: parsed.description,
            include_avatar: parsed.include_avatar,
          },
          x402Payment
        );
      }

      case "sociologic_get_persona_memories": {
        const parsed = safeParseArgs(GetPersonaMemoriesSchema, args);
        return this.client.getPersonaMemories(parsed.slug, {
          query: parsed.query,
          limit: parsed.limit,
        });
      }

      case "sociologic_list_campaigns": {
        const parsed = safeParseArgs(ListCampaignsSchema, args);
        return this.client.listCampaigns(parsed);
      }

      case "sociologic_get_campaign": {
        const parsed = safeParseArgs(GetCampaignSchema, args);
        return this.client.getCampaign(parsed.id);
      }

      case "sociologic_create_campaign": {
        const parsed = safeParseArgs(CreateCampaignSchema, args);
        return this.client.createCampaign(parsed);
      }

      case "sociologic_execute_campaign": {
        const parsed = safeParseArgs(ExecuteCampaignSchema, args);
        return this.client.executeCampaign(parsed.id);
      }

      case "sociologic_export_campaign": {
        const parsed = safeParseArgs(ExportCampaignSchema, args);
        return this.client.exportCampaign(parsed.id, parsed.format);
      }

      case "sociologic_list_focus_groups": {
        const parsed = safeParseArgs(ListFocusGroupsSchema, args);
        return this.client.listFocusGroups(parsed);
      }

      case "sociologic_get_focus_group": {
        const parsed = safeParseArgs(GetFocusGroupSchema, args);
        return this.client.getFocusGroup(parsed.id);
      }

      case "sociologic_create_focus_group": {
        const parsed = safeParseArgs(CreateFocusGroupSchema, args);
        return this.client.createFocusGroup(parsed);
      }

      case "sociologic_add_personas_to_focus_group": {
        const parsed = safeParseArgs(AddPersonasToFocusGroupSchema, args);
        return this.client.addPersonasToFocusGroup(
          parsed.focus_group_id,
          parsed.persona_ids
        );
      }

      case "sociologic_get_credits_balance": {
        return this.client.getCreditsBalance();
      }

      case "sociologic_get_x402_discovery": {
        return this.client.getX402Discovery();
      }

      // Web Research Tools (Firecrawl integration)
      case "sociologic_search_web": {
        const parsed = safeParseArgs(SearchWebSchema, args);
        return this.client.searchWeb({
          query: parsed.query,
          limit: parsed.limit,
        });
      }

      case "sociologic_research_topic": {
        const parsed = safeParseArgs(ResearchTopicSchema, args);
        return this.client.researchTopic({
          topic: parsed.topic,
          source_count: parsed.source_count,
        });
      }

      // RNG Tools (Cryptographic randomness)
      case "sociologic_rng_uuid": {
        safeParseArgs(RngUuidSchema, args);
        return this.client.rngUuid();
      }

      case "sociologic_rng_random": {
        safeParseArgs(RngRandomSchema, args);
        return this.client.rngRandom();
      }

      case "sociologic_rng_int": {
        const parsed = safeParseArgs(RngIntSchema, args);
        return this.client.rngInt({ min: parsed.min, max: parsed.max });
      }

      case "sociologic_rng_dice": {
        const parsed = safeParseArgs(RngDiceSchema, args);
        return this.client.rngDice({ sides: parsed.sides });
      }

      case "sociologic_rng_coin": {
        safeParseArgs(RngCoinSchema, args);
        return this.client.rngCoin();
      }

      case "sociologic_rng_shuffle": {
        const parsed = safeParseArgs(RngShuffleSchema, args);
        return this.client.rngShuffle({ items: parsed.items });
      }

      case "sociologic_rng_weighted": {
        const parsed = safeParseArgs(RngWeightedSchema, args);
        return this.client.rngWeighted({ items: parsed.items, weights: parsed.weights });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

// ============================================
// CORS UTILITY
// ============================================

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================
// AUTH RESOLVER
// ============================================

type AuthResult =
  | { ok: true; apiKey: string }
  | { ok: false; reason: "no_auth" | "invalid_bearer" };

async function resolveMcpAuth(request: Request, env: Env): Promise<AuthResult> {
  const apiKeyHeader = request.headers.get("X-API-Key")?.trim();
  if (apiKeyHeader) return { ok: true, apiKey: apiKeyHeader };

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token.startsWith("pl_live_") || token.startsWith("pl_test_")) {
      return { ok: true, apiKey: token };
    }
    const result = await (env as any).OAUTH_PROVIDER.unwrapToken(token);
    if (result?.grant?.props?.apiKey) {
      return { ok: true, apiKey: result.grant.props.apiKey };
    }
    return { ok: false, reason: "invalid_bearer" };
  }

  return { ok: false, reason: "no_auth" };
}

// ============================================
// OAUTH HANDLERS
// ============================================

async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const oauthReqInfo = await (env as any).OAUTH_PROVIDER.parseAuthRequest(request);
  const nonce = crypto.randomUUID();
  await env.OAUTH_KV.put(`authreq:${nonce}`, JSON.stringify(oauthReqInfo), { expirationTtl: 600 });

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set("redirect_uri", "https://mcp.sociologic.ai/callback");
  githubAuthUrl.searchParams.set("state", nonce);
  githubAuthUrl.searchParams.set("scope", "read:user user:email");

  return Response.redirect(githubAuthUrl.toString(), 302);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nonce = url.searchParams.get("state");

  if (!code || !nonce) {
    return new Response("Missing code or state parameter", { status: 400 });
  }

  const stored = await env.OAUTH_KV.get(`authreq:${nonce}`);
  if (!stored) {
    return new Response("Authorization request expired or invalid", { status: 400 });
  }
  await env.OAUTH_KV.delete(`authreq:${nonce}`);
  const oauthReqInfo = JSON.parse(stored);

  // Exchange GitHub code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return new Response(`GitHub token exchange failed: ${tokenData.error || "unknown"}`, { status: 502 });
  }

  // Call SocioLogic-core to create/find profile
  const apiUrl = env.SOCIOLOGIC_API_URL || "https://www.sociologic.ai";
  const coreRes = await fetch(`${apiUrl}/api/v1/auth/github-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_access_token: tokenData.access_token }),
  });

  const coreData = await coreRes.json() as { api_key?: string; email?: string; error?: any };
  if (!coreData.api_key) {
    return new Response(`Profile creation failed: ${JSON.stringify(coreData.error)}`, { status: 502 });
  }

  const { redirectTo } = await (env as any).OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: coreData.email,
    metadata: {},
    scope: oauthReqInfo.scope ?? [],
    props: { apiKey: coreData.api_key },
    revokeExistingGrants: false,
  });

  return Response.redirect(redirectTo, 302);
}

// ============================================
// SSE TRANSPORT - NOT IMPLEMENTED
// ============================================
// SSE transport requires bidirectional communication and stateful connections
// which would need Cloudflare Durable Objects. Use JSON-RPC endpoint instead.
// See: https://modelcontextprotocol.io/docs/concepts/transports

// ============================================
// DEFAULT HANDLER (routing for non-OAuth paths)
// ============================================

const defaultHandler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Route based on path
    const path = url.pathname;

    // OAuth authorize and callback (handled before MCP routes)
    if (path === "/authorize") {
      return handleAuthorize(request, env);
    }
    if (path === "/callback") {
      return handleCallback(request, env);
    }

    // Server card for Smithery discovery (no auth required - must be before auth check)
    // Format follows SEP-1649 spec: https://smithery.ai/docs/build/external#server-scanning
    if (path === "/.well-known/mcp/server-card.json") {
      const toolsWithSchema = TOOL_DEFINITIONS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.inputSchema, {
          target: "jsonSchema7",
          $refStrategy: "none",
        }),
        annotations: t.annotations,
        ...((t as any)._meta ? { _meta: (t as any)._meta } : {}),
      }));

      return withCors(
        new Response(
          JSON.stringify({
            serverInfo: {
              name: "signal-relay-mcp",
              displayName: "Signal Relay - Revenue Intelligence for AI Agents",
              version: VERSION,
              icon: "https://www.sociologic.ai/apple-touch-icon.png",
            },
            authentication: {
              required: true,
              schemes: ["apiKey"],
              instructions: "Get your API key at https://sociologic.ai/dashboard/api-keys (100 free credits on signup)",
            },
            configSchema: {
              type: "object",
              properties: {
                apiKey: {
                  type: "string",
                  title: "API Key",
                  description: "Your SocioLogic API key for authentication. Get one at https://sociologic.ai/dashboard/api-keys (100 free credits on signup)",
                },
              },
              required: ["apiKey"],
            },
            tools: toolsWithSchema,
            resources: [
              {
                uri: "sociologic://personas/marketplace",
                name: "Persona Marketplace",
                description: "Browse available synthetic personas in the SocioLogic marketplace",
                mimeType: "application/json",
              },
              {
                uri: "sociologic://campaigns/templates",
                name: "Campaign Templates",
                description: "Pre-built research campaign templates for common use cases",
                mimeType: "application/json",
              },
              {
                uri: "sociologic://account/credits",
                name: "Credits Balance",
                description: "Your current SocioLogic credits balance and usage",
                mimeType: "application/json",
              },
            ],
            prompts: [
              {
                name: "run_research_campaign",
                description: "Run a multi-persona research campaign to gather diverse perspectives",
                arguments: [
                  {
                    name: "research_question",
                    description: "The main research question you want to answer",
                    required: true,
                  },
                  {
                    name: "persona_count",
                    description: "Number of personas to interview (default: 10)",
                    required: false,
                  },
                ],
              },
              {
                name: "competitive_analysis",
                description: "Get synthetic customer perspectives on competitive products",
                arguments: [
                  {
                    name: "product",
                    description: "Your product or service name",
                    required: true,
                  },
                  {
                    name: "competitors",
                    description: "Comma-separated list of competitor names",
                    required: true,
                  },
                ],
              },
            ],
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    // Early check of Content-Length header if present (optimization)
    const contentLength = request.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
      return withCors(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: MCP_ERRORS.INVALID_REQUEST,
              message: `Request body too large. Maximum size is ${MAX_REQUEST_SIZE} bytes.`,
            },
          }),
          {
            status: 413,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    // SSE endpoint - not implemented (requires Durable Objects for stateful connections)
    if (path === "/sse" || path === "/mcp/sse") {
      return withCors(
        new Response(
          JSON.stringify({
            error: {
              code: "NOT_IMPLEMENTED",
              message: "SSE transport is not available. Use JSON-RPC instead: POST to / or /rpc",
              documentation: "https://www.sociologic.ai/docs/mcp",
            },
          }),
          {
            status: 501,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    // JSON-RPC endpoint for direct calls
    if (path === "/" || path === "/mcp" || path === "/rpc") {
      if (request.method !== "POST") {
        return withCors(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: MCP_ERRORS.INVALID_REQUEST,
                message: "POST method required for JSON-RPC",
              },
            }),
            {
              status: 405,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        );
      }

      // Resolve auth for MCP endpoints
      const auth = await resolveMcpAuth(request, env);
      if (!auth.ok) {
        return withCors(
          new Response(
            JSON.stringify({
              error: "unauthorized",
              error_description: "API key required. Pass via X-API-Key header or Authorization: Bearer header.",
            }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        );
      }

      const apiUrl = env.SOCIOLOGIC_API_URL || "https://www.sociologic.ai";
      const handler = new MCPHandler(apiUrl, auth.apiKey);

      try {
        // Read body as text first to validate size (bypasses Content-Length bypass)
        const bodyText = await request.text();
        if (bodyText.length > MAX_REQUEST_SIZE) {
          return withCors(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: {
                  code: MCP_ERRORS.INVALID_REQUEST,
                  message: `Request body too large. Maximum size is ${MAX_REQUEST_SIZE} bytes.`,
                },
              }),
              {
                status: 413,
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        // Parse JSON
        let body: unknown;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return withCors(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: {
                  code: MCP_ERRORS.PARSE_ERROR,
                  message: "Failed to parse JSON body",
                },
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        // Validate body is an object (not array, null, or primitive)
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          return withCors(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: {
                  code: MCP_ERRORS.INVALID_REQUEST,
                  message: "Request body must be a JSON object",
                },
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        const mcpRequest = body as MCPRequest;

        // Validate JSON-RPC structure
        if (mcpRequest.jsonrpc !== "2.0" || typeof mcpRequest.method !== "string") {
          return withCors(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: mcpRequest.id ?? null,
                error: {
                  code: MCP_ERRORS.INVALID_REQUEST,
                  message: "Invalid JSON-RPC 2.0 request: requires jsonrpc='2.0' and method string",
                },
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        // Validate id is string, number, or null (per JSON-RPC spec)
        if (
          mcpRequest.id !== undefined &&
          mcpRequest.id !== null &&
          typeof mcpRequest.id !== "string" &&
          typeof mcpRequest.id !== "number"
        ) {
          return withCors(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: {
                  code: MCP_ERRORS.INVALID_REQUEST,
                  message: "Invalid JSON-RPC request: id must be string, number, or null",
                },
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              }
            )
          );
        }

        const response = await handler.handleRequest(mcpRequest);

        return withCors(
          new Response(JSON.stringify(response), {
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
      } catch (error) {
        return withCors(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: MCP_ERRORS.INTERNAL_ERROR,
                message: "Failed to process request",
              },
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        );
      }
    }

    // Health check endpoint
    if (path === "/health") {
      return withCors(
        new Response(
          JSON.stringify({
            status: "healthy",
            server: "sociologic-mcp-server",
            version: VERSION,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    // Info endpoint
    if (path === "/info") {
      return withCors(
        new Response(
          JSON.stringify({
            name: "SocioLogic MCP Server",
            version: VERSION,
            description: "Remote MCP server for the SocioLogic Revenue Intelligence Platform",
            endpoints: {
              "/": "JSON-RPC endpoint (POST)",
              "/sse": "Not implemented (returns 501)",
              "/health": "Health check",
              "/info": "Server information",
            },
            tools: TOOL_DEFINITIONS.map((t) => ({
              name: t.name,
              description: t.description,
            })),
            documentation: "https://www.sociologic.ai/docs",
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    // 404 for everything else
    return withCors(
      new Response("Not Found", {
        status: 404,
      })
    );
  },
};

// ============================================
// OAUTH PROVIDER ENTRYPOINT
// ============================================

export default new OAuthProvider({
  apiHandlers: {
    "/oauth-api": {
      async fetch() {
        return new Response("Not Found", { status: 404 });
      },
    },
  },
  defaultHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  resourceMetadata: {
    resource: "https://mcp.sociologic.ai",
    authorization_servers: ["https://mcp.sociologic.ai"],
  },
});
