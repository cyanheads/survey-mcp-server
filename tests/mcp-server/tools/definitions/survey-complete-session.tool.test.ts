import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyCompleteSessionTool } from '@/mcp-server/tools/definitions/survey-complete-session.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

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

  it('throws error when no tenant present in context', async () => {
    setupSurveyServiceMock();

    await expect(
      surveyCompleteSessionTool.logic(
        { sessionId: 'sess-missing-completion' },
        createTenantlessRequestContext(),
        sdkContext,
      ),
    ).rejects.toThrow('Tenant ID is required for this operation');
  });

  it('falls back to current timestamp when service omits completedAt', async () => {
    const { mocks } = setupSurveyServiceMock({
      completeSession: vi.fn().mockResolvedValue({
        success: true,
        session: {
          sessionId: 'sess-missing-completion',
          surveyId: 'survey-80',
          surveyVersion: '1.0',
          participantId: 'participant-10',
          tenantId: 'tenant-123',
          status: 'completed' as const,
          startedAt: '2024-03-02T11:00:00.000Z',
          lastActivityAt: '2024-03-02T12:00:00.000Z',
          completedAt: null,
          metadata: {},
          responses: {},
          progress: {
            totalQuestions: 3,
            answeredQuestions: 3,
            requiredRemaining: 0,
            percentComplete: 100,
            requiredAnswered: 3,
            estimatedTimeRemaining: '0 minutes',
          },
        },
        summary: {
          totalQuestions: 3,
          answeredQuestions: 3,
          duration: '1 hour',
        },
      }),
    });

    const before = Date.now();
    const result = await surveyCompleteSessionTool.logic(
      { sessionId: 'sess-missing-completion' },
      createRequestContext(),
      sdkContext,
    );
    const after = Date.now();

    expect(mocks.completeSession).toHaveBeenCalledWith(
      'sess-missing-completion',
      'tenant-123',
    );

    const completedTime = Date.parse(result.completedAt);
    expect(completedTime).toBeGreaterThanOrEqual(before - 10);
    expect(completedTime).toBeLessThanOrEqual(after + 10);
  });

  describe('responseFormatter', () => {
    it('builds a human-friendly summary of completion', () => {
      const toLocaleSpy = vi
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('Mar 1, 2024, 3:30 PM');

      const formatter = surveyCompleteSessionTool.responseFormatter!;
      const formatted = formatter({
        success: true,
        sessionId: 'sess-123',
        completedAt: '2024-03-01T15:30:00.000Z',
        summary: {
          totalQuestions: 6,
          answeredQuestions: 6,
          duration: '30 minutes',
        },
        message: 'Thanks!',
      });

      const [block] = formatted;
      expect(block?.text).toContain('🎉 Survey Completed Successfully');
      expect(block?.text).toContain('**Session ID:** `sess-123`');
      expect(block?.text).toContain('Mar 1, 2024');
      expect(block?.text).toContain('✅ Questions Answered: 6/6');

      toLocaleSpy.mockRestore();
    });
  });
});
