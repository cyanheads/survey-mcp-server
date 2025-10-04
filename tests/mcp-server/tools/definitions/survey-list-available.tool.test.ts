import { afterEach, describe, expect, it, vi } from 'vitest';

import { SurveyServiceToken } from '@/container/tokens.js';
import { surveyListAvailableTool } from '@/mcp-server/tools/definitions/survey-list-available.tool.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

import { createRequestContext, setupSurveyServiceMock } from './test-utils.js';

type SurveySummary = {
  id: string;
  title: string;
  description: string;
  estimatedDuration?: string;
  questionCount: number;
};

const sdkContext = {} as SdkContext;

describe('surveyListAvailableTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns available surveys and count using explicit tenant', async () => {
    const surveySummaries: SurveySummary[] = [
      {
        id: 'survey-1',
        title: 'Survey One',
        description: 'First survey description',
        estimatedDuration: '5 minutes',
        questionCount: 10,
      },
      {
        id: 'survey-2',
        title: 'Survey Two',
        description: 'Second survey description',
        questionCount: 7,
      },
    ];

    const { mocks, resolveSpy } = setupSurveyServiceMock({
      listAvailableSurveys: vi.fn().mockResolvedValue(surveySummaries),
    });

    const result = await surveyListAvailableTool.logic(
      { tenantId: 'tenant-input' },
      createRequestContext({ tenantId: 'tenant-context' }),
      sdkContext,
    );

    expect(resolveSpy).toHaveBeenCalledWith(SurveyServiceToken);
    expect(mocks.listAvailableSurveys).toHaveBeenCalledWith('tenant-input');
    expect(result).toEqual({
      surveys: surveySummaries,
      count: surveySummaries.length,
    });
  });

  it('falls back to request context tenant when input tenant omitted', async () => {
    const surveySummaries: SurveySummary[] = [
      {
        id: 'survey-3',
        title: 'Survey Three',
        description: 'Third survey description',
        questionCount: 12,
      },
    ];

    const { mocks } = setupSurveyServiceMock({
      listAvailableSurveys: vi.fn().mockResolvedValue(surveySummaries),
    });

    const context = createRequestContext({ tenantId: 'tenant-from-context' });

    const result = await surveyListAvailableTool.logic({}, context, sdkContext);

    expect(mocks.listAvailableSurveys).toHaveBeenCalledWith(
      'tenant-from-context',
    );
    expect(result.count).toBe(1);
    expect(result.surveys).toEqual(surveySummaries);
  });
});
