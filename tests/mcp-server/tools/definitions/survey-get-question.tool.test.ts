import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyGetQuestionTool } from '@/mcp-server/tools/definitions/survey-get-question.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

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
});
