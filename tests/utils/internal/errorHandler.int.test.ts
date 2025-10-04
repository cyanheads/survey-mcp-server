/**
 * @fileoverview Integration tests for the ErrorHandler utility.
 * These tests ensure that the error handler correctly classifies, formats,
 * logs, and rethrows errors as expected.
 * @module
 */
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  JsonRpcErrorCode,
  McpError,
} from '../../../src/types-global/errors.js';
import { ErrorHandler } from '../../../src/utils/internal/error-handler/index.js';
import { logger } from '../../../src/utils/internal/logger.js';

// Spy on the actual logger instance's error method
const errorSpy = vi.spyOn(logger, 'error');

// Mock OpenTelemetry
const mockSpan = {
  recordException: vi.fn(),
  setStatus: vi.fn(),
};
const getActiveSpanSpy = vi.spyOn(trace, 'getActiveSpan');

describe('ErrorHandler', () => {
  beforeAll(async () => {
    // Initialize the logger once for all tests in this file
    await logger.initialize('debug');
  });

  afterAll(async () => {
    // Close the logger once after all tests have run
    await logger.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpanSpy.mockReturnValue(mockSpan as any);
  });

  describe('determineErrorCode', () => {
    it('should return the code from an McpError instance', () => {
      const error = new McpError(JsonRpcErrorCode.NotFound, 'Not found');
      expect(ErrorHandler.determineErrorCode(error)).toBe(
        JsonRpcErrorCode.NotFound,
      );
    });

    it('should map standard JS errors correctly', () => {
      expect(
        ErrorHandler.determineErrorCode(new TypeError('Invalid type')),
      ).toBe(JsonRpcErrorCode.ValidationError);
      expect(
        ErrorHandler.determineErrorCode(new ReferenceError('Var not found')),
      ).toBe(JsonRpcErrorCode.InternalError);
    });

    it('should map errors based on message patterns', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('User is not authorized')),
      ).toBe(JsonRpcErrorCode.Unauthorized);
      expect(
        ErrorHandler.determineErrorCode(new Error('This item is missing')),
      ).toBe(JsonRpcErrorCode.NotFound);
      expect(
        ErrorHandler.determineErrorCode(new Error('Request timed out')),
      ).toBe(JsonRpcErrorCode.Timeout);
    });

    it('should default to InternalError for unknown errors', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('A strange error')),
      ).toBe(JsonRpcErrorCode.InternalError);
      expect(ErrorHandler.determineErrorCode('just a string error')).toBe(
        JsonRpcErrorCode.InternalError,
      );
    });
  });

  describe('handleError', () => {
    it('should log an error with the correct structure', () => {
      const error = new Error('Something failed');
      ErrorHandler.handleError(error, {
        operation: 'testOperation',
        context: { requestId: 'test-123' },
        input: { data: 'sample' },
      });

      expect(errorSpy).toHaveBeenCalledOnce();
      const call = errorSpy.mock.calls[0];
      if (!call) throw new Error('errorSpy was not called');
      const [errorMessage, logContext] = call;
      expect(errorMessage).toContain(
        'Error in testOperation: Something failed',
      );
      expect(logContext).toMatchObject({
        requestId: 'test-123',
        operation: 'testOperation',
        input: { data: 'sample' },
        errorCode: JsonRpcErrorCode.InternalError,
      });
    });

    it('should rethrow the error when rethrow: true', () => {
      const error = new Error('Failure');
      expect(() =>
        ErrorHandler.handleError(error, {
          operation: 'rethrowTest',
          rethrow: true,
        }),
      ).toThrow(McpError);
    });

    it('should not rethrow by default', () => {
      const error = new Error('No rethrow');
      // Wrap in a function that does not return the error, to satisfy `.not.toThrow()`
      const action = () => {
        ErrorHandler.handleError(error, { operation: 'noRethrowTest' });
      };
      expect(action).not.toThrow();
    });

    it('should record exception with OpenTelemetry', () => {
      const error = new Error('Telemetry test');
      ErrorHandler.handleError(error, { operation: 'otelTest' });

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Telemetry test',
      });
    });

    it('should use a custom errorMapper if provided', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new Error('Original');
      const finalError = ErrorHandler.handleError(error, {
        operation: 'mapperTest',
        errorMapper: (e) => new CustomError(`Mapped: ${(e as Error).message}`),
      });

      expect(finalError).toBeInstanceOf(CustomError);
      expect(finalError.message).toBe('Mapped: Original');
    });
  });

  describe('formatError', () => {
    it('should format an McpError correctly', () => {
      const error = new McpError(
        JsonRpcErrorCode.ValidationError,
        'Invalid input',
        { field: 'email' },
      );
      const formatted = ErrorHandler.formatError(error);
      expect(formatted).toEqual({
        code: JsonRpcErrorCode.ValidationError,
        message: 'Invalid input',
        data: { field: 'email' },
      });
    });

    it('should format a standard Error correctly', () => {
      const error = new Error('Generic error');
      const formatted = ErrorHandler.formatError(error);
      expect(formatted).toEqual({
        code: JsonRpcErrorCode.InternalError,
        message: 'Generic error',
        data: { errorType: 'Error' },
      });
    });
  });

  describe('tryCatch', () => {
    it('should return the result of a successful async function', async () => {
      const result = await ErrorHandler.tryCatch(
        async () => Promise.resolve('success'),
        { operation: 'tryCatchSuccess' },
      );
      expect(result).toBe('success');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should throw a handled McpError when the async function throws', async () => {
      const originalError = new Error('Async failure');
      await expect(
        ErrorHandler.tryCatch(
          async () => {
            throw originalError;
          },
          { operation: 'tryCatchFailure', context: { requestId: 'try-123' } },
        ),
      ).rejects.toThrow(McpError);

      expect(errorSpy).toHaveBeenCalledOnce();
      const call = errorSpy.mock.calls[0];
      if (!call) throw new Error('errorSpy was not called');
      const [, logContext] = call;
      expect(logContext).toMatchObject({
        requestId: 'try-123',
        operation: 'tryCatchFailure',
        errorCode: JsonRpcErrorCode.InternalError,
      });
    });
  });
});
