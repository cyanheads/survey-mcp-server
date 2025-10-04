import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyExportResultsTool } from '@/mcp-server/tools/definitions/survey-export-results.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

const sdkContext = {} as SdkContext;

describe('surveyExportResultsTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes the survey service and returns export payload', async () => {
    const generatedAt = '2024-04-15T09:00:00.000Z';
    const csvData = 'sessionId,status\nsess-1,completed\nsess-2,in-progress';

    const { mocks } = setupSurveyServiceMock({
      exportResults: vi.fn().mockResolvedValue({
        format: 'csv' as const,
        data: csvData,
        recordCount: 2,
        generatedAt,
      }),
    });

    const result = await surveyExportResultsTool.logic(
      {
        surveyId: 'survey-12',
        format: 'csv',
        filters: {
          status: 'completed',
          participantIds: ['participant-1'],
        },
      },
      createRequestContext({ tenantId: 'tenant-reporting' }),
      sdkContext,
    );

    expect(mocks.exportResults).toHaveBeenCalledWith(
      'survey-12',
      'tenant-reporting',
      'csv',
      {
        status: 'completed',
        participantIds: ['participant-1'],
      },
    );
    expect(result).toEqual({
      format: 'csv',
      data: csvData,
      recordCount: 2,
      generatedAt,
    });
  });
});
