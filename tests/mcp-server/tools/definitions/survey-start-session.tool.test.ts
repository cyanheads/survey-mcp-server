import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyStartSessionTool } from '@/mcp-server/tools/definitions/survey-start-session.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyStartSessionTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a session and maps service response to tool output', async () => {
    const now = '2024-01-01T00:00:00.000Z';

    const surveyDefinition = {
      id: 'survey-1',
      version: '1.0',
      metadata: {
        title: 'Customer Feedback',
        description: 'Gather feedback from customers',
        estimatedDuration: '6 minutes',
      },
      questions: [
        {
          id: 'q1',
          type: 'free-form' as const,
          text: 'How was your experience?',
          required: true,
        },
        {
          id: 'q2',
          type: 'rating-scale' as const,
          text: 'Rate your satisfaction from 1-5',
          required: false,
        },
      ],
      settings: {},
    };

    const enrichedQuestions = [
      {
        id: 'q1',
        type: 'free-form' as const,
        text: 'How was your experience?',
        required: true,
        currentlyEligible: true,
        eligibilityReason: 'Core question',
        alreadyAnswered: false,
      },
      {
        id: 'q2',
        type: 'rating-scale' as const,
        text: 'Rate your satisfaction from 1-5',
        required: false,
        currentlyEligible: true,
        eligibilityReason: 'Always available',
        alreadyAnswered: false,
      },
    ];

    const serviceResponse = {
      session: {
        sessionId: 'sess-123',
        surveyId: surveyDefinition.id,
        surveyVersion: surveyDefinition.version,
        participantId: 'participant-42',
        tenantId: 'tenant-context',
        status: 'in-progress' as const,
        startedAt: now,
        lastActivityAt: now,
        completedAt: null,
        metadata: {},
        responses: {},
        progress: {
          totalQuestions: surveyDefinition.questions.length,
          answeredQuestions: 0,
          requiredRemaining: 1,
          percentComplete: 0,
          requiredAnswered: 0,
          estimatedTimeRemaining: surveyDefinition.metadata.estimatedDuration,
        },
      },
      survey: surveyDefinition,
      allQuestions: enrichedQuestions,
      nextSuggestedQuestions: enrichedQuestions.slice(0, 1),
    };

    const { mocks } = setupSurveyServiceMock({
      startSession: vi.fn().mockResolvedValue(serviceResponse),
    });

    const result = await surveyStartSessionTool.logic(
      {
        surveyId: 'survey-1',
        participantId: 'participant-42',
        metadata: { source: 'assistant' },
      },
      createRequestContext({ tenantId: 'tenant-context' }),
      sdkContext,
    );

    expect(mocks.startSession).toHaveBeenCalledWith(
      'survey-1',
      'participant-42',
      'tenant-context',
      { source: 'assistant' },
    );
    expect(result.sessionId).toBe('sess-123');
    expect(result.survey).toEqual({
      id: 'survey-1',
      title: 'Customer Feedback',
      description: 'Gather feedback from customers',
      totalQuestions: 2,
      estimatedDuration: '6 minutes',
    });
    expect(result.allQuestions).toEqual(enrichedQuestions);
    expect(result.nextSuggestedQuestions).toEqual(
      enrichedQuestions.slice(0, 1),
    );
    expect(result.guidanceForLLM).toContain('complete survey context');
  });

  it('passes undefined metadata and defaults tenant when missing', async () => {
    const surveyDefinition = {
      id: 'survey-tenantless',
      version: '1.0',
      metadata: {
        title: 'Tenantless Survey',
        description: 'No metadata provided',
      },
      questions: [],
      settings: {},
    };

    const { mocks } = setupSurveyServiceMock({
      startSession: vi.fn().mockResolvedValue({
        session: {
          sessionId: 'sess-tenantless',
          surveyId: surveyDefinition.id,
          surveyVersion: surveyDefinition.version,
          participantId: 'participant-tenantless',
          tenantId: 'default-tenant',
          status: 'in-progress' as const,
          startedAt: '2024-01-01T00:00:00.000Z',
          lastActivityAt: '2024-01-01T00:00:00.000Z',
          completedAt: null,
          metadata: {},
          responses: {},
          progress: {
            totalQuestions: 0,
            answeredQuestions: 0,
            requiredRemaining: 0,
            percentComplete: 0,
            requiredAnswered: 0,
            estimatedTimeRemaining: '0 minutes',
          },
        },
        survey: surveyDefinition,
        allQuestions: [],
        nextSuggestedQuestions: [],
      }),
    });

    await surveyStartSessionTool.logic(
      {
        surveyId: 'survey-tenantless',
        participantId: 'participant-tenantless',
      },
      createTenantlessRequestContext(),
      sdkContext,
    );

    expect(mocks.startSession).toHaveBeenCalledWith(
      'survey-tenantless',
      'participant-tenantless',
      'default-tenant',
      undefined,
    );
  });

  describe('responseFormatter', () => {
    it('lists suggested questions and survey summary', () => {
      const formatter = surveyStartSessionTool.responseFormatter!;
      const formatted = formatter({
        sessionId: 'sess-1',
        survey: {
          id: 'survey-1',
          title: 'Customer Feedback',
          description: 'Understand the customer experience',
          totalQuestions: 3,
          estimatedDuration: '5 minutes',
        },
        allQuestions: [],
        nextSuggestedQuestions: [
          {
            id: 'q1',
            type: 'free-form',
            text: 'How satisfied are you?',
            required: true,
            currentlyEligible: true,
            eligibilityReason: 'Required',
            alreadyAnswered: false,
          },
        ],
        guidanceForLLM: 'ask nicely',
      });

      const [block] = formatted;
      expect(block?.text).toContain('🎯 Survey Started: Customer Feedback');
      expect(block?.text).toContain('🔑 Getting Started - Choose Your Path');
      expect(block?.text).toContain('[Required] How satisfied are you?');
    });

    it('omits estimated duration when not provided', () => {
      const formatter = surveyStartSessionTool.responseFormatter!;
      const formatted = formatter({
        sessionId: 'sess-2',
        survey: {
          id: 'survey-2',
          title: 'Quick Poll',
          description: 'A fast survey',
          totalQuestions: 1,
        },
        allQuestions: [],
        nextSuggestedQuestions: [],
        guidanceForLLM: 'ask',
      });

      const [block] = formatted;
      expect(block?.text).not.toContain('Estimated Duration');
    });
  });
});
