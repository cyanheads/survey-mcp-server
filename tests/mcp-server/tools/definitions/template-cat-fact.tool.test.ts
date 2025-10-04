/**
 * @fileoverview Tests for the template-cat-fact tool.
 * @module tests/mcp-server/tools/definitions/template-cat-fact.tool.test
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { catFactTool } from '../../../../src/mcp-server/tools/definitions/template-cat-fact.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import {
  JsonRpcErrorCode,
  McpError,
} from '../../../../src/types-global/errors.js';

const server = setupServer(
  http.get('https://catfact.ninja/fact', () => {
    return HttpResponse.json({ fact: 'Cats are cool.', length: 13 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('catFactTool', () => {
  const mockSdkContext = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };

  it('should fetch a cat fact and return it', async () => {
    const context = requestContextService.createRequestContext();
    const result = await catFactTool.logic({}, context, mockSdkContext);

    expect(result.fact).toBe('Cats are cool.');
    expect(result.length).toBe(13);
  });

  it('should respect the maxLength parameter in the outbound request', async () => {
    let requestedUrl = '';
    server.use(
      http.get('https://catfact.ninja/fact', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ fact: 'Short fact.', length: 11 });
      }),
    );

    const context = requestContextService.createRequestContext();
    const result = await catFactTool.logic(
      { maxLength: 42 },
      context,
      mockSdkContext,
    );

    expect(requestedUrl).toContain('max_length=42');
    expect(result.requestedMaxLength).toBe(42);
  });

  it('should throw an McpError when the API responds with a failure status', async () => {
    server.use(
      http.get('https://catfact.ninja/fact', () =>
        HttpResponse.text('Service down', { status: 503 }),
      ),
    );

    const context = requestContextService.createRequestContext();
    const promise = catFactTool.logic({}, context, mockSdkContext);

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );

    try {
      await catFactTool.logic({}, context, mockSdkContext);
    } catch (error) {
      const mcpError = error as McpError;
      // fetchWithTimeout throws the McpError, which is what we expect
      expect(mcpError.message).toContain('Fetch failed');
      expect(mcpError.message).toContain('503');
    }
  });

  it('should handle error when response.text() fails during error handling', async () => {
    server.use(
      http.get('https://catfact.ninja/fact', () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }),
    );

    const context = requestContextService.createRequestContext();
    const promise = catFactTool.logic({}, context, mockSdkContext);

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );
  });

  it('should throw an McpError when the API returns unexpected data', async () => {
    server.use(
      http.get('https://catfact.ninja/fact', () =>
        HttpResponse.json({ invalid: true }),
      ),
    );

    const context = requestContextService.createRequestContext();
    const promise = catFactTool.logic({}, context, mockSdkContext);

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );
  });

  it('should format response content including metadata', () => {
    const formatter = catFactTool.responseFormatter;
    expect(formatter).toBeDefined();

    const blocks = formatter!({
      fact: 'Cats sleep for 16 hours a day.',
      length: 30,
      requestedMaxLength: 60,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block).toBeDefined();
    if (!block || block.type !== 'text') {
      throw new Error('Expected text content block');
    }
    expect(block.text).toContain('Cat Fact (length=30, max<=60)');
    expect(block.text).toContain('timestamp=2024-01-01T00:00:00.000Z');
  });
});
