import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyGetQuestionTool } from '@/mcp-server/tools/definitions/survey-get-question.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyGetQuestionTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns guidance when question is currently eligible', async () => {
    const question = {
      id: 'q5',
      type: 'free-form' as const,
      text: 'Describe your target audience',
      required: true,
      currentlyEligible: true,
      eligibilityReason: 'Required question',
      alreadyAnswered: false,
    };

    const { mocks } = setupSurveyServiceMock({
      getQuestion: vi.fn().mockResolvedValue(question),
    });

    const result = await surveyGetQuestionTool.logic(
      { sessionId: 'sess-55', questionId: 'q5' },
      createRequestContext({ tenantId: 'tenant-42' }),
      sdkContext,
    );

    expect(mocks.getQuestion).toHaveBeenCalledWith(
      'sess-55',
      'q5',
      'tenant-42',
    );
    expect(result.question).toEqual(question);
    expect(result.guidanceForLLM).toContain('currently available');
  });

  it('tells the LLM the question was already answered', async () => {
    const question = {
      id: 'q7',
      type: 'rating-scale' as const,
      text: 'Rate the onboarding experience',
      required: false,
      currentlyEligible: true,
      alreadyAnswered: true,
      eligibilityReason: 'Previously answered',
    };

    const { mocks } = setupSurveyServiceMock({
      getQuestion: vi.fn().mockResolvedValue(question),
    });

    const result = await surveyGetQuestionTool.logic(
      { sessionId: 'sess-71', questionId: 'q7' },
      createRequestContext({ tenantId: 'tenant-xyz' }),
      sdkContext,
    );

    expect(mocks.getQuestion).toHaveBeenCalledWith(
      'sess-71',
      'q7',
      'tenant-xyz',
    );
    expect(result.guidanceForLLM).toContain('already been answered');
  });

  it('explains when a question is not currently eligible', async () => {
    const question = {
      id: 'q8',
      type: 'free-form' as const,
      text: 'Describe your deployment cadence',
      required: true,
      currentlyEligible: false,
      alreadyAnswered: false,
      eligibilityReason: 'Pending approval',
    };

    const { mocks } = setupSurveyServiceMock({
      getQuestion: vi.fn().mockResolvedValue(question),
    });

    const result = await surveyGetQuestionTool.logic(
      { sessionId: 'sess-88', questionId: 'q8' },
      createTenantlessRequestContext(),
      sdkContext,
    );

    expect(mocks.getQuestion).toHaveBeenCalledWith(
      'sess-88',
      'q8',
      'default-tenant',
    );
    expect(result.guidanceForLLM).toContain('not currently available');
    expect(result.guidanceForLLM).toContain('Pending approval');
  });

  describe('responseFormatter', () => {
    it('summarizes availability and eligibility reason', () => {
      const formatter = surveyGetQuestionTool.responseFormatter!;
      const formatted = formatter({
        question: {
          id: 'q1',
          type: 'multiple-choice',
          text: 'Pick a feature',
          required: false,
          currentlyEligible: false,
          eligibilityReason: 'Waiting on previous response',
          alreadyAnswered: false,
        },
        guidanceForLLM: 'wait',
      });

      const [block] = formatted;
      expect(block?.text).toContain('🔒 [Optional] Question Details');
      expect(block?.text).toContain('**Status:** Not Yet Available');
      expect(block?.text).toContain('**Reason:** Waiting on previous response');
    });

    it('indicates when a question was already answered', () => {
      const formatter = surveyGetQuestionTool.responseFormatter!;
      const formatted = formatter({
        question: {
          id: 'q2',
          type: 'free-form',
          text: 'Tell me more',
          required: true,
          currentlyEligible: true,
          eligibilityReason: 'Required',
          alreadyAnswered: true,
        },
        guidanceForLLM: 'ask again',
      });

      const [block] = formatted;
      expect(block?.text).toContain('✅ [Required] Question Details');
      expect(block?.text).toContain('**Status:** Already Answered');
    });
  });
});
