import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveySubmitResponseTool } from '@/mcp-server/tools/definitions/survey-submit-response.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

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

  it('uses fallback tenant when no tenant present in context', async () => {
    const { mocks } = setupSurveyServiceMock({
      submitResponse: vi.fn().mockResolvedValue({
        success: true,
        validation: { valid: true, errors: [] },
        progress: {
          totalQuestions: 1,
          answeredQuestions: 1,
          requiredRemaining: 0,
          percentComplete: 100,
          requiredAnswered: 1,
          estimatedTimeRemaining: '0 minutes',
        },
        updatedEligibility: [],
        nextSuggestedQuestions: [],
      }),
    });

    await surveySubmitResponseTool.logic(
      {
        sessionId: 'sess-tenantless',
        questionId: 'q1',
        value: 'answer',
      },
      createTenantlessRequestContext(),
      sdkContext,
    );

    expect(mocks.submitResponse).toHaveBeenCalledWith(
      'sess-tenantless',
      'q1',
      'answer',
      'default-tenant',
    );
  });

  describe('responseFormatter', () => {
    it('renders validation errors when submission fails', () => {
      const formatter = surveySubmitResponseTool.responseFormatter!;
      const formatted = formatter({
        success: false,
        validation: {
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
        },
        guidanceForLLM: 'retry',
      });

      const [block] = formatted;
      expect(block?.text).toContain('❌ Validation Failed');
      expect(block?.text).toContain('Value is required');
    });

    it('summarizes progress and new questions on success', () => {
      const formatter = surveySubmitResponseTool.responseFormatter!;
      const formatted = formatter({
        success: true,
        validation: { valid: true, errors: [] },
        progress: {
          totalQuestions: 5,
          answeredQuestions: 3,
          requiredRemaining: 2,
          percentComplete: 60,
          requiredAnswered: 3,
          estimatedTimeRemaining: '3 minutes',
        },
        updatedEligibility: [
          { questionId: 'q4', nowEligible: true, reason: 'Follow-up unlocked' },
          { questionId: 'q5', nowEligible: false, reason: 'Still blocked' },
        ],
        nextSuggestedQuestions: [
          {
            id: 'q4',
            type: 'free-form',
            text: 'Tell me more',
            required: false,
            currentlyEligible: true,
            eligibilityReason: 'Newly unlocked',
            alreadyAnswered: false,
          },
        ],
        guidanceForLLM: 'continue',
      });

      const [block] = formatted;
      expect(block?.text).toContain('✓ Response Recorded');
      expect(block?.text).toContain('[██████░░░░] 60%');
      expect(block?.text).toContain('🆕 New Questions Unlocked');
      expect(block?.text).toContain('📋 Suggested Next Questions');
    });
  });
});
