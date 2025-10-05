/**
 * @fileoverview Survey service orchestrator providing high-level survey operations.
 * Manages survey state, conditional logic, progress tracking, and response validation.
 * @module src/services/survey/core/SurveyService
 */

import { inject, injectable } from 'tsyringe';

import { SurveyProvider } from '@/container/tokens.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/index.js';
import { idGenerator } from '@/utils/security/idGenerator.js';
import type {
  ConditionalLogic,
  EligibilityChange,
  EnrichedQuestion,
  ExportFilters,
  ExportFormat,
  ParticipantSession,
  QuestionDefinition,
  SessionProgress,
  SurveyDefinition,
  SurveySummary,
  ValidationResult,
} from '../types.js';
import type { ISurveyProvider } from './ISurveyProvider.js';
import { validateResponse } from './validation.js';

/**
 * Survey service providing high-level survey operations.
 */
@injectable()
export class SurveyService {
  constructor(@inject(SurveyProvider) private provider: ISurveyProvider) {}

  /**
   * Initialize the survey service.
   */
  async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  /**
   * Get all available surveys as summaries.
   */
  async listAvailableSurveys(tenantId?: string): Promise<SurveySummary[]> {
    const surveys = await this.provider.getAllSurveys(tenantId);

    return surveys.map((survey) => ({
      id: survey.id,
      title: survey.metadata.title,
      description: survey.metadata.description,
      estimatedDuration: survey.metadata.estimatedDuration,
      questionCount: survey.questions.length,
    }));
  }

  /**
   * Start a new survey session.
   */
  async startSession(
    surveyId: string,
    participantId: string,
    tenantId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    session: ParticipantSession;
    survey: SurveyDefinition;
    allQuestions: EnrichedQuestion[];
    nextSuggestedQuestions: EnrichedQuestion[];
  }> {
    // Get survey definition
    const survey = await this.provider.getSurveyById(surveyId, tenantId);
    if (!survey) {
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        `Survey not found: ${surveyId}`,
        { surveyId },
      );
    }

    // Create initial session
    const now = new Date().toISOString();
    const sessionId = `sess_${idGenerator.generate()}`;

    const session: ParticipantSession = {
      sessionId,
      surveyId: survey.id,
      surveyVersion: survey.version,
      participantId,
      tenantId,
      status: 'in-progress',
      startedAt: now,
      lastActivityAt: now,
      completedAt: null,
      metadata: metadata || {},
      responses: {},
      progress: {
        totalQuestions: survey.questions.length,
        answeredQuestions: 0,
        requiredRemaining: survey.questions.filter((q) => q.required).length,
        percentComplete: 0,
      },
    };

    const createdSession = await this.provider.createSession(session);

    // Enrich all questions with eligibility
    const allQuestions = this.enrichQuestionsWithEligibility(
      survey.questions,
      createdSession,
    );

    // Get initial suggested questions (3-5 eligible questions)
    const nextSuggestedQuestions = this.getNextSuggestedQuestions(
      allQuestions,
      3,
      5,
    );

    logger.info('Started survey session', {
      requestId: createdSession.sessionId,
      timestamp: new Date().toISOString(),
      sessionId: createdSession.sessionId,
      surveyId,
      participantId,
      questionCount: survey.questions.length,
    });

    return {
      session: createdSession,
      survey,
      allQuestions,
      nextSuggestedQuestions,
    };
  }

  /**
   * Get a specific question with current eligibility status.
   */
  async getQuestion(
    sessionId: string,
    questionId: string,
    tenantId: string,
  ): Promise<EnrichedQuestion> {
    const session = await this.getSessionOrThrow(sessionId, tenantId);
    const survey = await this.getSurveyOrThrow(session.surveyId, tenantId);

    const question = survey.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        `Question not found: ${questionId}`,
        { questionId, surveyId: survey.id },
      );
    }

    const enrichedQuestions = this.enrichQuestionsWithEligibility(
      [question],
      session,
    );

    const enrichedQuestion = enrichedQuestions[0];
    if (!enrichedQuestion) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'Failed to enrich question',
        { questionId },
      );
    }

    return enrichedQuestion;
  }

  /**
   * Submit a response to a question.
   */
  async submitResponse(
    sessionId: string,
    questionId: string,
    value: unknown,
    tenantId: string,
  ): Promise<{
    success: boolean;
    validation: ValidationResult;
    progress?: SessionProgress;
    updatedEligibility?: EligibilityChange[];
    nextSuggestedQuestions?: EnrichedQuestion[];
  }> {
    const session = await this.getSessionOrThrow(sessionId, tenantId);
    const survey = await this.getSurveyOrThrow(session.surveyId, tenantId);

    // Check session status
    if (session.status === 'completed') {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Cannot submit response to completed session',
        { sessionId },
      );
    }

    const question = survey.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        `Question not found: ${questionId}`,
        { questionId },
      );
    }

    // Check eligibility
    const enrichedQuestion = this.enrichQuestionsWithEligibility(
      [question],
      session,
    )[0];
    if (!enrichedQuestion) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'Failed to enrich question for eligibility check',
        { questionId },
      );
    }
    if (!enrichedQuestion.currentlyEligible) {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        `Question not currently eligible: ${enrichedQuestion.eligibilityReason ?? 'unknown reason'}`,
        { questionId, reason: enrichedQuestion.eligibilityReason },
      );
    }

    // Validate response
    const validationResult = validateResponse(question, value);
    if (!validationResult.valid) {
      return {
        success: false,
        validation: validationResult,
      };
    }

    // Track previous eligibility
    const previousEligibility = new Map(
      survey.questions.map((q) => {
        const enriched = this.enrichQuestionsWithEligibility([q], session)[0];
        return [q.id, enriched?.currentlyEligible || false];
      }),
    );

    // Record response
    const attemptCount = session.responses[questionId]?.attemptCount || 0;
    session.responses[questionId] = {
      questionId,
      value,
      answeredAt: new Date().toISOString(),
      attemptCount: attemptCount + 1,
    };

    // Update progress
    session.lastActivityAt = new Date().toISOString();
    session.progress = this.calculateProgress(survey, session);

    // Save updated session
    const updatedSession = await this.provider.updateSession(session);

    // Detect eligibility changes
    const updatedEligibility: EligibilityChange[] = [];
    survey.questions.forEach((q) => {
      const enriched = this.enrichQuestionsWithEligibility(
        [q],
        updatedSession,
      )[0];
      const wasEligible = previousEligibility.get(q.id) || false;
      const isNowEligible = enriched?.currentlyEligible || false;

      if (wasEligible !== isNowEligible) {
        updatedEligibility.push({
          questionId: q.id,
          nowEligible: isNowEligible,
          reason: enriched?.eligibilityReason,
        });
      }
    });

    // Get next suggested questions
    const allEnrichedQuestions = this.enrichQuestionsWithEligibility(
      survey.questions,
      updatedSession,
    );
    const nextSuggestedQuestions = this.getNextSuggestedQuestions(
      allEnrichedQuestions,
      3,
      5,
    );

    logger.debug('Submitted survey response');

    return {
      success: true,
      validation: validationResult,
      progress: session.progress,
      updatedEligibility,
      nextSuggestedQuestions,
    };
  }

  /**
   * Get session progress and completion status.
   */
  async getProgress(
    sessionId: string,
    tenantId: string,
  ): Promise<{
    session: ParticipantSession;
    unansweredRequired: EnrichedQuestion[];
    unansweredOptional: EnrichedQuestion[];
    canComplete: boolean;
    completionBlockers: string[];
  }> {
    const session = await this.getSessionOrThrow(sessionId, tenantId);
    const survey = await this.getSurveyOrThrow(session.surveyId, tenantId);

    const allQuestions = this.enrichQuestionsWithEligibility(
      survey.questions,
      session,
    );

    const unansweredRequired = allQuestions.filter(
      (q) => q.required && !q.alreadyAnswered && q.currentlyEligible,
    );

    const unansweredOptional = allQuestions.filter(
      (q) => !q.required && !q.alreadyAnswered && q.currentlyEligible,
    );

    const completionBlockers: string[] = [];
    unansweredRequired.forEach((q) => {
      completionBlockers.push(
        `Required question ${q.id} has not been answered`,
      );
    });

    const canComplete = completionBlockers.length === 0;

    return {
      session,
      unansweredRequired,
      unansweredOptional,
      canComplete,
      completionBlockers,
    };
  }

  /**
   * Complete a survey session.
   */
  async completeSession(
    sessionId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    session: ParticipantSession;
    summary: {
      totalQuestions: number;
      answeredQuestions: number;
      duration: string;
    };
  }> {
    const session = await this.getSessionOrThrow(sessionId, tenantId);

    if (session.status === 'completed') {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Session already completed',
        { sessionId },
      );
    }

    // Check if all required questions are answered
    const progressCheck = await this.getProgress(sessionId, tenantId);
    if (!progressCheck.canComplete) {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Cannot complete session: required questions remaining',
        { blockers: progressCheck.completionBlockers },
      );
    }

    // Update session
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.lastActivityAt = session.completedAt;

    const updatedSession = await this.provider.updateSession(session);

    // Calculate duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.completedAt).getTime();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / 60000);

    logger.info('Completed survey session');

    return {
      success: true,
      session: updatedSession,
      summary: {
        totalQuestions: session.progress.totalQuestions,
        answeredQuestions: session.progress.answeredQuestions,
        duration: `${durationMinutes} minutes`,
      },
    };
  }

  /**
   * Resume an existing session.
   */
  async resumeSession(
    sessionId: string,
    tenantId: string,
  ): Promise<{
    session: ParticipantSession;
    survey: SurveyDefinition;
    answeredQuestions: Array<{
      id: string;
      text: string;
      answer: unknown;
    }>;
    nextSuggestedQuestions: EnrichedQuestion[];
    elapsedTimeSinceLastActivity: string;
  }> {
    const session = await this.getSessionOrThrow(sessionId, tenantId);
    const survey = await this.getSurveyOrThrow(session.surveyId, tenantId);

    if (session.status === 'completed') {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Cannot resume completed session',
        { sessionId },
      );
    }

    // Calculate time since last activity
    const lastActivity = new Date(session.lastActivityAt).getTime();
    const now = new Date().getTime();
    const elapsedMs = now - lastActivity;
    const elapsedMinutes = Math.round(elapsedMs / 60000);
    const elapsedTimeSinceLastActivity =
      elapsedMinutes < 60
        ? `${elapsedMinutes} minutes`
        : `${Math.round(elapsedMinutes / 60)} hours`;

    // Get answered questions
    const answeredQuestions = Object.keys(session.responses).map((qid) => {
      const question = survey.questions.find((q) => q.id === qid);
      const response = session.responses[qid];
      return {
        id: qid,
        text: question?.text || 'Unknown question',
        answer: response ? response.value : null,
      };
    });

    // Get next suggested questions
    const allQuestions = this.enrichQuestionsWithEligibility(
      survey.questions,
      session,
    );
    const nextSuggestedQuestions = this.getNextSuggestedQuestions(
      allQuestions,
      3,
      5,
    );

    // Update last activity
    session.lastActivityAt = new Date().toISOString();
    await this.provider.updateSession(session);

    logger.info('Resumed survey session');

    return {
      session,
      survey,
      answeredQuestions,
      nextSuggestedQuestions,
      elapsedTimeSinceLastActivity,
    };
  }

  /**
   * Export survey results.
   */
  async exportResults(
    surveyId: string,
    tenantId: string,
    format: ExportFormat,
    filters?: ExportFilters,
  ): Promise<{
    format: ExportFormat;
    data: string;
    recordCount: number;
    generatedAt: string;
  }> {
    const result = await this.provider.exportResults(
      surveyId,
      tenantId,
      format,
      filters,
    );

    logger.info('Exported survey results');

    return {
      format,
      data: result.data,
      recordCount: result.recordCount,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get survey analytics summary.
   */
  async getAnalytics(
    surveyId: string,
    tenantId: string,
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    inProgressSessions: number;
    abandonedSessions: number;
    completionRate: string;
    averageCompletionTime?: string;
    questionStats: Array<{
      questionId: string;
      questionText: string;
      responseCount: number;
      responseRate: string;
      responseDistribution?: Record<string, number>;
    }>;
  }> {
    // Check if provider supports analytics
    if (!this.provider.getAnalytics) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'Analytics not supported by current provider',
      );
    }

    const survey = await this.getSurveyOrThrow(surveyId, tenantId);
    const analyticsData = await this.provider.getAnalytics(surveyId, tenantId);

    // Calculate completion rate
    const completionRate =
      analyticsData.totalSessions > 0
        ? `${Math.round((analyticsData.completedSessions / analyticsData.totalSessions) * 100)}%`
        : '0%';

    // Enrich question stats with question text and response rates
    const enrichedQuestionStats = analyticsData.questionStats.map((stat) => {
      const question = survey.questions.find((q) => q.id === stat.questionId);
      const responseRate =
        analyticsData.totalSessions > 0
          ? `${Math.round((stat.responseCount / analyticsData.totalSessions) * 100)}%`
          : '0%';

      return {
        ...stat,
        questionText: question?.text || 'Unknown question',
        responseRate,
      };
    });

    logger.info('Generated survey analytics');

    return {
      totalSessions: analyticsData.totalSessions,
      completedSessions: analyticsData.completedSessions,
      inProgressSessions: analyticsData.inProgressSessions,
      abandonedSessions: analyticsData.abandonedSessions,
      completionRate,
      ...(analyticsData.averageCompletionTime && {
        averageCompletionTime: analyticsData.averageCompletionTime,
      }),
      questionStats: enrichedQuestionStats,
    };
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }

  /**
   * Enrich questions with current eligibility information.
   */
  private enrichQuestionsWithEligibility(
    questions: QuestionDefinition[],
    session: ParticipantSession,
  ): EnrichedQuestion[] {
    return questions.map((question) => {
      const alreadyAnswered = !!session.responses[question.id];
      let currentlyEligible = true;
      let eligibilityReason = 'Always available (no conditional logic)';

      // Check conditional logic
      if (question.conditional) {
        const conditionalResult = this.evaluateConditionalLogic(
          question.conditional,
          session,
        );
        currentlyEligible = conditionalResult.eligible;
        eligibilityReason = conditionalResult.reason;
      }

      return {
        ...question,
        currentlyEligible,
        eligibilityReason,
        alreadyAnswered,
      };
    });
  }

  /**
   * Evaluate conditional logic (supports both simple and multi-condition).
   */
  private evaluateConditionalLogic(
    conditional: ConditionalLogic,
    session: ParticipantSession,
  ): { eligible: boolean; reason: string } {
    // Check if it's a simple single condition
    if ('dependsOn' in conditional && 'showIf' in conditional) {
      return this.evaluateSingleCondition(conditional, session);
    }

    // Multi-condition logic
    if ('operator' in conditional && 'conditions' in conditional) {
      const { operator, conditions } = conditional;
      const results = conditions.map(
        (cond: { dependsOn: string; showIf: (string | number | boolean)[] }) =>
          this.evaluateSingleCondition(cond, session),
      );

      if (operator === 'AND') {
        // All conditions must be eligible
        const allEligible = results.every(
          (r: { eligible: boolean; reason: string }) => r.eligible,
        );
        if (allEligible) {
          return {
            eligible: true,
            reason: `All ${conditions.length} conditions satisfied (AND)`,
          };
        }
        const failedReasons = results
          .filter((r: { eligible: boolean; reason: string }) => !r.eligible)
          .map((r: { eligible: boolean; reason: string }) => r.reason);
        return {
          eligible: false,
          reason: `AND condition failed: ${failedReasons.join('; ')}`,
        };
      } else {
        // OR: At least one condition must be eligible
        const anyEligible = results.some(
          (r: { eligible: boolean; reason: string }) => r.eligible,
        );
        if (anyEligible) {
          const satisfiedReasons = results
            .filter((r: { eligible: boolean; reason: string }) => r.eligible)
            .map((r: { eligible: boolean; reason: string }) => r.reason);
          return {
            eligible: true,
            reason: `OR condition satisfied: ${satisfiedReasons[0] ?? 'unknown'}`,
          };
        }
        return {
          eligible: false,
          reason: `OR condition failed: all ${conditions.length} conditions not met`,
        };
      }
    }

    // Fallback (should not happen with proper types)
    return { eligible: true, reason: 'Unknown conditional logic format' };
  }

  /**
   * Evaluate a single condition.
   */
  private evaluateSingleCondition(
    condition: { dependsOn: string; showIf: (string | number | boolean)[] },
    session: ParticipantSession,
  ): { eligible: boolean; reason: string } {
    const { dependsOn, showIf } = condition;
    const dependencyResponse = session.responses[dependsOn];

    if (!dependencyResponse) {
      return {
        eligible: false,
        reason: `Conditional: depends on unanswered question ${dependsOn}`,
      };
    }

    const responseValue = dependencyResponse.value;
    const matchesCondition = showIf.some((val) => val === responseValue);

    if (!matchesCondition) {
      return {
        eligible: false,
        reason: `Conditional: ${dependsOn} answer does not match required values`,
      };
    }

    // Handle different types for template literal
    const valueStr =
      typeof responseValue === 'object' && responseValue !== null
        ? JSON.stringify(responseValue)
        : String(responseValue);
    return {
      eligible: true,
      reason: `Conditional logic satisfied (${dependsOn} = '${valueStr}')`,
    };
  }

  /**
   * Get next suggested questions (eligible, unanswered questions).
   */
  private getNextSuggestedQuestions(
    enrichedQuestions: EnrichedQuestion[],
    min: number,
    max: number,
  ): EnrichedQuestion[] {
    // Filter to eligible, unanswered questions
    const eligible = enrichedQuestions.filter(
      (q) => q.currentlyEligible && !q.alreadyAnswered,
    );

    // Prioritize required questions
    const required = eligible.filter((q) => q.required);
    const optional = eligible.filter((q) => !q.required);

    // Build suggestion list
    const suggestions: EnrichedQuestion[] = [];

    // Add required first
    suggestions.push(...required.slice(0, max));

    // Fill with optional if needed
    if (suggestions.length < min) {
      suggestions.push(...optional.slice(0, max - suggestions.length));
    }

    return suggestions.slice(0, max);
  }

  /**
   * Calculate session progress.
   */
  private calculateProgress(
    survey: SurveyDefinition,
    session: ParticipantSession,
  ): SessionProgress {
    const totalQuestions = survey.questions.length;
    const answeredQuestions = Object.keys(session.responses).length;
    const requiredQuestions = survey.questions.filter((q) => q.required).length;
    const answeredRequired = survey.questions.filter(
      (q) => q.required && session.responses[q.id],
    ).length;

    const percentComplete = Math.round(
      (answeredQuestions / totalQuestions) * 100,
    );

    return {
      totalQuestions,
      answeredQuestions,
      requiredAnswered: answeredRequired,
      requiredRemaining: requiredQuestions - answeredRequired,
      percentComplete,
      estimatedTimeRemaining:
        percentComplete >= 50
          ? `${Math.max(1, Math.round((totalQuestions - answeredQuestions) / 2))} minutes`
          : survey.metadata.estimatedDuration,
    };
  }

  /**
   * Get session or throw error.
   */
  private async getSessionOrThrow(
    sessionId: string,
    tenantId: string,
  ): Promise<ParticipantSession> {
    const session = await this.provider.getSession(sessionId, tenantId);
    if (!session) {
      throw new McpError(JsonRpcErrorCode.NotFound, `Session not found`, {
        sessionId,
        tenantId,
      });
    }
    return session;
  }

  /**
   * Get survey or throw error.
   */
  private async getSurveyOrThrow(
    surveyId: string,
    tenantId: string,
  ): Promise<SurveyDefinition> {
    const survey = await this.provider.getSurveyById(surveyId, tenantId);
    if (!survey) {
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        `Survey not found: ${surveyId}`,
        { surveyId },
      );
    }
    return survey;
  }
}
