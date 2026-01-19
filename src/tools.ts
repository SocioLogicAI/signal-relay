/**
 * SocioLogic MCP Server - Tool Definitions
 *
 * This file defines all the MCP tools that map to the SocioLogic API endpoints.
 */

import { z } from "zod";

// ============================================
// TOOL SCHEMAS
// ============================================

export const ListPersonasSchema = z.object({
  visibility: z.enum(["public", "private", "all"]).default("public")
    .describe("Filter by visibility: 'public' (marketplace), 'private' (user's own), 'all' (both)"),
  category: z.string().optional()
    .describe("Filter by category"),
  fidelity_tier: z.enum(["standard", "enhanced", "premium", "ultra"]).optional()
    .describe("Filter by fidelity tier"),
  search: z.string().optional()
    .describe("Search in name, tagline, description"),
  page: z.number().int().positive().default(1)
    .describe("Page number for pagination"),
  per_page: z.number().int().min(1).max(100).default(20)
    .describe("Results per page (max 100)"),
});

export const GetPersonaSchema = z.object({
  slug: z.string().min(1)
    .describe("The persona's unique slug identifier"),
});

export const CreatePersonaSchema = z.object({
  description: z.string().min(10).max(2000)
    .describe("Natural language description of the persona to create"),
  fidelity_tier: z.enum(["standard", "enhanced", "premium", "ultra"]).default("enhanced")
    .describe("Fidelity tier for the persona (affects depth and consistency)"),
});

export const InterviewPersonaSchema = z.object({
  slug: z.string().min(1)
    .describe("The persona's unique slug identifier"),
  message: z.string().min(1).max(4000)
    .describe("Your message/question to the persona"),
  conversation_id: z.string().uuid().optional()
    .describe("Optional conversation ID to continue an existing conversation"),
  include_memory: z.boolean().default(true)
    .describe("Whether to include persona's semantic memory context"),
  save_conversation: z.boolean().default(true)
    .describe("Whether to save this conversation for future reference"),
});

export const GetPersonaMemoriesSchema = z.object({
  slug: z.string().min(1)
    .describe("The persona's unique slug identifier"),
  query: z.string().optional()
    .describe("Optional semantic search query to filter memories"),
  limit: z.number().int().min(1).max(50).default(10)
    .describe("Maximum number of memories to return"),
});

export const ListCampaignsSchema = z.object({
  status: z.enum(["draft", "running", "completed", "failed"]).optional()
    .describe("Filter by campaign status"),
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Maximum number of campaigns to return"),
  offset: z.number().int().min(0).default(0)
    .describe("Number of campaigns to skip for pagination"),
  include_interviews: z.boolean().default(false)
    .describe("Include interview details in response"),
});

export const GetCampaignSchema = z.object({
  id: z.string().uuid()
    .describe("The campaign's unique ID"),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200)
    .describe("Name for the campaign"),
  description: z.string().max(2000).optional()
    .describe("Description of the campaign's purpose"),
  questions: z.array(z.object({
    id: z.string().describe("Unique identifier for the question"),
    text: z.string().min(1).max(1000).describe("The question text to ask personas"),
    type: z.enum(["open", "scale", "multiple_choice"]).default("open").describe("Question type: open-ended, scale rating, or multiple choice"),
    required: z.boolean().default(true).describe("Whether the question must be answered"),
    options: z.array(z.string()).optional().describe("Answer options for multiple choice questions"),
  })).min(1).max(20)
    .describe("Research questions to ask personas"),
  persona_brief: z.string().min(10).max(2000).optional()
    .describe("Description for generating new personas (if not using existing)"),
  persona_count: z.number().int().min(1).max(50).default(10)
    .describe("Number of personas to generate (if using persona_brief)"),
  fidelity_tier: z.enum(["standard", "enhanced", "premium", "ultra"]).default("enhanced")
    .describe("Fidelity tier for generated personas"),
  existing_persona_ids: z.array(z.string().uuid()).optional()
    .describe("Use existing personas instead of generating new ones"),
  focus_group_ids: z.array(z.string().uuid()).optional()
    .describe("Use personas from existing focus groups"),
  research_context: z.object({
    subjectName: z.string().min(1).max(200).describe("Name of the product, service, or topic being researched"),
    subjectDescription: z.string().min(50).max(2000).describe("Detailed description of the research subject"),
    currentChallenge: z.string().min(20).max(1000).describe("The main challenge or problem you're trying to solve"),
    areasToExplore: z.array(z.string().max(500)).max(10).optional().describe("Specific areas or topics to investigate"),
    knownIssues: z.array(z.string().max(500)).max(10).optional().describe("Known problems or pain points to validate"),
  }).optional()
    .describe("Research context for AI-guided questioning"),
});

export const ExecuteCampaignSchema = z.object({
  id: z.string().uuid()
    .describe("The campaign's unique ID to execute"),
});

export const ExportCampaignSchema = z.object({
  id: z.string().uuid()
    .describe("The campaign's unique ID"),
  format: z.enum(["pdf", "json"]).default("pdf")
    .describe("Export format"),
});

export const ListFocusGroupsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Maximum number of focus groups to return"),
  offset: z.number().int().min(0).default(0)
    .describe("Number of focus groups to skip for pagination"),
});

export const GetFocusGroupSchema = z.object({
  id: z.string().uuid()
    .describe("The focus group's unique ID"),
});

export const CreateFocusGroupSchema = z.object({
  name: z.string().min(1).max(200)
    .describe("Name for the focus group"),
  description: z.string().max(2000).optional()
    .describe("Description of the focus group's purpose"),
});

export const AddPersonasToFocusGroupSchema = z.object({
  focus_group_id: z.string().uuid()
    .describe("The focus group's unique ID"),
  persona_ids: z.array(z.string().uuid()).min(1)
    .describe("Array of persona IDs to add to the focus group"),
});

export const GetCreditsBalanceSchema = z.object({});

// ============================================
// x402 PAYMENT SCHEMAS
// ============================================

/**
 * x402 payment configuration that can be added to paid endpoints
 */
export const X402PaymentSchema = z.object({
  payload: z.string().min(1)
    .describe("Base64-encoded payment payload from your x402 wallet"),
  scheme: z.string().optional()
    .describe("Payment scheme (default: 'exact')"),
  network: z.string().optional()
    .describe("Network identifier (default: 'eip155:8453' for Base)"),
});

/**
 * Schema for interview with optional x402 payment
 */
export const InterviewPersonaWithPaymentSchema = InterviewPersonaSchema.extend({
  x402_payment: X402PaymentSchema.optional()
    .describe("Optional x402 crypto payment to use instead of credits"),
});

/**
 * Schema for persona creation with optional x402 payment
 */
export const CreatePersonaWithPaymentSchema = CreatePersonaSchema.extend({
  x402_payment: X402PaymentSchema.optional()
    .describe("Optional x402 crypto payment to use instead of credits"),
});

/**
 * Schema for x402 discovery
 */
export const GetX402DiscoverySchema = z.object({});

// ============================================
// WEB RESEARCH SCHEMAS (Firecrawl via x402)
// ============================================

/**
 * Schema for scraping a URL
 */
export const ScrapeUrlSchema = z.object({
  url: z.string().url()
    .describe("The URL to scrape"),
  formats: z.array(z.enum(["markdown", "html", "links"])).default(["markdown"])
    .describe("Output formats to return"),
  only_main_content: z.boolean().default(true)
    .describe("Whether to extract only the main content (recommended)"),
});

/**
 * Schema for searching the web
 */
export const SearchWebSchema = z.object({
  query: z.string().min(1).max(500)
    .describe("Search query"),
  limit: z.number().int().min(1).max(10).default(5)
    .describe("Maximum number of results to return"),
});

/**
 * Schema for researching a topic
 */
export const ResearchTopicSchema = z.object({
  topic: z.string().min(1).max(500)
    .describe("Topic to research for persona enrichment"),
  source_count: z.number().int().min(1).max(5).default(3)
    .describe("Number of sources to gather"),
});

/**
 * Schema for getting company info
 */
export const GetCompanyInfoSchema = z.object({
  url: z.string().url()
    .describe("Company website URL to analyze"),
});

// ============================================
// TOOL DEFINITIONS (for MCP)
// ============================================

export const TOOL_DEFINITIONS = [
  {
    name: "sociologic_list_personas",
    description: "List available synthetic personas from the SocioLogic marketplace or your private collection. Use this to discover personas for interviews or campaigns.",
    inputSchema: ListPersonasSchema,
    annotations: {
      title: "List Personas",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_persona",
    description: "Get detailed information about a specific persona including demographics, psychographics, and behavioral traits.",
    inputSchema: GetPersonaSchema,
    annotations: {
      title: "Get Persona Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_create_persona",
    description: "Create a new synthetic persona from a natural language description. The AI will generate a high-fidelity persona with consistent traits. Supports x402 crypto payments.",
    inputSchema: CreatePersonaWithPaymentSchema,
    annotations: {
      title: "Create Persona",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_interview_persona",
    description: "Conduct an adversarial interview with a synthetic persona. Personas are prompted to challenge ideas and reveal unknown unknowns. Supports ongoing conversations and x402 crypto payments.",
    inputSchema: InterviewPersonaWithPaymentSchema,
    annotations: {
      title: "Interview Persona",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_persona_memories",
    description: "Retrieve a persona's semantic memories. Memories are vector-embedded learnings from past interactions that inform future responses.",
    inputSchema: GetPersonaMemoriesSchema,
    annotations: {
      title: "Get Persona Memories",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_list_campaigns",
    description: "List your research campaigns. Campaigns are structured multi-persona interview sessions with defined questions.",
    inputSchema: ListCampaignsSchema,
    annotations: {
      title: "List Campaigns",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_campaign",
    description: "Get detailed information about a specific campaign including status, personas, questions, and interview results.",
    inputSchema: GetCampaignSchema,
    annotations: {
      title: "Get Campaign Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_create_campaign",
    description: "Create a new research campaign. Define questions and either generate new personas or use existing ones. Campaigns enable systematic multi-persona research.",
    inputSchema: CreateCampaignSchema,
    annotations: {
      title: "Create Campaign",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_execute_campaign",
    description: "Execute a draft campaign. This triggers background interviews with all personas and generates a research report. Long-running operation.",
    inputSchema: ExecuteCampaignSchema,
    annotations: {
      title: "Execute Campaign",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_export_campaign",
    description: "Export a completed campaign's results as PDF or JSON. PDF includes executive summary, persona responses, and synthesized findings.",
    inputSchema: ExportCampaignSchema,
    annotations: {
      title: "Export Campaign",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_list_focus_groups",
    description: "List your focus groups. Focus groups are collections of personas for cohort-based research.",
    inputSchema: ListFocusGroupsSchema,
    annotations: {
      title: "List Focus Groups",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_focus_group",
    description: "Get detailed information about a focus group including its member personas.",
    inputSchema: GetFocusGroupSchema,
    annotations: {
      title: "Get Focus Group Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_create_focus_group",
    description: "Create a new focus group to organize personas for cohort-based research.",
    inputSchema: CreateFocusGroupSchema,
    annotations: {
      title: "Create Focus Group",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_add_personas_to_focus_group",
    description: "Add one or more personas to an existing focus group.",
    inputSchema: AddPersonasToFocusGroupSchema,
    annotations: {
      title: "Add Personas to Focus Group",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_credits_balance",
    description: "Check your current credits balance. Credits are used for persona interviews and campaign execution.",
    inputSchema: GetCreditsBalanceSchema,
    annotations: {
      title: "Get Credits Balance",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_x402_discovery",
    description: "Get x402 payment discovery information. Returns which endpoints accept crypto payments (USDC on Base), wallet address, pricing, and facilitator details.",
    inputSchema: GetX402DiscoverySchema,
    annotations: {
      title: "Get x402 Payment Info",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  // ============================================
  // WEB RESEARCH TOOLS (Firecrawl integration)
  // ============================================
  {
    name: "sociologic_scrape_url",
    description: "Scrape content from a URL. Returns markdown, HTML, or links from a webpage. Useful for researching companies, products, or topics to enrich persona interviews. Costs vary based on page complexity.",
    inputSchema: ScrapeUrlSchema,
    annotations: {
      title: "Scrape URL",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_search_web",
    description: "Search the web and return scraped results. Useful for gathering information about topics, competitors, or market research to inform persona interviews.",
    inputSchema: SearchWebSchema,
    annotations: {
      title: "Search Web",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_research_topic",
    description: "Research a topic and gather sources for persona enrichment. Returns summarized content from multiple web sources about a specific topic, ideal for building context before persona interviews.",
    inputSchema: ResearchTopicSchema,
    annotations: {
      title: "Research Topic",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "sociologic_get_company_info",
    description: "Get information about a company from their website. Returns company name, description, and main content. Useful for preparing brand affinity questions in persona interviews.",
    inputSchema: GetCompanyInfoSchema,
    annotations: {
      title: "Get Company Info",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
] as const;

export type ToolName = typeof TOOL_DEFINITIONS[number]["name"];
