# Contributing to Signal Relay

Thank you for your interest in contributing to Signal Relay! This document provides guidelines for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something together.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. **Open an issue** with the `enhancement` label
2. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative approaches you've considered

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm run typecheck`
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## Development Setup

### Prerequisites

- Node.js v18+
- npm or yarn
- Cloudflare account (for deployment testing)

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/signal-relay.git
cd signal-relay

# Install dependencies
npm install

# Start local dev server
npm run dev

# Run type checking
npm run typecheck
```

### Testing Locally

```bash
# Test with curl
curl -X POST http://localhost:8787/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add types to function parameters and return values

### Formatting

- Use 2-space indentation
- Use semicolons
- Use double quotes for strings
- Keep lines under 100 characters

### Comments

- Write self-documenting code when possible
- Add comments for non-obvious logic
- Use JSDoc for public functions

### Example

```typescript
/**
 * Validates and parses MCP request parameters.
 * Throws a clean error message if validation fails.
 */
function safeParseArgs<T extends z.ZodSchema>(
  schema: T,
  args: unknown
): z.infer<T> {
  const result = schema.safeParse(args);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
      return `${path}${err.message}`;
    });
    throw new Error(`Invalid parameters: ${errors.join(", ")}`);
  }

  return result.data;
}
```

## Project Structure

```
signal-relay/
├── src/
│   ├── index.ts        # Main entry point, MCP handler
│   ├── api-client.ts   # REST API wrapper
│   └── tools.ts        # Zod schemas and tool definitions
├── wrangler.toml       # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Cloudflare Worker entry, JSON-RPC handling, routing |
| `src/api-client.ts` | HTTP client for SocioLogic API |
| `src/tools.ts` | MCP tool definitions and Zod validation schemas |

## Adding a New Tool

1. **Define the schema** in `src/tools.ts`:

```typescript
export const MyNewToolSchema = z.object({
  param1: z.string().describe("Description of param1"),
  param2: z.number().optional().describe("Optional param2"),
});
```

2. **Add to TOOL_DEFINITIONS** in `src/tools.ts`:

```typescript
{
  name: "sociologic_my_new_tool",
  description: "What this tool does",
  inputSchema: MyNewToolSchema,
}
```

3. **Add API client method** in `src/api-client.ts`:

```typescript
async myNewTool(params: { param1: string; param2?: number }) {
  return this.request<ResponseType>("POST", "/api/v1/endpoint", params);
}
```

4. **Handle in executeTool** in `src/index.ts`:

```typescript
case "sociologic_my_new_tool": {
  const parsed = safeParseArgs(MyNewToolSchema, args);
  return this.client.myNewTool(parsed);
}
```

5. **Export the schema** in `src/tools.ts` and import in `src/index.ts`

## Commit Messages

Use clear, descriptive commit messages:

- `feat: Add new persona filtering tool`
- `fix: Handle timeout in campaign execution`
- `docs: Update README with new examples`
- `refactor: Simplify error handling logic`
- `chore: Update dependencies`

## Questions?

- Open an issue for general questions
- Email support@sociologic.ai for account-related questions
- Check [sociologic.ai/docs](https://sociologic.ai/docs) for API documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
