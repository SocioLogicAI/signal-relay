/**
 * Tests for MCP Tool Definitions and Zod Schemas
 *
 * Tests cover:
 * - All 20 tool schemas validate correctly
 * - Required vs optional fields
 * - Type coercion and defaults
 * - Error messages for invalid input
 */

import { describe, it, expect } from 'vitest';
import {
  TOOL_DEFINITIONS,
  ListPersonasSchema,
  GetPersonaSchema,
  CreatePersonaSchema,
  InterviewPersonaSchema,
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
  GetCreditsBalanceSchema,
  GetX402DiscoverySchema,
  // Web research schemas
  ScrapeUrlSchema,
  SearchWebSchema,
  ResearchTopicSchema,
  GetCompanyInfoSchema,
} from '../tools';

describe('Tool Definitions', () => {
  it('should have 20 tool definitions', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(20);
  });

  it('should have unique tool names', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have all required properties on each tool', () => {
    TOOL_DEFINITIONS.forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.name).toMatch(/^sociologic_/);
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.annotations).toBeDefined();
    });
  });

  it('should have valid annotations on each tool', () => {
    TOOL_DEFINITIONS.forEach((tool) => {
      expect(tool.annotations.title).toBeDefined();
      expect(typeof tool.annotations.readOnlyHint).toBe('boolean');
      expect(typeof tool.annotations.destructiveHint).toBe('boolean');
      expect(typeof tool.annotations.idempotentHint).toBe('boolean');
      expect(typeof tool.annotations.openWorldHint).toBe('boolean');
    });
  });

  it('should mark read-only tools correctly', () => {
    const readOnlyTools = [
      'sociologic_list_personas',
      'sociologic_get_persona',
      'sociologic_get_persona_memories',
      'sociologic_list_campaigns',
      'sociologic_get_campaign',
      'sociologic_export_campaign',
      'sociologic_list_focus_groups',
      'sociologic_get_focus_group',
      'sociologic_get_credits_balance',
      'sociologic_get_x402_discovery',
      // Web research tools (all read-only)
      'sociologic_scrape_url',
      'sociologic_search_web',
      'sociologic_research_topic',
      'sociologic_get_company_info',
    ];

    readOnlyTools.forEach((name) => {
      const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
      expect(tool?.annotations.readOnlyHint).toBe(true);
    });
  });

  it('should mark mutating tools correctly', () => {
    const mutatingTools = [
      'sociologic_create_persona',
      'sociologic_interview_persona',
      'sociologic_create_campaign',
      'sociologic_execute_campaign',
      'sociologic_create_focus_group',
      'sociologic_add_personas_to_focus_group',
    ];

    mutatingTools.forEach((name) => {
      const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
      expect(tool?.annotations.readOnlyHint).toBe(false);
    });
  });
});

describe('ListPersonasSchema', () => {
  it('should accept valid input', () => {
    const result = ListPersonasSchema.safeParse({
      visibility: 'public',
      category: 'enterprise',
      fidelity_tier: 'enhanced',
      search: 'buyer',
      page: 1,
      per_page: 20,
    });

    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = ListPersonasSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe('public');
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(20);
    }
  });

  it('should reject invalid visibility', () => {
    const result = ListPersonasSchema.safeParse({
      visibility: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid fidelity tier', () => {
    const result = ListPersonasSchema.safeParse({
      fidelity_tier: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should reject per_page over 100', () => {
    const result = ListPersonasSchema.safeParse({
      per_page: 150,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-positive page', () => {
    const result = ListPersonasSchema.safeParse({
      page: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('GetPersonaSchema', () => {
  it('should accept valid slug', () => {
    const result = GetPersonaSchema.safeParse({
      slug: 'alex-chen',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty slug', () => {
    const result = GetPersonaSchema.safeParse({
      slug: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing slug', () => {
    const result = GetPersonaSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('CreatePersonaSchema', () => {
  it('should accept valid input', () => {
    const result = CreatePersonaSchema.safeParse({
      description: 'A tech-savvy millennial startup founder',
      fidelity_tier: 'enhanced',
    });

    expect(result.success).toBe(true);
  });

  it('should apply default fidelity tier', () => {
    const result = CreatePersonaSchema.safeParse({
      description: 'A tech-savvy millennial startup founder',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fidelity_tier).toBe('enhanced');
    }
  });

  it('should reject too short description', () => {
    const result = CreatePersonaSchema.safeParse({
      description: 'Short',
    });

    expect(result.success).toBe(false);
  });

  it('should reject too long description', () => {
    const result = CreatePersonaSchema.safeParse({
      description: 'x'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('should accept all fidelity tiers', () => {
    const tiers = ['standard', 'enhanced', 'premium', 'ultra'];
    tiers.forEach((tier) => {
      const result = CreatePersonaSchema.safeParse({
        description: 'A valid description here',
        fidelity_tier: tier,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('InterviewPersonaSchema', () => {
  it('should accept valid input', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: 'What do you think about cloud security?',
    });

    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: 'Hello',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_memory).toBe(true);
      expect(result.data.save_conversation).toBe(true);
    }
  });

  it('should accept conversation_id for continuation', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: 'Follow up question',
      conversation_id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for conversation_id', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: 'Hello',
      conversation_id: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('should reject too long message', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: 'x'.repeat(4001),
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty message', () => {
    const result = InterviewPersonaSchema.safeParse({
      slug: 'alex-chen',
      message: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('GetPersonaMemoriesSchema', () => {
  it('should accept valid input', () => {
    const result = GetPersonaMemoriesSchema.safeParse({
      slug: 'alex-chen',
      query: 'security',
      limit: 5,
    });

    expect(result.success).toBe(true);
  });

  it('should apply default limit', () => {
    const result = GetPersonaMemoriesSchema.safeParse({
      slug: 'alex-chen',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject limit over 50', () => {
    const result = GetPersonaMemoriesSchema.safeParse({
      slug: 'alex-chen',
      limit: 51,
    });

    expect(result.success).toBe(false);
  });
});

describe('ListCampaignsSchema', () => {
  it('should accept valid input', () => {
    const result = ListCampaignsSchema.safeParse({
      status: 'completed',
      limit: 10,
      offset: 0,
      include_interviews: true,
    });

    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = ListCampaignsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.include_interviews).toBe(false);
    }
  });

  it('should accept all valid statuses', () => {
    const statuses = ['draft', 'running', 'completed', 'failed'];
    statuses.forEach((status) => {
      const result = ListCampaignsSchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const result = ListCampaignsSchema.safeParse({
      status: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('GetCampaignSchema', () => {
  it('should accept valid UUID', () => {
    const result = GetCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = GetCampaignSchema.safeParse({
      id: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});

describe('CreateCampaignSchema', () => {
  const validQuestion = {
    id: 'q1',
    text: 'What do you think?',
    type: 'open',
    required: true,
  };

  it('should accept valid input', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      description: 'A test campaign',
      questions: [validQuestion],
    });

    expect(result.success).toBe(true);
  });

  it('should apply default fidelity tier', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions: [validQuestion],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fidelity_tier).toBe('enhanced');
      expect(result.data.persona_count).toBe(10);
    }
  });

  it('should accept research context', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions: [validQuestion],
      research_context: {
        subjectName: 'New Product',
        subjectDescription: 'A revolutionary new product that changes everything',
        currentChallenge: 'We need to understand user adoption barriers',
      },
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty questions array', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions: [],
    });

    expect(result.success).toBe(false);
  });

  it('should reject more than 20 questions', () => {
    const questions = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i}`,
      text: 'Question text',
      type: 'open',
      required: true,
    }));

    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions,
    });

    expect(result.success).toBe(false);
  });

  it('should accept multiple choice questions with options', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions: [
        {
          id: 'q1',
          text: 'Which option do you prefer?',
          type: 'multiple_choice',
          required: true,
          options: ['Option A', 'Option B', 'Option C'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject persona_count over 50', () => {
    const result = CreateCampaignSchema.safeParse({
      name: 'Test Campaign',
      questions: [validQuestion],
      persona_count: 51,
    });

    expect(result.success).toBe(false);
  });
});

describe('ExecuteCampaignSchema', () => {
  it('should accept valid UUID', () => {
    const result = ExecuteCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = ExecuteCampaignSchema.safeParse({
      id: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('ExportCampaignSchema', () => {
  it('should accept valid input', () => {
    const result = ExportCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      format: 'pdf',
    });

    expect(result.success).toBe(true);
  });

  it('should apply default format', () => {
    const result = ExportCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('pdf');
    }
  });

  it('should accept json format', () => {
    const result = ExportCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      format: 'json',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid format', () => {
    const result = ExportCampaignSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      format: 'csv',
    });

    expect(result.success).toBe(false);
  });
});

describe('ListFocusGroupsSchema', () => {
  it('should accept valid input', () => {
    const result = ListFocusGroupsSchema.safeParse({
      limit: 10,
      offset: 5,
    });

    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = ListFocusGroupsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should reject limit over 100', () => {
    const result = ListFocusGroupsSchema.safeParse({
      limit: 101,
    });

    expect(result.success).toBe(false);
  });
});

describe('GetFocusGroupSchema', () => {
  it('should accept valid UUID', () => {
    const result = GetFocusGroupSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = GetFocusGroupSchema.safeParse({
      id: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});

describe('CreateFocusGroupSchema', () => {
  it('should accept valid input', () => {
    const result = CreateFocusGroupSchema.safeParse({
      name: 'Enterprise Buyers',
      description: 'A group of enterprise decision makers',
    });

    expect(result.success).toBe(true);
  });

  it('should accept name only', () => {
    const result = CreateFocusGroupSchema.safeParse({
      name: 'Enterprise Buyers',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = CreateFocusGroupSchema.safeParse({
      name: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject too long name', () => {
    const result = CreateFocusGroupSchema.safeParse({
      name: 'x'.repeat(201),
    });

    expect(result.success).toBe(false);
  });

  it('should reject too long description', () => {
    const result = CreateFocusGroupSchema.safeParse({
      name: 'Valid Name',
      description: 'x'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });
});

describe('AddPersonasToFocusGroupSchema', () => {
  it('should accept valid input', () => {
    const result = AddPersonasToFocusGroupSchema.safeParse({
      focus_group_id: '123e4567-e89b-12d3-a456-426614174000',
      persona_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    });

    expect(result.success).toBe(true);
  });

  it('should accept multiple persona IDs', () => {
    const result = AddPersonasToFocusGroupSchema.safeParse({
      focus_group_id: '123e4567-e89b-12d3-a456-426614174000',
      persona_ids: [
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty persona_ids array', () => {
    const result = AddPersonasToFocusGroupSchema.safeParse({
      focus_group_id: '123e4567-e89b-12d3-a456-426614174000',
      persona_ids: [],
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid UUID in persona_ids', () => {
    const result = AddPersonasToFocusGroupSchema.safeParse({
      focus_group_id: '123e4567-e89b-12d3-a456-426614174000',
      persona_ids: ['not-a-uuid'],
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid focus_group_id', () => {
    const result = AddPersonasToFocusGroupSchema.safeParse({
      focus_group_id: 'invalid',
      persona_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    });

    expect(result.success).toBe(false);
  });
});

describe('GetCreditsBalanceSchema', () => {
  it('should accept empty object', () => {
    const result = GetCreditsBalanceSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should ignore extra properties', () => {
    const result = GetCreditsBalanceSchema.safeParse({
      extra: 'property',
    });

    // Zod strips extra properties by default
    expect(result.success).toBe(true);
  });
});

// ============================================
// WEB RESEARCH SCHEMAS (Firecrawl integration)
// ============================================

describe('ScrapeUrlSchema', () => {
  it('should accept valid URL', () => {
    const result = ScrapeUrlSchema.safeParse({
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = ScrapeUrlSchema.safeParse({
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formats).toEqual(['markdown']);
      expect(result.data.only_main_content).toBe(true);
    }
  });

  it('should accept multiple formats', () => {
    const result = ScrapeUrlSchema.safeParse({
      url: 'https://example.com',
      formats: ['markdown', 'html', 'links'],
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = ScrapeUrlSchema.safeParse({
      url: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing URL', () => {
    const result = ScrapeUrlSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('SearchWebSchema', () => {
  it('should accept valid query', () => {
    const result = SearchWebSchema.safeParse({
      query: 'test search query',
    });

    expect(result.success).toBe(true);
  });

  it('should apply default limit', () => {
    const result = SearchWebSchema.safeParse({
      query: 'test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(5);
    }
  });

  it('should accept custom limit', () => {
    const result = SearchWebSchema.safeParse({
      query: 'test',
      limit: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject empty query', () => {
    const result = SearchWebSchema.safeParse({
      query: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject query exceeding max length', () => {
    const result = SearchWebSchema.safeParse({
      query: 'x'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('should reject limit over 10', () => {
    const result = SearchWebSchema.safeParse({
      query: 'test',
      limit: 11,
    });

    expect(result.success).toBe(false);
  });
});

describe('ResearchTopicSchema', () => {
  it('should accept valid topic', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: 'artificial intelligence trends',
    });

    expect(result.success).toBe(true);
  });

  it('should apply default source_count', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: 'test topic',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source_count).toBe(3);
    }
  });

  it('should accept custom source_count', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: 'test topic',
      source_count: 5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source_count).toBe(5);
    }
  });

  it('should reject empty topic', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject topic exceeding max length', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: 'x'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('should reject source_count over 5', () => {
    const result = ResearchTopicSchema.safeParse({
      topic: 'test',
      source_count: 6,
    });

    expect(result.success).toBe(false);
  });
});

describe('GetCompanyInfoSchema', () => {
  it('should accept valid URL', () => {
    const result = GetCompanyInfoSchema.safeParse({
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = GetCompanyInfoSchema.safeParse({
      url: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing URL', () => {
    const result = GetCompanyInfoSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
