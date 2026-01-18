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
    id: z.string(),
    text: z.string().min(1).max(1000),
    type: z.enum(["open", "scale", "multiple_choice"]).default("open"),
    required: z.boolean().default(true),
    options: z.array(z.string()).optional(),
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
    subjectName: z.string().min(1).max(200),
    subjectDescription: z.string().min(50).max(2000),
    currentChallenge: z.string().min(20).max(1000),
    areasToExplore: z.array(z.string().max(500)).max(10).optional(),
    knownIssues: z.array(z.string().max(500)).max(10).optional(),
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
// TOOL DEFINITIONS (for MCP)
// ============================================

export const TOOL_DEFINITIONS = [
  {
    name: "sociologic_list_personas",
    description: "List available synthetic personas from the SocioLogic marketplace or your private collection. Use this to discover personas for interviews or campaigns.",
    inputSchema: ListPersonasSchema,
  },
  {
    name: "sociologic_get_persona",
    description: "Get detailed information about a specific persona including demographics, psychographics, and behavioral traits.",
    inputSchema: GetPersonaSchema,
  },
  {
    name: "sociologic_create_persona",
    description: "Create a new synthetic persona from a natural language description. The AI will generate a high-fidelity persona with consistent traits.",
    inputSchema: CreatePersonaSchema,
  },
  {
    name: "sociologic_interview_persona",
    description: "Conduct an adversarial interview with a synthetic persona. Personas are prompted to challenge ideas and reveal unknown unknowns. Supports ongoing conversations.",
    inputSchema: InterviewPersonaSchema,
  },
  {
    name: "sociologic_get_persona_memories",
    description: "Retrieve a persona's semantic memories. Memories are vector-embedded learnings from past interactions that inform future responses.",
    inputSchema: GetPersonaMemoriesSchema,
  },
  {
    name: "sociologic_list_campaigns",
    description: "List your research campaigns. Campaigns are structured multi-persona interview sessions with defined questions.",
    inputSchema: ListCampaignsSchema,
  },
  {
    name: "sociologic_get_campaign",
    description: "Get detailed information about a specific campaign including status, personas, questions, and interview results.",
    inputSchema: GetCampaignSchema,
  },
  {
    name: "sociologic_create_campaign",
    description: "Create a new research campaign. Define questions and either generate new personas or use existing ones. Campaigns enable systematic multi-persona research.",
    inputSchema: CreateCampaignSchema,
  },
  {
    name: "sociologic_execute_campaign",
    description: "Execute a draft campaign. This triggers background interviews with all personas and generates a research report. Long-running operation.",
    inputSchema: ExecuteCampaignSchema,
  },
  {
    name: "sociologic_export_campaign",
    description: "Export a completed campaign's results as PDF or JSON. PDF includes executive summary, persona responses, and synthesized findings.",
    inputSchema: ExportCampaignSchema,
  },
  {
    name: "sociologic_list_focus_groups",
    description: "List your focus groups. Focus groups are collections of personas for cohort-based research.",
    inputSchema: ListFocusGroupsSchema,
  },
  {
    name: "sociologic_get_focus_group",
    description: "Get detailed information about a focus group including its member personas.",
    inputSchema: GetFocusGroupSchema,
  },
  {
    name: "sociologic_create_focus_group",
    description: "Create a new focus group to organize personas for cohort-based research.",
    inputSchema: CreateFocusGroupSchema,
  },
  {
    name: "sociologic_add_personas_to_focus_group",
    description: "Add one or more personas to an existing focus group.",
    inputSchema: AddPersonasToFocusGroupSchema,
  },
  {
    name: "sociologic_get_credits_balance",
    description: "Check your current credits balance. Credits are used for persona interviews and campaign execution.",
    inputSchema: GetCreditsBalanceSchema,
  },
] as const;

export type ToolName = typeof TOOL_DEFINITIONS[number]["name"];
