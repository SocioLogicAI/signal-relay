/**
 * Tests for MCP Server Entry Point (Cloudflare Workers Handler)
 *
 * Tests cover:
 * - MCP protocol: initialize, tools/list, tools/call, prompts/list, resources/list
 * - HTTP routing: /, /rpc, /mcp, /health, /info, /sse, /.well-known/mcp/server-card.json
 * - Authentication: X-API-Key header, Bearer token
 * - CORS handling
 * - Error responses: 400, 401, 404, 405, 413
 * - JSON-RPC validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../index';

const API_BASE = 'https://signal-relay.sociologic.workers.dev';
const VALID_API_KEY = 'test-api-key-123';

// Helper to create mock Request objects
function createRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options;

  return new Request(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Helper to create JSON-RPC request
function createJsonRpcRequest(
  method: string,
  params?: unknown,
  id: string | number = 1
) {
  return {
    jsonrpc: '2.0' as const,
    id,
    method,
    params,
  };
}

// Mock env
const mockEnv = {
  SOCIOLOGIC_API_URL: 'https://www.sociologic.ai',
};

describe('Cloudflare Workers Handler', () => {
  describe('CORS Preflight', () => {
    it('should handle OPTIONS request', async () => {
      const request = createRequest('/', { method: 'OPTIONS' });
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Server Card (/.well-known/mcp/server-card.json)', () => {
    it('should return server card without authentication', async () => {
      const request = createRequest('/.well-known/mcp/server-card.json');
      const response = await worker.fetch(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.serverInfo).toBeDefined();
      expect(body.serverInfo.name).toBe('signal-relay-mcp');
      expect(body.tools).toBeDefined();
      expect(body.tools).toHaveLength(20);
      expect(body.authentication).toBeDefined();
      expect(body.authentication.required).toBe(true);
    });

    it('should include all tools with schemas', async () => {
      const request = createRequest('/.well-known/mcp/server-card.json');
      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      body.tools.forEach((tool: { name: string; inputSchema: unknown }) => {
        expect(tool.name).toMatch(/^sociologic_/);
        expect(tool.inputSchema).toBeDefined();
      });
    });
  });

  describe('Authentication', () => {
    it('should reject request without API key', async () => {
      const request = createRequest('/', {
        method: 'POST',
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should accept X-API-Key header', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should accept Authorization Bearer header', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${VALID_API_KEY}` },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should trim whitespace from API key', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': `  ${VALID_API_KEY}  ` },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should reject empty API key', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': '   ' },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(401);
    });
  });

  describe('HTTP Routing', () => {
    it('should accept POST to /', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should accept POST to /rpc', async () => {
      const request = createRequest('/rpc', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should accept POST to /mcp', async () => {
      const request = createRequest('/mcp', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });

    it('should reject GET to /', async () => {
      const request = createRequest('/', {
        method: 'GET',
        headers: { 'X-API-Key': VALID_API_KEY },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(405);
    });

    it('should return 501 for /sse', async () => {
      const request = createRequest('/sse', {
        method: 'GET',
        headers: { 'X-API-Key': VALID_API_KEY },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(501);

      const body = await response.json();
      expect(body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return health check from /health', async () => {
      const request = createRequest('/health', {
        method: 'GET',
        headers: { 'X-API-Key': VALID_API_KEY },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('healthy');
    });

    it('should return server info from /info', async () => {
      const request = createRequest('/info', {
        method: 'GET',
        headers: { 'X-API-Key': VALID_API_KEY },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.name).toBe('SocioLogic MCP Server');
      expect(body.tools).toBeDefined();
    });

    it('should return 404 for unknown paths', async () => {
      const request = createRequest('/unknown', {
        method: 'GET',
        headers: { 'X-API-Key': VALID_API_KEY },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Request Size Limits', () => {
    it('should reject requests exceeding Content-Length limit', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: {
          'X-API-Key': VALID_API_KEY,
          'Content-Length': '2000000', // 2MB
        },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(413);
    });
  });

  describe('JSON-RPC Validation', () => {
    it('should reject invalid JSON', async () => {
      const request = new Request(`${API_BASE}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': VALID_API_KEY,
        },
        body: 'invalid json',
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe(-32700); // PARSE_ERROR
    });

    it('should reject non-object body', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: [1, 2, 3], // Array instead of object
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe(-32600); // INVALID_REQUEST
    });

    it('should reject missing jsonrpc version', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: { id: 1, method: 'ping' },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe(-32600);
    });

    it('should reject wrong jsonrpc version', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: { jsonrpc: '1.0', id: 1, method: 'ping' },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);
    });

    it('should reject missing method', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: { jsonrpc: '2.0', id: 1 },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);
    });

    it('should reject invalid id type (object)', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: { jsonrpc: '2.0', id: { invalid: true }, method: 'ping' },
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(400);
    });

    it('should accept string id', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping', undefined, 'string-id'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe('string-id');
    });

    it('should accept numeric id', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping', undefined, 42),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(42);
    });
  });

  describe('MCP Protocol: ping', () => {
    it('should respond to ping', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.jsonrpc).toBe('2.0');
      expect(body.result.pong).toBe(true);
    });
  });

  describe('MCP Protocol: initialize', () => {
    it('should initialize with server info', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('initialize'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.protocolVersion).toBe('2024-11-05');
      expect(body.result.capabilities).toBeDefined();
      expect(body.result.serverInfo.name).toBe('sociologic-mcp-server');
    });

    it('should fail initialization with invalid API key', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': 'invalid-key' },
        body: createJsonRpcRequest('initialize'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32600); // INVALID_REQUEST
    });
  });

  describe('MCP Protocol: tools/list', () => {
    it('should list all 20 tools', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.tools).toHaveLength(20);
    });

    it('should include JSON schema for each tool', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      body.result.tools.forEach((tool: { name: string; inputSchema: { type: string } }) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('MCP Protocol: tools/call', () => {
    it('should call sociologic_get_credits_balance', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'sociologic_get_credits_balance',
          arguments: {},
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.content).toBeDefined();
      expect(body.result.content[0].type).toBe('text');
    });

    it('should call sociologic_list_personas', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'sociologic_list_personas',
          arguments: { visibility: 'public' },
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.content).toBeDefined();
    });

    it('should call sociologic_get_persona', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'sociologic_get_persona',
          arguments: { slug: 'alex-chen' },
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.content).toBeDefined();
    });

    it('should call sociologic_interview_persona', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'sociologic_interview_persona',
          arguments: {
            slug: 'alex-chen',
            message: 'What do you think about cloud security?',
          },
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.content).toBeDefined();
    });

    it('should return error for unknown tool', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'unknown_tool',
          arguments: {},
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32603); // INTERNAL_ERROR
    });

    it('should return error for invalid arguments', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('tools/call', {
          name: 'sociologic_get_persona',
          arguments: { slug: '' }, // Empty slug is invalid
        }),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('MCP Protocol: prompts/list', () => {
    it('should list available prompts', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('prompts/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.prompts).toBeDefined();
      expect(body.result.prompts.length).toBeGreaterThan(0);
    });

    it('should include prompt arguments', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('prompts/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      const interviewPrompt = body.result.prompts.find(
        (p: { name: string }) => p.name === 'interview_persona'
      );
      expect(interviewPrompt).toBeDefined();
      expect(interviewPrompt.arguments).toBeDefined();
    });
  });

  describe('MCP Protocol: resources/list', () => {
    it('should list available resources', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('resources/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.resources).toBeDefined();
      expect(body.result.resources.length).toBeGreaterThan(0);
    });

    it('should include resource URIs and descriptions', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('resources/list'),
      });

      const response = await worker.fetch(request, mockEnv);
      const body = await response.json();

      body.result.resources.forEach((resource: { uri: string; name: string; description: string }) => {
        expect(resource.uri).toMatch(/^sociologic:\/\//);
        expect(resource.name).toBeDefined();
        expect(resource.description).toBeDefined();
      });
    });
  });

  describe('MCP Protocol: unknown method', () => {
    it('should return METHOD_NOT_FOUND for unknown methods', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('unknown/method'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(-32601); // METHOD_NOT_FOUND
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in all responses', async () => {
      const request = createRequest('/', {
        method: 'POST',
        headers: { 'X-API-Key': VALID_API_KEY },
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should include CORS headers in error responses', async () => {
      const request = createRequest('/', {
        method: 'POST',
        body: createJsonRpcRequest('ping'),
      });

      const response = await worker.fetch(request, mockEnv);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
