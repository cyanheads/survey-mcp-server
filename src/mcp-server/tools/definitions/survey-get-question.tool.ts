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
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
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
      .describe(
        'Instructions for asking this question based on its current eligibility',
      ),
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

  const tenantId = appContext.tenantId;
  if (!tenantId) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Tenant ID is required for this operation',
      { operation: TOOL_NAME },
    );
  }

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
  const required = q.required ? '[Required]' : '[Optional]';

  // Status indicator
  let statusEmoji = '';
  let statusText = '';
  if (q.alreadyAnswered) {
    statusEmoji = '✅';
    statusText = 'Already Answered';
  } else if (q.currentlyEligible) {
    statusEmoji = '✓';
    statusText = 'Available to Ask';
  } else {
    statusEmoji = '🔒';
    statusText = 'Not Yet Available';
  }

  const header = `${statusEmoji} ${required} Question Details`;
  const questionText = `\n**Question:** ${q.text}`;
  const statusLine = `\n**Status:** ${statusText}`;

  // Show eligibility reason if not available
  const reason = q.eligibilityReason
    ? `\n**Reason:** ${q.eligibilityReason}`
    : '';

  // Show question type and constraints
  let typeInfo = `\n**Type:** ${q.type}`;
  if (q.type === 'multiple-choice' && q.options) {
    const optionsList = q.options
      .slice(0, 5)
      .map((o) => `  • ${o.label}`)
      .join('\n');
    const moreOptions =
      q.options.length > 5 ? `\n  ... and ${q.options.length - 5} more` : '';
    typeInfo += `\n**Options:**\n${optionsList}${moreOptions}`;
  } else if (q.type === 'rating-scale' && q.scale) {
    typeInfo += ` (${q.scale.min} to ${q.scale.max}, step: ${q.scale.step})`;
  }

  // Show validation requirements if any
  let validationInfo = '';
  if (q.validation) {
    const rules: string[] = [];
    if (q.validation.minLength)
      rules.push(`Min length: ${q.validation.minLength}`);
    if (q.validation.maxLength)
      rules.push(`Max length: ${q.validation.maxLength}`);
    if (q.validation.min !== undefined)
      rules.push(`Min value: ${q.validation.min}`);
    if (q.validation.max !== undefined)
      rules.push(`Max value: ${q.validation.max}`);
    if (q.validation.pattern) rules.push(`Pattern: ${q.validation.pattern}`);
    if (rules.length > 0) {
      validationInfo = `\n**Requirements:** ${rules.join(', ')}`;
    }
  }

  // Show conditional dependency if exists
  let conditionalInfo = '';
  if (q.conditional) {
    if ('dependsOn' in q.conditional && 'showIf' in q.conditional) {
      // Simple single condition
      conditionalInfo = `\n**Depends On:** Question ${q.conditional.dependsOn} (show if: ${q.conditional.showIf.join(', ')})`;
    } else if ('operator' in q.conditional && 'conditions' in q.conditional) {
      // Multi-condition
      conditionalInfo = `\n**Conditional Logic:** ${q.conditional.operator} (${q.conditional.conditions.length} conditions)`;
    }
  }

  const parts = [
    header,
    questionText,
    statusLine,
    reason,
    typeInfo,
    validationInfo,
    conditionalInfo,
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
