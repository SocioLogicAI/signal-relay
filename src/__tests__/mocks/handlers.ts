/**
 * MSW request handlers for mocking SocioLogic API responses
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE = 'https://www.sociologic.ai';

// Mock data
export const mockPersona = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  slug: 'alex-chen',
  name: 'Alex Chen',
  tagline: 'Enterprise SaaS buyer',
  description: 'A seasoned enterprise buyer with 15 years of experience',
  visibility: 'public' as const,
  fidelity_tier: 'enhanced' as const,
  demographics: {
    age: 42,
    location: 'San Francisco, CA',
    occupation: 'VP of Engineering',
    income_bracket: '$200k-$300k',
  },
  psychographics: {
    values: ['innovation', 'efficiency'],
    pain_points: ['integration complexity', 'vendor lock-in'],
  },
  created_at: '2024-01-15T10:00:00Z',
};

export const mockPersonasList = {
  data: [mockPersona],
  pagination: {
    total: 1,
    page: 1,
    per_page: 20,
    total_pages: 1,
  },
};

export const mockCampaign = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  name: 'Product Feedback Q1',
  description: 'Gathering feedback on new product features',
  status: 'completed',
  questions: [
    { id: 'q1', text: 'What do you think of the new dashboard?', type: 'open', required: true },
  ],
  created_at: '2024-01-20T10:00:00Z',
};

export const mockFocusGroup = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  name: 'Enterprise Buyers',
  description: 'Focus group of enterprise decision makers',
  personas: [mockPersona],
  created_at: '2024-01-18T10:00:00Z',
};

export const mockCreditsResponse = {
  data: {
    valid: true,
    credits_balance: 100,
    credits_used_total: 50,
    rate_limit_tier: 'standard',
  },
  meta: {
    request_id: 'req_123',
  },
};

export const mockInterviewResponse = {
  data: {
    response: "That's an interesting question. From my perspective as an enterprise buyer...",
    conversation_id: '423e4567-e89b-12d3-a456-426614174000',
    persona: {
      id: mockPersona.id,
      slug: mockPersona.slug,
      name: mockPersona.name,
    },
    memory_context_used: true,
  },
  meta: {
    request_id: 'req_456',
    credits_used: 5,
    credits_remaining: 95,
  },
};

export const mockMemoriesResponse = {
  data: {
    memories: [
      {
        id: 'mem_1',
        content: 'User discussed enterprise security requirements',
        similarity: 0.95,
        created_at: '2024-01-16T10:00:00Z',
      },
    ],
  },
  meta: {
    request_id: 'req_789',
  },
};

// Request handlers
export const handlers = [
  // Auth/Credits validation
  http.get(`${API_BASE}/api/v1/auth/validate`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey || apiKey === 'invalid-key') {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockCreditsResponse);
  }),

  // List personas
  http.get(`${API_BASE}/api/v1/personas`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: mockPersonasList, meta: { request_id: 'req_list' } });
  }),

  // Get single persona
  http.get(`${API_BASE}/api/v1/personas/:slug`, ({ params, request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const { slug } = params;
    if (slug === 'not-found') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: mockPersona, meta: { request_id: 'req_get' } });
  }),

  // Create persona
  http.post(`${API_BASE}/api/v1/personas`, async ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as { description: string; fidelity_tier?: string };
    return HttpResponse.json({
      data: { ...mockPersona, description: body.description },
      meta: { request_id: 'req_create', credits_used: 10 },
    });
  }),

  // Interview persona
  http.post(`${API_BASE}/api/v1/personas/:slug/interview`, async ({ params, request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const { slug } = params;
    if (slug === 'not-found') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockInterviewResponse);
  }),

  // Get persona memories
  http.get(`${API_BASE}/api/v1/personas/:slug/memories`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockMemoriesResponse);
  }),

  // List campaigns
  http.get(`${API_BASE}/api/v1/campaigns`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: [mockCampaign], meta: { request_id: 'req_campaigns' } });
  }),

  // Get campaign
  http.get(`${API_BASE}/api/v1/campaigns/:id`, ({ params, request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const { id } = params;
    if (id === '00000000-0000-0000-0000-000000000000') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: mockCampaign, meta: { request_id: 'req_campaign' } });
  }),

  // Create campaign
  http.post(`${API_BASE}/api/v1/campaigns`, async ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as { name: string; questions: unknown[] };
    return HttpResponse.json({
      data: { ...mockCampaign, name: body.name, status: 'draft' },
      meta: { request_id: 'req_create_campaign' },
    });
  }),

  // Execute campaign
  http.post(`${API_BASE}/api/v1/campaigns/:id/execute`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      data: { status: 'running', message: 'Campaign execution started' },
      meta: { request_id: 'req_execute' },
    });
  }),

  // Export campaign - respects format query parameter
  http.get(`${API_BASE}/api/v1/campaigns/:id/export`, ({ request, params }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'pdf';
    const { id } = params;

    if (format === 'pdf') {
      // PDF format returns a URL, not the actual data
      return HttpResponse.json({
        data: {
          export_url: `${API_BASE}/api/v1/campaigns/${id}/export?format=pdf`,
          format: 'pdf',
          message: 'Use the export_url to download the PDF report. Include your API key in the X-API-Key header.',
        },
        meta: { request_id: 'req_export' },
      });
    }

    // JSON format returns actual campaign data
    return HttpResponse.json({
      data: { export_data: mockCampaign },
      meta: { request_id: 'req_export' },
    });
  }),

  // List focus groups
  http.get(`${API_BASE}/api/v1/focus-groups`, ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({ data: [mockFocusGroup], meta: { request_id: 'req_groups' } });
  }),

  // Get focus group
  http.get(`${API_BASE}/api/v1/focus-groups/:id`, ({ params, request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const { id } = params;
    if (id === '00000000-0000-0000-0000-000000000000') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Focus group not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: mockFocusGroup, meta: { request_id: 'req_group' } });
  }),

  // Create focus group
  http.post(`${API_BASE}/api/v1/focus-groups`, async ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as { name: string };
    return HttpResponse.json({
      data: { ...mockFocusGroup, name: body.name, personas: [] },
      meta: { request_id: 'req_create_group' },
    });
  }),

  // Add personas to focus group
  http.post(`${API_BASE}/api/v1/focus-groups/:id/personas`, async ({ request }) => {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      data: { success: true, added_count: 1 },
      meta: { request_id: 'req_add_personas' },
    });
  }),

  // Handler for timeout testing - delays response
  http.get(`${API_BASE}/api/v1/slow-endpoint`, async () => {
    await delay(60000); // 60 second delay (longer than any timeout)
    return HttpResponse.json({ data: {} });
  }),
];

// Helper to create error handlers for specific tests
export const createErrorHandler = (path: string, error: { code: string; message: string }, status: number) => {
  return http.get(`${API_BASE}${path}`, () => {
    return HttpResponse.json({ error }, { status });
  });
};
