# Signal Relay - SocioLogic MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

A remote MCP (Model Context Protocol) server that connects AI agents to [SocioLogic's](https://sociologic.ai) synthetic persona platform. Interview realistic customer personas, run multi-persona research campaigns, and export board-ready reports—all through natural conversation.

## Features

- **20 MCP Tools** - Full access to personas, campaigns, focus groups, credits, and web research
- **High-Fidelity Personas** - Synthetic personas with consistent demographics, psychographics, and behavior
- **Semantic Memory** - RAG-powered memory retrieval for persona continuity across conversations
- **Edge Deployed** - Runs on Cloudflare Workers (300+ locations, <50ms latency)
- **Secure** - API key authentication, request validation, no data stored on edge

## Quick Start

### Use the Hosted Server (Recommended)

The fastest way to get started is using our hosted server at `https://mcp.sociologicai.com`.

1. **Get an API key** at [sociologic.ai/dashboard/api-keys](https://sociologic.ai/dashboard/api-keys) (100 free credits on signup)

2. **Configure your MCP client:**

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "sociologic": {
      "transport": "http",
      "url": "https://mcp.sociologicai.com",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

**Claude Code** (`.mcp.json` in your project):
```json
{
  "mcpServers": {
    "sociologic": {
      "transport": "http",
      "url": "https://mcp.sociologicai.com",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

3. **Start chatting!** Ask Claude to interview personas, create campaigns, or explore the marketplace.

## Self-Hosting

Deploy your own instance to Cloudflare Workers:

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/SocioLogicAI/signal-relay.git
cd signal-relay

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Deploy
npx wrangler deploy
```

Your server will be available at `https://sociologic-mcp-server.<your-subdomain>.workers.dev`

### Local Development

```bash
npm run dev
```

Starts a local server at `http://localhost:8787`.

## Available Tools

| Tool | Description |
|------|-------------|
| `sociologic_list_personas` | List synthetic personas from marketplace or private collection |
| `sociologic_get_persona` | Get detailed persona information (demographics, psychographics, traits) |
| `sociologic_create_persona` | Generate a new persona from natural language description |
| `sociologic_interview_persona` | Conduct adversarial interview with a persona |
| `sociologic_get_persona_memories` | Retrieve persona's semantic memories via vector search |
| `sociologic_list_campaigns` | List research campaigns with status and results |
| `sociologic_get_campaign` | Get campaign details including interviews and findings |
| `sociologic_create_campaign` | Create multi-persona research campaign with custom questions |
| `sociologic_execute_campaign` | Execute draft campaign (async background processing) |
| `sociologic_export_campaign` | Export campaign results as PDF or JSON |
| `sociologic_list_focus_groups` | List focus groups for cohort-based research |
| `sociologic_get_focus_group` | Get focus group details with member personas |
| `sociologic_create_focus_group` | Create new focus group to organize personas |
| `sociologic_add_personas_to_focus_group` | Add personas to an existing focus group |
| `sociologic_get_credits_balance` | Check current credits balance and usage |
| `sociologic_scrape_url` | Scrape content from a URL (web research) |
| `sociologic_search_web` | Search the web and scrape results |
| `sociologic_research_topic` | Research a topic with multiple sources |
| `sociologic_get_company_info` | Get company information from a website |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | JSON-RPC 2.0 endpoint for MCP protocol |
| `/health` | GET | Health check (requires API key) |
| `/info` | GET | Server information and available tools |

## Example Usage

### Interview a Persona

```bash
curl -X POST https://mcp.sociologicai.com/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "sociologic_interview_persona",
      "arguments": {
        "slug": "enterprise-buyer",
        "message": "What would make you hesitant to try a new AI product?"
      }
    }
  }'
```

### List Available Personas

```bash
curl -X POST https://mcp.sociologicai.com/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "sociologic_list_personas",
      "arguments": {
        "visibility": "public",
        "per_page": 10
      }
    }
  }'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SOCIOLOGIC_API_URL` | Backend API URL | `https://www.sociologic.ai` |

### wrangler.toml

```toml
[vars]
SOCIOLOGIC_API_URL = "https://www.sociologic.ai"
```

## Security

- **API keys** are passed via `X-API-Key` header or `Authorization: Bearer` header
- **Request size** limited to 1MB to prevent DoS
- **Input validation** via Zod schemas on all tool parameters
- **No data stored** on edge - all data flows through to the SocioLogic API

### Rate Limiting

For production deployments, we recommend enabling Cloudflare's rate limiting:

1. Go to Cloudflare Dashboard > Security > WAF > Rate limiting rules
2. Create a rule: 100 requests per 10 seconds per IP

## Architecture

```
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│                 │      │                     │      │                 │
│   MCP Client    │─────▶│  Cloudflare Worker  │─────▶│  SocioLogic API │
│  (Claude, etc)  │      │   (This Server)     │      │                 │
│                 │◀─────│                     │◀─────│                 │
└─────────────────┘      └─────────────────────┘      └─────────────────┘
        │                         │                          │
        │    MCP Protocol         │    REST API              │
        │    (JSON-RPC 2.0)       │    (HTTPS)               │
        └─────────────────────────┴──────────────────────────┘
```

## Pricing

| Operation | Credits |
|-----------|---------|
| List personas | 1 |
| Get persona | 1 |
| Create persona | 5-50 (by fidelity tier) |
| Interview persona | 1 per message |
| Campaign execution | Varies by size |

**Free tier:** 100 credits on signup. See [sociologic.ai/pricing](https://sociologic.ai/pricing) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [SocioLogic Website](https://sociologic.ai)
- [API Documentation](https://sociologic.ai/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
