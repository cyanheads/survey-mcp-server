/**
 * @fileoverview Tool for resuming an incomplete survey session.
 * Restores session context and provides updated question suggestions.
 * @module src/mcp-server/tools/definitions/survey-resume-session.tool
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

const TOOL_NAME = 'survey_resume_session';
const TOOL_TITLE = 'Resume Survey Session';
const TOOL_DESCRIPTION =
  'Resume an incomplete survey session. Restores the full survey context, lists previously answered questions, provides updated question suggestions, and reports time elapsed since last activity.';

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
      .describe('Survey session identifier to resume'),
  })
  .describe('Parameters for resuming a survey session.');

const OutputSchema = z
  .object({
    resumed: z.boolean().describe('Whether resumption was successful'),
    sessionId: z.string().describe('The resumed session identifier'),
    survey: z
      .object({
        id: z.string().describe('Survey identifier'),
        title: z.string().describe('Survey title'),
        totalQuestions: z.number().int().describe('Total number of questions'),
      })
      .describe('Survey information'),
    lastActivity: z
      .string()
      .datetime()
      .describe('Timestamp of last activity before resumption'),
    elapsedTimeSinceLastActivity: z
      .string()
      .describe('Human-readable time elapsed since last activity'),
    progress: z
      .object({
        percentComplete: z
          .number()
          .min(0)
          .max(100)
          .describe('Percentage of survey completed'),
        answeredQuestions: z
          .number()
          .int()
          .describe('Number of questions answered'),
        requiredRemaining: z
          .number()
          .int()
          .describe('Number of required questions remaining'),
      })
      .describe('Current progress'),
    answeredQuestions: z
      .array(
        z.object({
          id: z.string().describe('Question identifier'),
          text: z.string().describe('Question text'),
          answer: z.unknown().describe("Participant's answer"),
        }),
      )
      .describe('Questions that have already been answered'),
    nextSuggestedQuestions: z
      .array(EnrichedQuestionSchema)
      .describe('Updated list of 3-5 suggested next questions'),
    guidanceForLLM: z
      .string()
      .describe('Guidance on how to continue the resumed survey'),
  })
  .describe('Survey session resumption result.');

type ResumeSessionInput = z.infer<typeof InputSchema>;
type ResumeSessionResponse = z.infer<typeof OutputSchema>;

async function resumeSessionLogic(
  input: ResumeSessionInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ResumeSessionResponse> {
  logger.debug('Resuming survey session', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.resumeSession(input.sessionId, tenantId);

  logger.info('Resumed survey session', {
    ...appContext,
    sessionId: result.session.sessionId,
    progress: result.session.progress.percentComplete,
  });

  return {
    resumed: true,
    sessionId: result.session.sessionId,
    survey: {
      id: result.survey.id,
      title: result.survey.metadata.title,
      totalQuestions: result.survey.questions.length,
    },
    lastActivity: result.session.lastActivityAt,
    elapsedTimeSinceLastActivity: result.elapsedTimeSinceLastActivity,
    progress: {
      percentComplete: result.session.progress.percentComplete,
      answeredQuestions: result.session.progress.answeredQuestions,
      requiredRemaining: result.session.progress.requiredRemaining,
    },
    answeredQuestions: result.answeredQuestions,
    nextSuggestedQuestions: result.nextSuggestedQuestions,
    guidanceForLLM: `Welcome the participant back warmly. Acknowledge the time gap (${result.elapsedTimeSinceLastActivity}) and recap their progress (${result.session.progress.percentComplete}% complete). Pick up the conversation naturally from where they left off.`,
  };
}

function responseFormatter(result: ResumeSessionResponse): ContentBlock[] {
  const header = `📋 Survey Session Resumed: ${result.survey.title}`;
  const sessionInfo = `Session ID: ${result.sessionId}`;
  const elapsed = `Time Since Last Activity: ${result.elapsedTimeSinceLastActivity}`;
  const progress = `Progress: ${result.progress.percentComplete}% (${result.progress.answeredQuestions}/${result.survey.totalQuestions} questions)`;
  const remaining = `Required Remaining: ${result.progress.requiredRemaining}`;

  const answered = result.answeredQuestions.length
    ? `\nPreviously Answered:\n${result.answeredQuestions.map((q) => `• ${q.text}`).join('\n')}`
    : '';

  const suggested = result.nextSuggestedQuestions.length
    ? `\nNext Suggested Questions:\n${result.nextSuggestedQuestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`
    : '';

  const parts = [
    header,
    sessionInfo,
    elapsed,
    progress,
    remaining,
    answered,
    suggested,
  ].filter(Boolean);

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyResumeSessionTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:session:write'], resumeSessionLogic),
  responseFormatter,
};
