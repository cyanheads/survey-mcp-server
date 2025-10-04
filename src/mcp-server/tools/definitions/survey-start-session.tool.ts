/**
 * @fileoverview Tool for starting a new survey session with a participant.
 * Loads complete survey context and provides initial suggested questions.
 * @module src/mcp-server/tools/definitions/survey-start-session.tool
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
import { EnrichedQuestionSchema } from '@/services/survey/types.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_start_session';
const TOOL_TITLE = 'Start Survey Session';
const TOOL_DESCRIPTION =
  'Initialize a new survey session for a participant. Returns the complete survey context including all questions with eligibility status and initial suggested questions to ask. The LLM can ask questions in any order that feels natural to the conversation.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    surveyId: z
      .string()
      .min(1)
      .describe('Unique identifier of the survey to start'),
    participantId: z
      .string()
      .min(1)
      .describe('Unique identifier for the participant taking the survey'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe(
        'Optional metadata about the session (e.g., source, userAgent, tags)',
      ),
  })
  .describe('Parameters for starting a new survey session.');

const OutputSchema = z
  .object({
    sessionId: z
      .string()
      .describe('Unique session identifier for this attempt'),
    survey: z
      .object({
        id: z.string().describe('Survey identifier'),
        title: z.string().describe('Survey title'),
        description: z.string().describe('Survey description'),
        totalQuestions: z.number().int().describe('Total number of questions'),
        estimatedDuration: z
          .string()
          .optional()
          .describe('Estimated time to complete'),
      })
      .describe('Survey metadata'),
    allQuestions: z
      .array(EnrichedQuestionSchema)
      .describe(
        'Complete list of all survey questions with current eligibility status',
      ),
    nextSuggestedQuestions: z
      .array(EnrichedQuestionSchema)
      .describe(
        '3-5 suggested questions to ask next (prioritizes required questions)',
      ),
    guidanceForLLM: z
      .string()
      .describe('Instructions for how to conduct the survey naturally'),
  })
  .describe('Survey session initialization response.');

type StartSessionInput = z.infer<typeof InputSchema>;
type StartSessionResponse = z.infer<typeof OutputSchema>;

async function startSessionLogic(
  input: StartSessionInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<StartSessionResponse> {
  logger.debug('Starting survey session', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.startSession(
    input.surveyId,
    input.participantId,
    tenantId,
    input.metadata,
  );

  logger.info('Started survey session', {
    ...appContext,
    sessionId: result.session.sessionId,
    surveyId: input.surveyId,
  });

  return {
    sessionId: result.session.sessionId,
    survey: {
      id: result.survey.id,
      title: result.survey.metadata.title,
      description: result.survey.metadata.description,
      totalQuestions: result.survey.questions.length,
      estimatedDuration: result.survey.metadata.estimatedDuration,
    },
    allQuestions: result.allQuestions,
    nextSuggestedQuestions: result.nextSuggestedQuestions,
    guidanceForLLM:
      "You have the complete survey context. Feel free to ask questions in any order that feels natural to the conversation. The 'nextSuggestedQuestions' array provides a good starting point. Be conversational and adaptive - you can explore topics as they arise. Just make sure to eventually cover all required questions before completing the survey.",
  };
}

function responseFormatter(result: StartSessionResponse): ContentBlock[] {
  const header = `Survey Session Started: ${result.survey.title}`;
  const sessionInfo = `Session ID: ${result.sessionId}`;
  const surveyInfo = `${result.survey.description}`;
  const duration = result.survey.estimatedDuration
    ? `Estimated Duration: ${result.survey.estimatedDuration}`
    : '';
  const questions = `Total Questions: ${result.survey.totalQuestions}`;

  const suggested = result.nextSuggestedQuestions
    .map((q, i) => {
      const req = q.required ? '[Required]' : '[Optional]';
      return `${i + 1}. ${req} ${q.text}`;
    })
    .join('\n');

  const parts = [
    header,
    sessionInfo,
    '',
    surveyInfo,
    duration,
    questions,
    '',
    'Suggested Starting Questions:',
    suggested,
  ].filter(Boolean);

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyStartSessionTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:session:write'], startSessionLogic),
  responseFormatter,
};
