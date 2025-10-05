/**
 * @fileoverview Tool for exporting survey results in CSV or JSON format.
 * Supports filtering by status, date range, and participant IDs.
 * @module src/mcp-server/tools/definitions/survey-export-results.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { SurveyServiceToken } from '@/container/tokens.js';
import { container } from 'tsyringe';
import type { SurveyService } from '@/services/survey/core/SurveyService.js';
import {
  ExportFormatSchema,
  ExportFiltersSchema,
} from '@/services/survey/types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_export_results';
const TOOL_TITLE = 'Export Survey Results';
const TOOL_DESCRIPTION =
  'Export survey response data in CSV or JSON format. Supports filtering by session status, date range, and specific participant IDs. Returns the formatted export data as a string.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    surveyId: z
      .string()
      .min(1)
      .describe('Survey identifier to export results for'),
    format: ExportFormatSchema.describe('Export format (csv or json)'),
    filters: ExportFiltersSchema.optional().describe(
      'Optional filters for session status, date range, or participant IDs',
    ),
  })
  .describe('Parameters for exporting survey results.');

const OutputSchema = z
  .object({
    format: ExportFormatSchema.describe('Export format used'),
    data: z.string().describe('Exported data as a formatted string'),
    recordCount: z
      .number()
      .int()
      .describe('Number of sessions included in export'),
    generatedAt: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp when export was generated'),
  })
  .describe('Survey export result.');

type ExportResultsInput = z.infer<typeof InputSchema>;
type ExportResultsResponse = z.infer<typeof OutputSchema>;

async function exportResultsLogic(
  input: ExportResultsInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ExportResultsResponse> {
  logger.debug('Exporting survey results', appContext);

  const tenantId = appContext.tenantId;
  if (!tenantId) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Tenant ID is required for this operation',
      { operation: TOOL_NAME },
    );
  }

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.exportResults(
    input.surveyId,
    tenantId,
    input.format,
    input.filters,
  );

  logger.info('Exported survey results', {
    ...appContext,
    surveyId: input.surveyId,
    format: result.format,
    recordCount: result.recordCount,
  });

  return {
    format: result.format,
    data: result.data,
    recordCount: result.recordCount,
    generatedAt: result.generatedAt,
  };
}

function responseFormatter(result: ExportResultsResponse): ContentBlock[] {
  const formatEmoji = result.format === 'csv' ? '📊' : '📄';
  const header = `${formatEmoji} Survey Export (${result.format.toUpperCase()})`;

  const generatedTime = new Date(result.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const metadata = [
    `**Records Exported:** ${result.recordCount}`,
    `**Generated:** ${generatedTime}`,
    `**Format:** ${result.format}`,
  ].join('\n');

  // Preview first few lines for CSV, or indicate JSON structure
  let preview: string;
  if (result.format === 'csv') {
    const lines = result.data.split('\n');
    const previewLines = lines.slice(0, 6); // Header + 5 data rows
    preview = `\`\`\`csv\n${previewLines.join('\n')}`;
    if (lines.length > 6) {
      preview += `\n... (${lines.length - 6} more rows)`;
    }
    preview += '\n```';
  } else {
    // For JSON, show formatted preview
    try {
      const parsed = JSON.parse(result.data) as unknown;
      const firstRecord: unknown = Array.isArray(parsed) ? parsed[0] : parsed;
      preview = `\`\`\`json\n${JSON.stringify(firstRecord, null, 2)}`;
      if (Array.isArray(parsed) && parsed.length > 1) {
        preview += `\n... (${parsed.length - 1} more records)`;
      }
      preview += '\n```';
    } catch {
      preview = '(JSON data available in structured output)';
    }
  }

  const usageHint =
    result.format === 'csv'
      ? '\n\n💡 **Tip:** Copy the full CSV data and paste into a spreadsheet application'
      : '\n\n💡 **Tip:** Use the structured output for programmatic access to all records';

  const parts = [header, '', metadata, '', '**Preview:**', preview, usageHint];

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyExportResultsTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:export:read'], exportResultsLogic),
  responseFormatter,
};
