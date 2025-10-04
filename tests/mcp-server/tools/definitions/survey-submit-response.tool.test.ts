import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveySubmitResponseTool } from '@/mcp-server/tools/definitions/survey-submit-response.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveySubmitResponseTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns validation guidance when submission fails', async () => {
    const validationResult = {
      valid: false,
      errors: [
        {
          field: 'value',
          message: 'Value is required',
          constraint: 'required',
          expected: true,
          actual: null,
        },
      ],
    };

    const { mocks } = setupSurveyServiceMock({
      submitResponse: vi.fn().mockResolvedValue({
        success: false,
        validation: validationResult,
      }),
    });

    const result = await surveySubmitResponseTool.logic(
      {
        sessionId: 'sess-1',
        questionId: 'q1',
        value: null,
      },
      createRequestContext({ tenantId: 'tenant-1' }),
      sdkContext,
    );

    expect(mocks.submitResponse).toHaveBeenCalledWith(
      'sess-1',
      'q1',
      null,
      'tenant-1',
    );
    expect(result.success).toBe(false);
    expect(result.validation).toEqual(validationResult);
    expect(result.progress).toBeUndefined();
    expect(result.guidanceForLLM).toContain('invalid');
  });

  it('returns progress, eligibility changes, and guidance on success', async () => {
    const validationResult = {
      valid: true,
      errors: [],
    };

    const progress = {
      totalQuestions: 5,
      answeredQuestions: 2,
      requiredRemaining: 1,
      percentComplete: 40,
      requiredAnswered: 1,
      estimatedTimeRemaining: '4 minutes',
    };

    const eligibilityUpdates = [
      {
        questionId: 'q3',
        nowEligible: true,
        reason: 'Depends on q1 answer',
      },
    ];

    const nextSuggestedQuestions = [
      {
        id: 'q2',
        type: 'free-form' as const,
        text: 'Tell me more about your goals',
        required: false,
        currentlyEligible: true,
        eligibilityReason: 'Follow-up available',
        alreadyAnswered: false,
      },
    ];

    const { mocks } = setupSurveyServiceMock({
      submitResponse: vi.fn().mockResolvedValue({
        success: true,
        validation: validationResult,
        progress,
        updatedEligibility: eligibilityUpdates,
        nextSuggestedQuestions,
      }),
    });

    const result = await surveySubmitResponseTool.logic(
      {
        sessionId: 'sess-2',
        questionId: 'q2',
        value: 'It solves scheduling',
      },
      createRequestContext({ tenantId: 'tenant-abc' }),
      sdkContext,
    );

    expect(mocks.submitResponse).toHaveBeenCalledWith(
      'sess-2',
      'q2',
      'It solves scheduling',
      'tenant-abc',
    );
    expect(result.success).toBe(true);
    expect(result.validation).toEqual(validationResult);
    expect(result.progress).toEqual(progress);
    expect(result.updatedEligibility).toEqual(eligibilityUpdates);
    expect(result.nextSuggestedQuestions).toEqual(nextSuggestedQuestions);
    expect(result.guidanceForLLM).toContain('Response recorded successfully');
    expect(result.guidanceForLLM).toContain(
      'New conditional questions became available: q3',
    );
  });
});
