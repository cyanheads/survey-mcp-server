/**
 * @fileoverview Tool for finalizing a completed survey session.
 * Verifies all required questions are answered and marks the session as complete.
 * @module src/mcp-server/tools/definitions/survey-complete-session.tool
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
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_complete_session';
const TOOL_TITLE = 'Complete Survey Session';
const TOOL_DESCRIPTION =
  'Finalize a survey session after all required questions have been answered. Validates completion eligibility, marks the session as complete, and returns a summary of the session including duration and total questions answered.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    sessionId: z
      .string()
      .min(1)
      .describe('Survey session identifier to complete'),
  })
  .describe('Parameters for completing a survey session.');

const OutputSchema = z
  .object({
    success: z.boolean().describe('Whether completion was successful'),
    sessionId: z.string().describe('The completed session identifier'),
    completedAt: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp of completion'),
    summary: z
      .object({
        totalQuestions: z
          .number()
          .int()
          .describe('Total number of questions in survey'),
        answeredQuestions: z
          .number()
          .int()
          .describe('Number of questions answered'),
        duration: z.string().describe('Time taken to complete the survey'),
      })
      .describe('Survey completion summary'),
    message: z
      .string()
      .describe('Message to display to the participant or LLM'),
  })
  .describe('Survey completion result.');

type CompleteSessionInput = z.infer<typeof InputSchema>;
type CompleteSessionResponse = z.infer<typeof OutputSchema>;

async function completeSessionLogic(
  input: CompleteSessionInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<CompleteSessionResponse> {
  logger.debug('Completing survey session', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.completeSession(input.sessionId, tenantId);

  logger.info('Completed survey session', {
    ...appContext,
    sessionId: result.session.sessionId,
    duration: result.summary.duration,
  });

  return {
    success: result.success,
    sessionId: result.session.sessionId,
    completedAt: result.session.completedAt || new Date().toISOString(),
    summary: result.summary,
    message: 'Survey completed successfully! Thank you for your participation.',
  };
}

function responseFormatter(result: CompleteSessionResponse): ContentBlock[] {
  const header = '🎉 Survey Completed Successfully!';
  const completedTime = new Date(result.completedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const sessionInfo = `\n**Session ID:** \`${result.sessionId}\``;
  const timestamp = `**Completed:** ${completedTime}`;

  // Visual completion indicator
  const completionBar = `[${'█'.repeat(10)}] 100%`;

  const summary = [
    '\n**Summary:**',
    `${completionBar}`,
    `✅ Questions Answered: ${result.summary.answeredQuestions}/${result.summary.totalQuestions}`,
    `⏱️  Time Spent: ${result.summary.duration}`,
  ].join('\n');

  const thankYou = `\n\n💬 ${result.message}`;

  const nextSteps = `\n\n📊 **What's Next?**
• Your responses have been securely saved
• You can export results using survey_export_results
• Contact support if you need to make changes`;

  const parts = [header, sessionInfo, timestamp, summary, thankYou, nextSteps];

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyCompleteSessionTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:session:write'], completeSessionLogic),
  responseFormatter,
};
