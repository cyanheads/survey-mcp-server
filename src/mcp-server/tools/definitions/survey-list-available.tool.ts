/**
 * @fileoverview Tool for listing available survey definitions.
 * Allows LLMs to discover surveys that can be started with participants.
 * @module src/mcp-server/tools/definitions/survey-list-available.tool
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
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_list_available';
const TOOL_TITLE = 'List Available Surveys';
const TOOL_DESCRIPTION =
  'Discover available surveys that can be started with participants. Returns survey metadata including title, description, estimated duration, and question count.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Optional tenant identifier for multi-tenant scenarios. If not provided, uses context tenant.',
      ),
  })
  .describe('Parameters for listing available surveys.');

const OutputSchema = z
  .object({
    surveys: z
      .array(
        z.object({
          id: z.string().describe('Unique survey identifier'),
          title: z.string().describe('Survey title'),
          description: z.string().describe('Survey description'),
          estimatedDuration: z
            .string()
            .optional()
            .describe('Estimated completion time'),
          questionCount: z.number().int().describe('Total number of questions'),
        }),
      )
      .describe('List of available surveys'),
    count: z.number().int().describe('Total number of surveys available'),
  })
  .describe('List of available surveys response.');

type SurveyListInput = z.infer<typeof InputSchema>;
type SurveyListResponse = z.infer<typeof OutputSchema>;

async function surveyListLogic(
  input: SurveyListInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<SurveyListResponse> {
  logger.debug('Listing available surveys', appContext);

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);
  const tenantId = input.tenantId || appContext.tenantId;
  if (!tenantId) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Tenant ID is required for this operation',
      { operation: TOOL_NAME },
    );
  }

  const surveys = await surveyService.listAvailableSurveys(tenantId);

  logger.info('Listed available surveys', {
    ...appContext,
    surveyCount: surveys.length,
  });

  return {
    surveys,
    count: surveys.length,
  };
}

function responseFormatter(result: SurveyListResponse): ContentBlock[] {
  const header = `📋 Available Surveys (${result.count})`;

  if (result.count === 0) {
    return [
      {
        type: 'text',
        text: `${header}\n\nNo surveys are currently available. Check back later!`,
      },
    ];
  }

  const surveyList = result.surveys
    .map((s, index) => {
      const duration = s.estimatedDuration ? `⏱️  ${s.estimatedDuration}` : '';
      const questions = `📝 ${s.questionCount} question${s.questionCount !== 1 ? 's' : ''}`;

      return [
        `${index + 1}. **${s.title}**`,
        `   ID: \`${s.id}\``,
        `   ${s.description}`,
        duration && questions
          ? `   ${duration} | ${questions}`
          : duration || questions,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const footer = `\n\n💡 Use survey_start_session with the survey ID to begin!`;

  return [
    {
      type: 'text',
      text: `${header}\n\n${surveyList}${footer}`,
    },
  ];
}

export const surveyListAvailableTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:list:read'], surveyListLogic),
  responseFormatter,
};
