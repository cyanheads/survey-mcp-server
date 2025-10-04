import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyCompleteSessionTool } from '@/mcp-server/tools/definitions/survey-complete-session.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyCompleteSessionTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes the session and returns summary details', async () => {
    const completedAt = '2024-03-01T15:30:00.000Z';

    const { mocks } = setupSurveyServiceMock({
      completeSession: vi.fn().mockResolvedValue({
        success: true,
        session: {
          sessionId: 'sess-complete',
          surveyId: 'survey-77',
          surveyVersion: '2.0',
          participantId: 'participant-10',
          tenantId: 'tenant-9',
          status: 'completed' as const,
          startedAt: '2024-03-01T15:00:00.000Z',
          lastActivityAt: completedAt,
          completedAt,
          metadata: {},
          responses: {},
          progress: {
            totalQuestions: 6,
            answeredQuestions: 6,
            requiredRemaining: 0,
            percentComplete: 100,
            requiredAnswered: 6,
            estimatedTimeRemaining: '0 minutes',
          },
        },
        summary: {
          totalQuestions: 6,
          answeredQuestions: 6,
          duration: '30 minutes',
        },
      }),
    });

    const result = await surveyCompleteSessionTool.logic(
      { sessionId: 'sess-complete' },
      createRequestContext({ tenantId: 'tenant-9' }),
      sdkContext,
    );

    expect(mocks.completeSession).toHaveBeenCalledWith(
      'sess-complete',
      'tenant-9',
    );
    expect(result).toEqual({
      success: true,
      sessionId: 'sess-complete',
      completedAt,
      summary: {
        totalQuestions: 6,
        answeredQuestions: 6,
        duration: '30 minutes',
      },
      message:
        'Survey completed successfully! Thank you for your participation.',
    });
  });
});
