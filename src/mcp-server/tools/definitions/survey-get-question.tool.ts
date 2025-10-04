/**
 * @fileoverview Tool for retrieving a specific question with current eligibility status.
 * Useful after responses change conditional logic to refresh question availability.
 * @module src/mcp-server/tools/definitions/survey-get-question.tool
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

const TOOL_NAME = 'survey_get_question';
const TOOL_TITLE = 'Get Survey Question';
const TOOL_DESCRIPTION =
  'Retrieve a specific question with its current eligibility status. Use this to check if a question has become available after conditional logic is satisfied by previous responses.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    sessionId: z.string().min(1).describe('Survey session identifier'),
    questionId: z.string().min(1).describe('Question identifier to retrieve'),
  })
  .describe('Parameters for retrieving a specific question.');

const OutputSchema = z
  .object({
    question: EnrichedQuestionSchema.describe(
      'The question with current eligibility information',
    ),
    guidanceForLLM: z
      .string()
      .describe('Guidance on whether and how to ask this question'),
  })
  .describe('Question retrieval response.');

type GetQuestionInput = z.infer<typeof InputSchema>;
type GetQuestionResponse = z.infer<typeof OutputSchema>;

async function getQuestionLogic(
  input: GetQuestionInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<GetQuestionResponse> {
  logger.debug('Getting question details', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const question = await surveyService.getQuestion(
    input.sessionId,
    input.questionId,
    tenantId,
  );

  let guidance: string;
  if (question.alreadyAnswered) {
    guidance =
      'This question has already been answered. You can ask it again to update the response if needed.';
  } else if (question.currentlyEligible) {
    guidance =
      'This question is currently available to ask. Feel free to weave it into the conversation naturally when it makes sense contextually.';
  } else {
    guidance = `This question is not currently available. ${question.eligibilityReason ?? 'Conditional requirements not yet met'}`;
  }

  logger.info('Retrieved question', {
    ...appContext,
    questionId: input.questionId,
    eligible: question.currentlyEligible,
  });

  return {
    question,
    guidanceForLLM: guidance,
  };
}

function responseFormatter(result: GetQuestionResponse): ContentBlock[] {
  const q = result.question;
  const status = q.currentlyEligible ? '✓ Available' : '✗ Not Available';
  const answered = q.alreadyAnswered ? ' (Already Answered)' : '';
  const required = q.required ? '[Required]' : '[Optional]';

  const parts = [
    `${required} ${q.text}`,
    `Status: ${status}${answered}`,
    q.eligibilityReason ? `Reason: ${q.eligibilityReason}` : undefined,
  ].filter(Boolean);

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyGetQuestionTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:question:read'], getQuestionLogic),
  responseFormatter,
};
