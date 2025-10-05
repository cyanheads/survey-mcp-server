import { afterEach, describe, expect, it, vi } from 'vitest';

import { surveyExportResultsTool } from '@/mcp-server/tools/definitions/survey-export-results.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import {
  createRequestContext,
  createTenantlessRequestContext,
  setupSurveyServiceMock,
} from './test-utils.js';

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

  it('uses the fallback tenant and passes through optional filters', async () => {
    const generatedAt = '2024-05-12T10:00:00.000Z';

    const { mocks } = setupSurveyServiceMock({
      exportResults: vi.fn().mockResolvedValue({
        format: 'json' as const,
        data: '[{"sessionId":"sess-1"}]',
        recordCount: 1,
        generatedAt,
      }),
    });

    const result = await surveyExportResultsTool.logic(
      {
        surveyId: 'survey-22',
        format: 'json',
      },
      createTenantlessRequestContext(),
      sdkContext,
    );

    expect(mocks.exportResults).toHaveBeenCalledWith(
      'survey-22',
      'default-tenant',
      'json',
      undefined,
    );
    expect(result.recordCount).toBe(1);
  });

  describe('responseFormatter', () => {
    it('shows a truncated CSV preview when dataset is large', () => {
      const toLocaleSpy = vi
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('May 13, 2024, 9:00 AM');

      const csv = [
        'sessionId,status',
        'sess-1,completed',
        'sess-2,in-progress',
        'sess-3,completed',
        'sess-4,completed',
        'sess-5,in-progress',
        'sess-6,in-progress',
      ].join('\n');

      const formatter = surveyExportResultsTool.responseFormatter!;
      const formatted = formatter({
        format: 'csv',
        data: csv,
        recordCount: 6,
        generatedAt: '2024-05-13T09:00:00.000Z',
      });

      const [block] = formatted;
      expect(block?.text).toContain('📊 Survey Export (CSV)');
      expect(block?.text).toContain('**Records Exported:** 6');
      expect(block?.text).toContain('more rows');

      toLocaleSpy.mockRestore();
    });

    it('provides a JSON summary when exporting json format', () => {
      const formatter = surveyExportResultsTool.responseFormatter!;
      const formatted = formatter({
        format: 'json',
        data: '[{"sessionId":"sess-1"}]',
        recordCount: 1,
        generatedAt: '2024-05-13T09:00:00.000Z',
      });

      const [block] = formatted;
      expect(block?.text).toContain('📄 Survey Export (JSON)');
      expect(block?.text).toContain(
        '**Tip:** Use the structured output for programmatic access',
      );
    });
  });
});
