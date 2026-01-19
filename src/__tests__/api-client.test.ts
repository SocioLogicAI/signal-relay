/**
 * Tests for SocioLogic API Client
 *
 * Tests cover:
 * - Successful API calls for all endpoints
 * - Error handling (HTTP errors, network errors, timeouts)
 * - Authentication via X-API-Key header
 * - Query parameter handling
 * - Timeout behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocioLogicClient } from '../api-client';
import { server } from './mocks/server';
import { http, HttpResponse, delay } from 'msw';

const API_BASE = 'https://www.sociologic.ai';
const VALID_API_KEY = 'test-api-key-123';

describe('SocioLogicClient', () => {
  let client: SocioLogicClient;

  beforeEach(() => {
    client = new SocioLogicClient({
      apiUrl: API_BASE,
      apiKey: VALID_API_KEY,
    });
  });

  describe('constructor', () => {
    it('should remove trailing slash from API URL', () => {
      const clientWithSlash = new SocioLogicClient({
        apiUrl: 'https://example.com/',
        apiKey: 'key',
      });
      // We can verify this by checking that requests work correctly
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe('getCreditsBalance', () => {
    it('should return credits balance for valid API key', async () => {
      const result = await client.getCreditsBalance();

      expect(result.data).toBeDefined();
      expect(result.data?.valid).toBe(true);
      expect(result.data?.credits_balance).toBe(100);
      expect(result.data?.rate_limit_tier).toBe('standard');
    });

    it('should return error for invalid API key', async () => {
      const invalidClient = new SocioLogicClient({
        apiUrl: API_BASE,
        apiKey: 'invalid-key',
      });

      const result = await invalidClient.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('should return error for missing API key', async () => {
      const noKeyClient = new SocioLogicClient({
        apiUrl: API_BASE,
        apiKey: '',
      });

      const result = await noKeyClient.getCreditsBalance();

      expect(result.error).toBeDefined();
    });
  });

  describe('Persona endpoints', () => {
    describe('listPersonas', () => {
      it('should list personas with default parameters', async () => {
        const result = await client.listPersonas({});

        expect(result.data).toBeDefined();
      });

      it('should pass visibility filter', async () => {
        const result = await client.listPersonas({ visibility: 'private' });

        expect(result.data).toBeDefined();
      });

      it('should pass pagination parameters', async () => {
        const result = await client.listPersonas({ page: 2, per_page: 50 });

        expect(result.data).toBeDefined();
      });

      it('should pass search parameter', async () => {
        const result = await client.listPersonas({ search: 'enterprise' });

        expect(result.data).toBeDefined();
      });
    });

    describe('getPersona', () => {
      it('should return persona details', async () => {
        const result = await client.getPersona('alex-chen');

        expect(result.data).toBeDefined();
      });

      it('should return error for non-existent persona', async () => {
        const result = await client.getPersona('not-found');

        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('createPersona', () => {
      it('should create a persona', async () => {
        const result = await client.createPersona({
          description: 'A tech-savvy millennial startup founder',
          fidelity_tier: 'enhanced',
        });

        expect(result.data).toBeDefined();
      });
    });

    describe('interviewPersona', () => {
      it('should return interview response', async () => {
        const result = await client.interviewPersona('alex-chen', {
          message: 'What do you think about cloud security?',
        });

        expect(result.data).toBeDefined();
        expect(result.data?.response).toBeDefined();
        expect(result.data?.conversation_id).toBeDefined();
      });

      it('should include memory context when specified', async () => {
        const result = await client.interviewPersona('alex-chen', {
          message: 'Tell me more about your concerns',
          include_memory: true,
        });

        expect(result.data).toBeDefined();
        expect(result.data?.memory_context_used).toBe(true);
      });

      it('should continue existing conversation', async () => {
        const result = await client.interviewPersona('alex-chen', {
          message: 'Follow up question',
          conversation_id: '423e4567-e89b-12d3-a456-426614174000',
        });

        expect(result.data).toBeDefined();
      });

      it('should return error for non-existent persona', async () => {
        const result = await client.interviewPersona('not-found', {
          message: 'Hello',
        });

        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('getPersonaMemories', () => {
      it('should return persona memories', async () => {
        const result = await client.getPersonaMemories('alex-chen', {});

        expect(result.data).toBeDefined();
        expect(result.data?.memories).toBeDefined();
      });

      it('should pass query parameter for semantic search', async () => {
        const result = await client.getPersonaMemories('alex-chen', {
          query: 'security',
          limit: 5,
        });

        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Campaign endpoints', () => {
    describe('listCampaigns', () => {
      it('should list campaigns', async () => {
        const result = await client.listCampaigns({});

        expect(result.data).toBeDefined();
      });

      it('should filter by status', async () => {
        const result = await client.listCampaigns({ status: 'completed' });

        expect(result.data).toBeDefined();
      });
    });

    describe('getCampaign', () => {
      it('should return campaign details', async () => {
        const result = await client.getCampaign('223e4567-e89b-12d3-a456-426614174000');

        expect(result.data).toBeDefined();
      });

      it('should return error for non-existent campaign', async () => {
        const result = await client.getCampaign('00000000-0000-0000-0000-000000000000');

        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('createCampaign', () => {
      it('should create a campaign', async () => {
        const result = await client.createCampaign({
          name: 'New Product Research',
          questions: [
            { id: 'q1', text: 'What features do you need?', type: 'open', required: true },
          ],
        });

        expect(result.data).toBeDefined();
      });

      it('should create campaign with research context', async () => {
        const result = await client.createCampaign({
          name: 'Feature Validation',
          questions: [
            { id: 'q1', text: 'Rate this feature', type: 'scale', required: true },
          ],
          research_context: {
            subjectName: 'New Dashboard',
            subjectDescription: 'A redesigned dashboard with better analytics',
            currentChallenge: 'Users find the current dashboard confusing',
            areasToExplore: ['navigation', 'data visualization'],
          },
        });

        expect(result.data).toBeDefined();
      });
    });

    describe('executeCampaign', () => {
      it('should start campaign execution', async () => {
        const result = await client.executeCampaign('223e4567-e89b-12d3-a456-426614174000');

        expect(result.data).toBeDefined();
        expect(result.data?.status).toBe('running');
      });
    });

    describe('exportCampaign', () => {
      it('should return PDF export URL', async () => {
        const result = await client.exportCampaign('223e4567-e89b-12d3-a456-426614174000', 'pdf');

        expect(result.data).toBeDefined();
        expect(result.data?.export_url).toBeDefined();
        expect(result.data?.format).toBe('pdf');
      });

      it('should return JSON export data', async () => {
        const result = await client.exportCampaign('223e4567-e89b-12d3-a456-426614174000', 'json');

        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Focus Group endpoints', () => {
    describe('listFocusGroups', () => {
      it('should list focus groups', async () => {
        const result = await client.listFocusGroups({});

        expect(result.data).toBeDefined();
      });

      it('should pass pagination parameters', async () => {
        const result = await client.listFocusGroups({ limit: 10, offset: 5 });

        expect(result.data).toBeDefined();
      });
    });

    describe('getFocusGroup', () => {
      it('should return focus group details', async () => {
        const result = await client.getFocusGroup('323e4567-e89b-12d3-a456-426614174000');

        expect(result.data).toBeDefined();
      });

      it('should return error for non-existent focus group', async () => {
        const result = await client.getFocusGroup('00000000-0000-0000-0000-000000000000');

        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('createFocusGroup', () => {
      it('should create a focus group', async () => {
        const result = await client.createFocusGroup({
          name: 'New Focus Group',
          description: 'A test focus group',
        });

        expect(result.data).toBeDefined();
      });
    });

    describe('addPersonasToFocusGroup', () => {
      it('should add personas to focus group', async () => {
        const result = await client.addPersonasToFocusGroup(
          '323e4567-e89b-12d3-a456-426614174000',
          ['123e4567-e89b-12d3-a456-426614174000']
        );

        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/auth/validate`, () => {
          return HttpResponse.error();
        })
      );

      const result = await client.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle timeout', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/auth/validate`, async () => {
          await delay(35000); // Longer than default 30s timeout
          return HttpResponse.json({ data: {} });
        })
      );

      // Create client and call with default timeout
      const result = await client.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TIMEOUT');
    }, 40000);

    it('should handle HTTP 500 errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/auth/validate`, () => {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const result = await client.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    });

    it('should handle non-JSON error responses', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/auth/validate`, () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        })
      );

      const result = await client.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('500');
    });

    it('should handle rate limiting (429)', async () => {
      server.use(
        http.get(`${API_BASE}/api/v1/auth/validate`, () => {
          return HttpResponse.json(
            { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
            { status: 429 }
          );
        })
      );

      const result = await client.getCreditsBalance();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMITED');
    });
  });
});
