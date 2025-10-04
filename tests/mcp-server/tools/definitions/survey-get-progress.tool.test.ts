import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyGetProgressTool } from '@/mcp-server/tools/definitions/survey-get-progress.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyGetProgressTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns progress details and guidance when required questions remain', async () => {
    const progress = {
      totalQuestions: 4,
      answeredQuestions: 2,
      requiredRemaining: 1,
      percentComplete: 50,
      requiredAnswered: 2,
      estimatedTimeRemaining: '3 minutes',
    };

    const unansweredRequired = [
      {
        id: 'q9',
        type: 'free-form' as const,
        text: 'Describe your workflow bottlenecks',
        required: true,
        currentlyEligible: true,
        eligibilityReason: 'Required question',
        alreadyAnswered: false,
      },
    ];

    const unansweredOptional = [
      {
        id: 'q10',
        type: 'free-form' as const,
        text: 'Any other feedback?',
        required: false,
        currentlyEligible: true,
        eligibilityReason: 'Optional question',
        alreadyAnswered: false,
      },
    ];

    const { mocks } = setupSurveyServiceMock({
      getProgress: vi.fn().mockResolvedValue({
        session: {
          sessionId: 'sess-200',
          surveyId: 'survey-5',
          surveyVersion: '1.0',
          participantId: 'participant-12',
          tenantId: 'tenant-5',
          status: 'in-progress' as const,
          startedAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z',
          completedAt: null,
          metadata: {},
          responses: {},
          progress,
        },
        unansweredRequired,
        unansweredOptional,
        canComplete: false,
        completionBlockers: ['Required question q9 has not been answered'],
      }),
    });

    const result = await surveyGetProgressTool.logic(
      { sessionId: 'sess-200' },
      createRequestContext({ tenantId: 'tenant-5' }),
      sdkContext,
    );

    expect(mocks.getProgress).toHaveBeenCalledWith('sess-200', 'tenant-5');
    expect(result.status).toBe('in-progress');
    expect(result.progress).toEqual(progress);
    expect(result.unansweredRequired).toEqual(unansweredRequired);
    expect(result.unansweredOptional).toEqual(unansweredOptional);
    expect(result.canComplete).toBe(false);
    expect(result.completionBlockers).toEqual([
      'Required question q9 has not been answered',
    ]);
    expect(result.guidanceForLLM).toContain('Session is 50% complete');
  });

  it('signals completion readiness when no blockers remain', async () => {
    const progress = {
      totalQuestions: 4,
      answeredQuestions: 4,
      requiredRemaining: 0,
      percentComplete: 100,
      requiredAnswered: 3,
      estimatedTimeRemaining: '0 minutes',
    };

    const { mocks } = setupSurveyServiceMock({
      getProgress: vi.fn().mockResolvedValue({
        session: {
          sessionId: 'sess-300',
          surveyId: 'survey-6',
          surveyVersion: '1.1',
          participantId: 'participant-77',
          tenantId: 'tenant-6',
          status: 'in-progress' as const,
          startedAt: '2024-02-01T00:00:00.000Z',
          lastActivityAt: '2024-02-02T00:00:00.000Z',
          completedAt: null,
          metadata: {},
          responses: {},
          progress,
        },
        unansweredRequired: [],
        unansweredOptional: [],
        canComplete: true,
        completionBlockers: [],
      }),
    });

    const result = await surveyGetProgressTool.logic(
      { sessionId: 'sess-300' },
      createRequestContext({ tenantId: 'tenant-6' }),
      sdkContext,
    );

    expect(mocks.getProgress).toHaveBeenCalledWith('sess-300', 'tenant-6');
    expect(result.canComplete).toBe(true);
    expect(result.guidanceForLLM).toContain('survey can be completed');
  });
});
