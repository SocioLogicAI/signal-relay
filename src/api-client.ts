/**
 * SocioLogic API Client
 *
 * Wraps all API calls to the SocioLogic REST API.
 */

export interface SocioLogicConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * x402 Payment configuration for a request
 */
export interface X402PaymentConfig {
  /** Base64-encoded payment payload */
  payload: string;
  /** Payment scheme (usually "exact") */
  scheme?: string;
  /** Network identifier (e.g., "eip155:8453" for Base) */
  network?: string;
}

/**
 * x402 Payment Required response structure
 */
export interface X402PaymentRequired {
  version: string;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
  }>;
}

/**
 * x402 Discovery manifest structure
 */
export interface X402DiscoveryManifest {
  schema_version: string;
  identity: {
    name: string;
    description: string;
    url: string;
  };
  payment: {
    address: string;
    networks: Array<{
      id: string;
      name: string;
      assets: Array<{
        address: string;
        symbol: string;
        decimals: number;
      }>;
    }>;
  };
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    price_usdc: string;
  }>;
  facilitator: {
    url: string;
    provider: string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    /** x402 payment information (present in 402 responses) */
    x402?: X402PaymentRequired;
    /** Legacy credit-based payment fallback */
    fallback?: {
      credits_required: number;
      credits_available: number;
      polar_checkout_url: string;
    };
  };
  meta?: {
    request_id: string;
    credits_used?: number;
    credits_remaining?: number;
    /** Payment method used ("x402" or "credits") */
    payment_method?: "x402" | "credits";
    /** x402 payment ID (if paid with x402) */
    x402_payment_id?: string;
    /** Amount paid in USDC (if paid with x402) */
    amount_usdc?: string;
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
    timeoutMs: number = 30000, // 30 second default timeout
    x402Payment?: X402PaymentConfig
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

    // Add x402 payment header if provided
    if (x402Payment) {
      const paymentHeader = {
        version: "1",
        scheme: x402Payment.scheme || "exact",
        network: x402Payment.network || "eip155:8453",
        payload: x402Payment.payload,
      };
      headers["X-Payment"] = Buffer.from(JSON.stringify(paymentHeader)).toString("base64");
    }

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
        let x402Info: X402PaymentRequired | undefined;
        let fallbackInfo: { credits_required: number; credits_available: number; polar_checkout_url: string } | undefined;

        try {
          const errorBody = await response.json() as ApiResponse<unknown>;
          if (errorBody.error) {
            errorMessage = errorBody.error.message || errorMessage;
            errorCode = errorBody.error.code || errorCode;

            // Extract x402 payment info from 402 responses
            if (response.status === 402) {
              x402Info = errorBody.error.x402;
              fallbackInfo = errorBody.error.fallback;
            }
          }
        } catch {
          // If JSON parsing fails, use the status text
        }

        return {
          error: {
            code: errorCode,
            message: errorMessage,
            x402: x402Info,
            fallback: fallbackInfo,
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

  async createPersona(
    params: {
      description: string;
      fidelity_tier?: string;
    },
    x402Payment?: X402PaymentConfig
  ) {
    return this.request<unknown>("POST", "/api/v1/personas", params, undefined, 30000, x402Payment);
  }

  async interviewPersona(
    slug: string,
    params: {
      message: string;
      conversation_id?: string;
      include_memory?: boolean;
      save_conversation?: boolean;
      stream?: boolean;
    },
    x402Payment?: X402PaymentConfig
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
    }, undefined, 30000, x402Payment);
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

  // ============================================
  // x402 PAYMENT DISCOVERY
  // ============================================

  /**
   * Get x402 payment discovery information
   *
   * Returns information about which endpoints accept x402 payments,
   * the wallet address, supported networks and assets, and pricing.
   */
  async getX402Discovery(): Promise<ApiResponse<X402DiscoveryManifest>> {
    // This endpoint doesn't require authentication
    const url = `${this.apiUrl}/.well-known/x402.json`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: {
              code: "X402_NOT_ENABLED",
              message: "x402 payments are not enabled for this platform",
            },
          };
        }
        return {
          error: {
            code: `HTTP_${response.status}`,
            message: `Failed to fetch x402 discovery: ${response.statusText}`,
          },
        };
      }

      const manifest = await response.json() as X402DiscoveryManifest;
      return { data: manifest };
    } catch (error) {
      return {
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch x402 discovery",
        },
      };
    }
  }

  // ============================================
  // WEB RESEARCH (Firecrawl via x402 buyer mode)
  // ============================================

  /**
   * Scrape content from a URL
   */
  async scrapeUrl(params: {
    url: string;
    formats?: string[];
    only_main_content?: boolean;
  }) {
    return this.request<{
      success: boolean;
      data?: {
        markdown?: string;
        html?: string;
        links?: string[];
        metadata?: {
          title?: string;
          description?: string;
          sourceURL?: string;
        };
      };
      cost_usdc?: number;
    }>("POST", "/api/v1/research/scrape", params, undefined, 60000); // 60s timeout for scraping
  }

  /**
   * Search the web
   */
  async searchWeb(params: {
    query: string;
    limit?: number;
  }) {
    return this.request<{
      success: boolean;
      data?: Array<{
        url: string;
        markdown?: string;
        metadata?: {
          title?: string;
          description?: string;
        };
      }>;
      cost_usdc?: number;
    }>("POST", "/api/v1/research/search", params, undefined, 60000);
  }

  /**
   * Research a topic for persona enrichment
   */
  async researchTopic(params: {
    topic: string;
    source_count?: number;
  }) {
    return this.request<{
      success: boolean;
      topic: string;
      sources?: Array<{
        url: string;
        title?: string;
        content?: string;
      }>;
      cost_usdc?: number;
    }>("POST", "/api/v1/research/topic", params, undefined, 90000); // 90s for multi-source
  }

  /**
   * Get company information from their website
   */
  async getCompanyInfo(params: {
    url: string;
  }) {
    return this.request<{
      success: boolean;
      data?: {
        url: string;
        title?: string;
        description?: string;
        content?: string;
      };
      cost_usdc?: number;
    }>("POST", "/api/v1/research/company", params, undefined, 60000);
  }
}
