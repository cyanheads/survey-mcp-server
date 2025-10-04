/**
 * @fileoverview Tool for checking survey session progress and completion status.
 * Returns remaining questions and whether the session can be completed.
 * @module src/mcp-server/tools/definitions/survey-get-progress.tool
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
  EnrichedQuestionSchema,
  SessionProgressSchema,
  SessionStatusSchema,
} from '@/services/survey/types.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

const TOOL_NAME = 'survey_get_progress';
const TOOL_TITLE = 'Get Survey Progress';
const TOOL_DESCRIPTION =
  'Check the current progress and completion status of a survey session. Returns remaining required and optional questions, completion eligibility, and any blockers preventing completion.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

const InputSchema = z
  .object({
    sessionId: z.string().min(1).describe('Survey session identifier'),
  })
  .describe('Parameters for checking survey progress.');

const OutputSchema = z
  .object({
    status: SessionStatusSchema.describe('Current session status'),
    progress: SessionProgressSchema.describe('Progress metrics'),
    unansweredRequired: z
      .array(EnrichedQuestionSchema)
      .describe('Required questions that still need answers'),
    unansweredOptional: z
      .array(EnrichedQuestionSchema)
      .describe('Optional questions that can still be answered'),
    canComplete: z
      .boolean()
      .describe('Whether the session can be completed now'),
    completionBlockers: z
      .array(z.string())
      .describe('Reasons why session cannot be completed (if any)'),
    guidanceForLLM: z
      .string()
      .describe('Guidance on whether to continue or complete the survey'),
  })
  .describe('Survey progress information.');

type GetProgressInput = z.infer<typeof InputSchema>;
type GetProgressResponse = z.infer<typeof OutputSchema>;

async function getProgressLogic(
  input: GetProgressInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<GetProgressResponse> {
  logger.debug('Getting survey progress', appContext);

  const tenantId = appContext.tenantId || 'default-tenant';

  const surveyService = container.resolve<SurveyService>(SurveyServiceToken);

  const result = await surveyService.getProgress(input.sessionId, tenantId);

  let guidance: string;
  if (result.canComplete) {
    guidance =
      'All required questions have been answered. The survey can be completed now using survey_complete_session. You may still ask optional questions if the conversation naturally leads there.';
  } else {
    const remaining = result.unansweredRequired.length;
    guidance = `Session is ${result.session.progress.percentComplete}% complete. There are ${remaining} required question${remaining !== 1 ? 's' : ''} remaining. Continue the conversation naturally and work through the remaining questions.`;
  }

  logger.info('Retrieved survey progress', {
    ...appContext,
    progress: result.session.progress.percentComplete,
    canComplete: result.canComplete,
  });

  return {
    status: result.session.status,
    progress: result.session.progress,
    unansweredRequired: result.unansweredRequired,
    unansweredOptional: result.unansweredOptional,
    canComplete: result.canComplete,
    completionBlockers: result.completionBlockers,
    guidanceForLLM: guidance,
  };
}

function responseFormatter(result: GetProgressResponse): ContentBlock[] {
  const { progress } = result;
  const header = `Survey Progress: ${progress.percentComplete}%`;
  const answered = `Answered: ${progress.answeredQuestions}/${progress.totalQuestions} questions`;

  const requiredStatus = result.unansweredRequired.length
    ? `⚠️  Required Remaining: ${result.unansweredRequired.length}`
    : '✓ All Required Questions Answered';

  const optionalStatus = result.unansweredOptional.length
    ? `Optional Remaining: ${result.unansweredOptional.length}`
    : '';

  const completionStatus = result.canComplete
    ? '✓ Survey can be completed'
    : `❌ Cannot complete yet:\n${result.completionBlockers.map((b) => `  • ${b}`).join('\n')}`;

  const parts = [
    header,
    answered,
    requiredStatus,
    optionalStatus,
    '',
    completionStatus,
  ].filter(Boolean);

  return [{ type: 'text', text: parts.join('\n') }];
}

export const surveyGetProgressTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['survey:progress:read'], getProgressLogic),
  responseFormatter,
};
