import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyGetProgressTool } from '@/mcp-server/tools/definitions/survey-get-progress.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

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

  it('defaults to the fallback tenant when context lacks tenant', async () => {
    const progress = {
      totalQuestions: 2,
      answeredQuestions: 1,
      requiredRemaining: 1,
      percentComplete: 50,
      requiredAnswered: 1,
      estimatedTimeRemaining: '2 minutes',
    };

    const { mocks } = setupSurveyServiceMock({
      getProgress: vi.fn().mockResolvedValue({
        session: {
          sessionId: 'sess-400',
          surveyId: 'survey-7',
          surveyVersion: '1.0',
          participantId: 'participant-9',
          tenantId: 'default-tenant',
          status: 'in-progress' as const,
          startedAt: '2024-03-01T00:00:00.000Z',
          lastActivityAt: '2024-03-01T00:10:00.000Z',
          completedAt: null,
          metadata: {},
          responses: {},
          progress,
        },
        unansweredRequired: [],
        unansweredOptional: [],
        canComplete: false,
        completionBlockers: ['Required question q1 not answered'],
      }),
    });

    const result = await surveyGetProgressTool.logic(
      { sessionId: 'sess-400' },
      createTenantlessRequestContext(),
      sdkContext,
    );

    expect(mocks.getProgress).toHaveBeenCalledWith(
      'sess-400',
      'default-tenant',
    );
    expect(result.progress).toEqual(progress);
  });

  describe('responseFormatter', () => {
    it('formats guidance when the session cannot complete yet', () => {
      const formatter = surveyGetProgressTool.responseFormatter!;
      const formatted = formatter({
        status: 'in-progress',
        progress: {
          totalQuestions: 5,
          answeredQuestions: 3,
          requiredRemaining: 2,
          percentComplete: 60,
          requiredAnswered: 3,
          estimatedTimeRemaining: '4 minutes',
        },
        unansweredRequired: [
          {
            id: 'q1',
            type: 'free-form',
            text: 'Required question',
            required: true,
            currentlyEligible: true,
            eligibilityReason: 'Required',
            alreadyAnswered: false,
          },
        ],
        unansweredOptional: [],
        canComplete: false,
        completionBlockers: ['Required question q1 not answered'],
        guidanceForLLM: 'Continue',
      });

      const [block] = formatted;
      expect(block?.text).toContain('📊 Survey Progress Report');
      expect(block?.text).toContain('[██████░░░░] 60%');
      expect(block?.text).toContain('⚠️  Still need');
      expect(block?.text).toContain('❌ Cannot complete yet');
    });

    it('indicates completion readiness and optional remaining counts', () => {
      const formatter = surveyGetProgressTool.responseFormatter!;
      const formatted = formatter({
        status: 'in-progress',
        progress: {
          totalQuestions: 5,
          answeredQuestions: 5,
          requiredRemaining: 0,
          percentComplete: 100,
          requiredAnswered: 5,
          estimatedTimeRemaining: '0 minutes',
        },
        unansweredRequired: [],
        unansweredOptional: [
          {
            id: 'q9',
            type: 'free-form',
            text: 'Optional follow-up',
            required: false,
            currentlyEligible: true,
            eligibilityReason: 'Optional',
            alreadyAnswered: false,
          },
        ],
        canComplete: true,
        completionBlockers: [],
        guidanceForLLM: 'Complete now',
      });

      const [block] = formatted;
      expect(block?.text).toContain('✅ Survey can be completed now');
      expect(block?.text).toContain('💭 Available');
      expect(block?.text).toContain('[██████████] 100%');
    });
  });
});
