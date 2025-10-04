import { container } from 'tsyringe';
import { vi, type MockInstance } from 'vitest';

import { SurveyServiceToken } from '@/container/tokens.js';
import type { SurveyService } from '@/services/survey/core/SurveyService.js';
import type { RequestContext } from '@/utils/index.js';

export const BASE_REQUEST_CONTEXT: RequestContext = {
  requestId: 'test-request',
  timestamp: '2024-01-01T00:00:00.000Z',
  tenantId: 'tenant-123',
};

export function createRequestContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  const context: RequestContext = {
    ...BASE_REQUEST_CONTEXT,
    ...overrides,
  };

  if ('tenantId' in overrides && overrides.tenantId === undefined) {
    delete context.tenantId;
  }

  return context;
}

type SurveyServiceMethod =
  | 'initialize'
  | 'listAvailableSurveys'
  | 'startSession'
  | 'getQuestion'
  | 'submitResponse'
  | 'getProgress'
  | 'completeSession'
  | 'resumeSession'
  | 'exportResults'
  | 'healthCheck';

type MethodMocks = Record<SurveyServiceMethod, MockInstance>;

export function setupSurveyServiceMock(overrides: Partial<MethodMocks> = {}): {
  mocks: MethodMocks;
  service: SurveyService;
  resolveSpy: MockInstance;
} {
  const mocks = {
    initialize: vi.fn(),
    listAvailableSurveys: vi.fn(),
    startSession: vi.fn(),
    getQuestion: vi.fn(),
    submitResponse: vi.fn(),
    getProgress: vi.fn(),
    completeSession: vi.fn(),
    resumeSession: vi.fn(),
    exportResults: vi.fn(),
    healthCheck: vi.fn(),
    ...overrides,
  } satisfies MethodMocks;

  const service = mocks as unknown as SurveyService;
  const resolveSpy = vi.spyOn(container, 'resolve');

  resolveSpy.mockImplementation((token: unknown) => {
    if (token === SurveyServiceToken) {
      return service;
    }
    throw new Error('Unexpected token resolution in survey tool test');
  });

  return { mocks, service, resolveSpy };
}
