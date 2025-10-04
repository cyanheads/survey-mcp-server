import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyResumeSessionTool } from '@/mcp-server/tools/definitions/survey-resume-session.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyResumeSessionTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resumes a session and returns updated context', async () => {
    const now = '2024-01-10T12:00:00.000Z';

    const serviceResponse = {
      session: {
        sessionId: 'sess-99',
        surveyId: 'survey-2',
        surveyVersion: '1.0',
        participantId: 'participant-7',
        tenantId: 'default-tenant',
        status: 'in-progress' as const,
        startedAt: '2024-01-01T00:00:00.000Z',
        lastActivityAt: now,
        completedAt: null,
        metadata: {},
        responses: {
          q1: {
            questionId: 'q1',
            value: 'Because it is great',
            answeredAt: now,
            attemptCount: 1,
          },
        },
        progress: {
          totalQuestions: 3,
          answeredQuestions: 1,
          requiredRemaining: 2,
          percentComplete: 33,
          requiredAnswered: 1,
          estimatedTimeRemaining: '5 minutes',
        },
      },
      survey: {
        id: 'survey-2',
        version: '1.0',
        metadata: {
          title: 'Product Discovery',
          description: 'Understand customer problems',
        },
        questions: [
          {
            id: 'q1',
            type: 'free-form' as const,
            text: 'What challenge are you solving?',
            required: true,
          },
          {
            id: 'q2',
            type: 'multiple-choice' as const,
            text: 'Which features are important?',
            required: true,
          },
          {
            id: 'q3',
            type: 'free-form' as const,
            text: 'Any other remarks?',
            required: false,
          },
        ],
        settings: {},
      },
      answeredQuestions: [
        {
          id: 'q1',
          text: 'What challenge are you solving?',
          answer: 'Because it is great',
        },
      ],
      nextSuggestedQuestions: [
        {
          id: 'q2',
          type: 'multiple-choice' as const,
          text: 'Which features are important?',
          required: true,
          currentlyEligible: true,
          eligibilityReason: 'Required question',
          alreadyAnswered: false,
        },
      ],
      elapsedTimeSinceLastActivity: '30 minutes',
    };

    const { mocks } = setupSurveyServiceMock({
      resumeSession: vi.fn().mockResolvedValue(serviceResponse),
    });

    const context = createRequestContext({});

    const result = await surveyResumeSessionTool.logic(
      { sessionId: 'sess-99' },
      context,
      sdkContext,
    );

    expect(mocks.resumeSession).toHaveBeenCalledWith('sess-99', 'tenant-123');
    expect(result).toMatchObject({
      resumed: true,
      sessionId: 'sess-99',
      survey: {
        id: 'survey-2',
        title: 'Product Discovery',
        totalQuestions: 3,
      },
      lastActivity: now,
      elapsedTimeSinceLastActivity: '30 minutes',
      progress: {
        percentComplete: 33,
        answeredQuestions: 1,
        requiredRemaining: 2,
      },
      answeredQuestions: serviceResponse.answeredQuestions,
      nextSuggestedQuestions: serviceResponse.nextSuggestedQuestions,
    });
    expect(result.guidanceForLLM).toContain(
      'Welcome the participant back warmly',
    );
  });
});
