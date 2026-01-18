/**
 * SocioLogic API Client
 *
 * Wraps all API calls to the SocioLogic REST API.
 */

export interface SocioLogicConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    request_id: string;
    credits_used?: number;
    credits_remaining?: number;
    [key: string]: unknown;
  };
}

export class SocioLogicClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: SocioLogicConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>,
    timeoutMs: number = 30000 // 30 second default timeout
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.apiUrl}${path}`);

    // Add query parameters
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    };

    // Setup timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);

      // Handle HTTP errors
      if (!response.ok) {
        // Try to parse error response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = `HTTP_${response.status}`;

        try {
          const errorBody = await response.json() as ApiResponse<unknown>;
          if (errorBody.error) {
            errorMessage = errorBody.error.message || errorMessage;
            errorCode = errorBody.error.code || errorCode;
          }
        } catch {
          // If JSON parsing fails, use the status text
        }

        return {
          error: {
            code: errorCode,
            message: errorMessage,
          },
        };
      }

      const json = await response.json() as ApiResponse<T>;
      return json;
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        return {
          error: {
            code: "TIMEOUT",
            message: `Request timed out after ${timeoutMs}ms`,
          },
        };
      }

      // Handle other network errors
      return {
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network request failed",
        },
      };
    } finally {
      // Always clear timeout to prevent memory leaks
      clearTimeout(timeoutId);
    }
  }

  // ============================================
  // PERSONAS
  // ============================================

  async listPersonas(params: {
    visibility?: "public" | "private" | "all";
    category?: string;
    fidelity_tier?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    return this.request<{
      data: unknown[];
      pagination: {
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      };
    }>("GET", "/api/v1/personas", undefined, params);
  }

  async getPersona(slug: string) {
    return this.request<unknown>("GET", `/api/v1/personas/${encodeURIComponent(slug)}`);
  }

  async createPersona(params: {
    description: string;
    fidelity_tier?: string;
  }) {
    return this.request<unknown>("POST", "/api/v1/personas", params);
  }

  async interviewPersona(
    slug: string,
    params: {
      message: string;
      conversation_id?: string;
      include_memory?: boolean;
      save_conversation?: boolean;
      stream?: boolean;
    }
  ) {
    // Note: Streaming is handled differently - this returns non-streaming response
    return this.request<{
      response: string;
      conversation_id: string;
      persona: {
        id: string;
        slug: string;
        name: string;
      };
      memory_context_used: boolean;
    }>("POST", `/api/v1/personas/${encodeURIComponent(slug)}/interview`, {
      ...params,
      stream: false, // Force non-streaming for MCP
    });
  }

  async getPersonaMemories(
    slug: string,
    params: {
      query?: string;
      limit?: number;
    }
  ) {
    return this.request<{
      memories: Array<{
        id: string;
        content: string;
        similarity?: number;
        created_at: string;
      }>;
    }>("GET", `/api/v1/personas/${encodeURIComponent(slug)}/memories`, undefined, params);
  }

  // ============================================
  // CAMPAIGNS
  // ============================================

  async listCampaigns(params: {
    status?: string;
    limit?: number;
    offset?: number;
    include_interviews?: boolean;
  }) {
    return this.request<unknown[]>("GET", "/api/v1/campaigns", undefined, params);
  }

  async getCampaign(id: string) {
    return this.request<unknown>("GET", `/api/v1/campaigns/${encodeURIComponent(id)}`);
  }

  async createCampaign(params: {
    name: string;
    description?: string;
    questions: Array<{
      id: string;
      text: string;
      type?: string;
      required?: boolean;
      options?: string[];
    }>;
    persona_brief?: string;
    persona_count?: number;
    fidelity_tier?: string;
    existing_persona_ids?: string[];
    focus_group_ids?: string[];
    research_context?: {
      subjectName: string;
      subjectDescription: string;
      currentChallenge: string;
      areasToExplore?: string[];
      knownIssues?: string[];
    };
  }) {
    return this.request<unknown>("POST", "/api/v1/campaigns", params);
  }

  async executeCampaign(id: string) {
    return this.request<{
      status: string;
      message: string;
    }>("POST", `/api/v1/campaigns/${encodeURIComponent(id)}/execute`);
  }

  async exportCampaign(id: string, format: "pdf" | "json" = "pdf") {
    // For PDF, we return the URL rather than the binary
    const encodedId = encodeURIComponent(id);
    if (format === "pdf") {
      return {
        data: {
          export_url: `${this.apiUrl}/api/v1/campaigns/${encodedId}/export?format=pdf`,
          format: "pdf",
          message: "Use the export_url to download the PDF report. Include your API key in the X-API-Key header.",
        },
        meta: { request_id: `mcp_${Date.now()}` },
      };
    }
    return this.request<unknown>("GET", `/api/v1/campaigns/${encodedId}/export`, undefined, { format });
  }

  // ============================================
  // FOCUS GROUPS
  // ============================================

  async listFocusGroups(params: {
    limit?: number;
    offset?: number;
  }) {
    return this.request<unknown[]>("GET", "/api/v1/focus-groups", undefined, params);
  }

  async getFocusGroup(id: string) {
    return this.request<unknown>("GET", `/api/v1/focus-groups/${encodeURIComponent(id)}`);
  }

  async createFocusGroup(params: {
    name: string;
    description?: string;
  }) {
    return this.request<unknown>("POST", "/api/v1/focus-groups", params);
  }

  async addPersonasToFocusGroup(focusGroupId: string, personaIds: string[]) {
    return this.request<unknown>(
      "POST",
      `/api/v1/focus-groups/${encodeURIComponent(focusGroupId)}/personas`,
      { persona_ids: personaIds }
    );
  }

  // ============================================
  // AUTH / CREDITS
  // ============================================

  async getCreditsBalance() {
    return this.request<{
      valid: boolean;
      credits_balance: number;
      credits_used_total: number;
      rate_limit_tier: string;
    }>("GET", "/api/v1/auth/validate");
  }
}
