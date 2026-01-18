# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Signal Relay, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to **security@sociologic.ai** with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** assessment
4. **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Assessment**: We'll assess the vulnerability and determine severity within 7 days
- **Resolution**: Critical vulnerabilities will be patched within 14 days
- **Disclosure**: We'll coordinate public disclosure with you after a fix is available

### Scope

This security policy applies to:

- The Signal Relay MCP server code in this repository
- The hosted service at `mcp.sociologicai.com`

Out of scope:

- The SocioLogic backend API (report to security@sociologic.ai separately)
- Third-party dependencies (report to their maintainers)
- Social engineering attacks

### Safe Harbor

We support safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations and data destruction
- Only interact with accounts you own or have explicit permission to test
- Do not exploit vulnerabilities beyond demonstrating them
- Report vulnerabilities promptly and don't disclose publicly before we've addressed them

We will not pursue legal action against researchers who follow these guidelines.

## Security Best Practices

When using Signal Relay:

1. **Protect your API key** - Never commit API keys to version control
2. **Use environment variables** - Store secrets in `.env` files (excluded from git)
3. **Rotate keys regularly** - Generate new API keys periodically
4. **Monitor usage** - Check your credits dashboard for unexpected activity
5. **Use HTTPS only** - All endpoints require HTTPS

## Security Features

Signal Relay implements several security measures:

- **Request size limits** (1MB) to prevent DoS attacks
- **Input validation** via Zod schemas on all parameters
- **Timeout protection** (30s) to prevent hung connections
- **No query parameter auth** - API keys only accepted in headers
- **CORS headers** for browser security
- **No data storage** - Stateless edge proxy, no data persisted

## Contact

For security concerns: security@sociologic.ai

For general support: support@sociologic.ai
