/**
 * @fileoverview Tool for submitting a participant's response to a survey question.
 * Validates the response, updates progress, and returns updated question suggestions.
 * @module src/mcp-server/tools/definitions/survey-submit-response.tool
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
  EligibilityChangeSchema,
  EnrichedQuestionSchema,
  SessionProgressSchema,
  ValidationResultSchema,
} from '@/services/survey/types.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_submit_response';
const TOOL_TITLE = 'Submit Survey Response';
const TOOL_DESCRIPTION =
  "Record a participant's answer to a survey question. Validates the response against question rules, updates session progress, detects eligibility changes for conditional questions, and returns updated question suggestions. If validation fails, provides specific guidance for re-prompting.";

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    sessionId: z.string().min(1).describe('Survey session identifier'),
    questionId: z
      .string()
      .min(1)
      .describe('Question identifier being answered'),
    value: z.unknown().describe("The participant's response value"),
  })
  .describe('Parameters for submitting a survey response.');

const OutputSchema = z
  .object({
    success: z
      .boolean()
      .describe('Whether the response was successfully recorded'),
    validation: ValidationResultSchema.describe('Validation result details'),
    progress: SessionProgressSchema.optional().describe(
      'Updated session progress (only if submission succeeded)',
    ),
    updatedEligibility: z
      .array(EligibilityChangeSchema)
      .optional()
      .describe('Questions whose eligibility changed due to this response'),
    nextSuggestedQuestions: z
      .array(EnrichedQuestionSchema)
      .optional()
      .describe('Updated list of 3-5 suggested next questions'),
    guidanceForLLM: z
      .string()
      .describe('Guidance on how to proceed after this submission'),
  })
  .describe('Response submission result.');

type SubmitResponseInput = z.infer<typeof InputSchema>;
type SubmitResponseResponse = z.infer<typeof OutputSchema>;

async function submitResponseLogic(
  input: SubmitResponseInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<SubmitResponseResponse> {
  logger.debug('Submitting survey response', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.submitResponse(
    input.sessionId,
    input.questionId,
    input.value,
    tenantId,
  );

  if (!result.success) {
    // Validation failed
    const errorMessages = result.validation.errors
      .map((e) => e.message)
      .join('; ');
    return {
      success: false,
      validation: result.validation,
      guidanceForLLM: `The participant's response was invalid: ${errorMessages}. Politely ask them to provide a corrected answer that meets the requirements.`,
    };
  }

  // Success
  const eligibilityChanges = result.updatedEligibility || [];
  const newlyAvailable = eligibilityChanges.filter((c) => c.nowEligible);

  let guidance = `Response recorded successfully. Progress updated to ${result.progress?.percentComplete}%.`;

  if (newlyAvailable.length > 0) {
    const questionIds = newlyAvailable.map((c) => c.questionId).join(', ');
    guidance += ` New conditional questions became available: ${questionIds}.`;
  }

  guidance +=
    " You have multiple questions to choose from - follow the conversation's natural direction.";

  logger.info('Submitted survey response', {
    ...appContext,
    questionId: input.questionId,
    progress: result.progress?.percentComplete,
  });

  return {
    success: true,
    validation: result.validation,
    progress: result.progress,
    updatedEligibility: eligibilityChanges,
    nextSuggestedQuestions: result.nextSuggestedQuestions,
    guidanceForLLM: guidance,
  };
}

function responseFormatter(result: SubmitResponseResponse): ContentBlock[] {
  if (!result.success) {
    const errors = result.validation.errors
      .map((e) => `• ${e.message}`)
      .join('\n');
    return [
      {
        type: 'text',
        text: `❌ Validation Failed\n\n${errors}\n\n💡 Please provide a corrected answer that meets the requirements.`,
      },
    ];
  }

  // Visual progress bar
  const progressPercent = result.progress?.percentComplete || 0;
  const progressBlocks = 10;
  const filledBlocks = Math.round((progressPercent / 100) * progressBlocks);
  const progressBar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(progressBlocks - filledBlocks)}]`;

  const progress = result.progress
    ? `${progressBar} ${result.progress.percentComplete}% (${result.progress.answeredQuestions}/${result.progress.totalQuestions} questions)`
    : '';

  // Newly unlocked questions with details
  const newlyUnlocked =
    result.updatedEligibility && result.updatedEligibility.length > 0
      ? result.updatedEligibility.filter((c) => c.nowEligible)
      : [];

  const newQuestionsSection =
    newlyUnlocked.length > 0
      ? `\n\n🆕 New Questions Unlocked:\n${newlyUnlocked
          .map((change) => {
            const question = result.nextSuggestedQuestions?.find(
              (q) => q.id === change.questionId,
            );
            if (question) {
              const reqTag = question.required ? '[Required]' : '[Optional]';
              const reason = change.reason ? `\n   ${change.reason}` : '';
              return `• ${reqTag} "${question.text}"${reason}`;
            }
            return `• ${change.questionId}${change.reason ? ` - ${change.reason}` : ''}`;
          })
          .join('\n')}`
      : '';

  // Suggested next questions with full details
  const suggested =
    result.nextSuggestedQuestions && result.nextSuggestedQuestions.length > 0
      ? `\n\n📋 Suggested Next Questions:\n${result.nextSuggestedQuestions
          .map((q, i) => {
            const reqTag = q.required ? '[Required]' : '[Optional]';
            const answered = q.alreadyAnswered ? ' ✓' : '';
            const eligibility = !q.currentlyEligible
              ? ` (${q.eligibilityReason || 'Not yet available'})`
              : '';
            return `${i + 1}. ${reqTag} ${q.text}${answered}${eligibility}`;
          })
          .join('\n')}`
      : '';

  const guidance =
    result.progress && result.progress.percentComplete >= 100
      ? '\n\n✅ All questions answered! Ready to complete the survey.'
      : '\n\n💡 Continue the conversation naturally - you can ask any available question!';

  return [
    {
      type: 'text',
      text: `✓ Response Recorded\n\nProgress: ${progress}${newQuestionsSection}${suggested}${guidance}`,
    },
  ];
}

export const surveySubmitResponseTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:response:write'], submitResponseLogic),
  responseFormatter,
};
