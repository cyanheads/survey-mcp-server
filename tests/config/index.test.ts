/**
 * @fileoverview Unit tests for configuration parsing.
 * @module tests/config/index.test
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { JsonRpcErrorCode, McpError } from '../../src/types-global/errors.js';

const originalEnv = { ...process.env };
const originalIsTTY = process.stdout.isTTY;

let parseConfig: typeof import('../../src/config/index.js').parseConfig;

beforeAll(async () => {
  ({ parseConfig } = await import('../../src/config/index.js'));
});

describe('config parsing', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.stdout.isTTY = originalIsTTY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.stdout.isTTY = originalIsTTY;
  });

  it('normalizes aliases, trims arrays, and applies defaults', async () => {
    process.env.MCP_LOG_LEVEL = 'Warning';
    process.env.NODE_ENV = 'prod';
    process.env.MCP_ALLOWED_ORIGINS =
      'https://a.example.com, https://b.example.com ';
    process.env.DEV_MCP_SCOPES = 'scope:read, scope:write';
    process.env.STORAGE_PROVIDER_TYPE = 'fs';
    process.env.MCP_SESSION_MODE = ''; // exercise empty-string sanitization
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_LOG_LEVEL = 'warning';
    process.env.OTEL_TRACES_SAMPLER_ARG = '0.5';
    process.env.OPENROUTER_APP_URL = 'https://app.example.com';
    delete process.env.OPENROUTER_APP_NAME;
    delete process.env.LOGS_DIR;
    process.env.LLM_DEFAULT_TEMPERATURE = '0.7';

    const parsed = parseConfig();

    expect(parsed.logLevel).toBe('warn');
    expect(parsed.environment).toBe('production');
    expect(parsed.mcpSessionMode).toBe('auto');
    expect(parsed.mcpAllowedOrigins).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(parsed.devMcpScopes).toEqual(['scope:read', 'scope:write']);
    expect(parsed.storage.providerType).toBe('filesystem');
    expect(parsed.logsPath).toBe('logs');
    expect(parsed.openTelemetry.enabled).toBe(true);
    expect(parsed.openTelemetry.logLevel).toBe('WARN');
    expect(parsed.openTelemetry.samplingRatio).toBe(0.5);
    expect(parsed.openrouterAppUrl).toBe('https://app.example.com');
    expect(parsed.openrouterAppName).toBe('@cyanheads/survey-mcp-server');
    expect(parsed.llmDefaultTemperature).toBeCloseTo(0.7);
  });

  it('throws a configuration error when validation fails', async () => {
    // Mock console.error BEFORE setting isTTY to suppress output during tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    process.env.MCP_LOG_LEVEL = 'invalid-level';
    process.stdout.isTTY = true;

    let thrown: unknown;
    try {
      parseConfig();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(McpError);
    const mcpError = thrown as McpError;
    expect(mcpError.code).toBe(JsonRpcErrorCode.ConfigurationError);
    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Invalid configuration found. Please check your environment variables.',
      expect.any(Object),
    );

    consoleSpy.mockRestore();
  });
});
