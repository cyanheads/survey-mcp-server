/**
 * @fileoverview Type definitions and schemas for the Survey MCP Server.
 * Defines survey structures, question types, validation rules, and session state.
 * @module src/services/survey/types
 */

import { z } from 'zod';

/**
 * Supported question types in surveys.
 */
export const QuestionTypeSchema = z.enum([
  'free-form',
  'multiple-choice',
  'multiple-select',
  'rating-scale',
  'email',
  'number',
  'boolean',
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

/**
 * Multiple choice option definition.
 */
export const QuestionOptionSchema = z.object({
  value: z.string().describe('Programmatic value for the option'),
  label: z.string().describe('Human-readable label displayed to users'),
});

export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

/**
 * Rating scale configuration.
 */
export const RatingScaleSchema = z.object({
  min: z.number().int().describe('Minimum rating value'),
  max: z.number().int().describe('Maximum rating value'),
  step: z.number().int().default(1).describe('Step size for rating values'),
});

export type RatingScale = z.infer<typeof RatingScaleSchema>;

/**
 * Conditional logic for question display.
 */
export const ConditionalLogicSchema = z.object({
  dependsOn: z.string().describe('Question ID this condition depends on'),
  showIf: z
    .array(z.union([z.string(), z.number(), z.boolean()]))
    .describe('Values that trigger this question to be shown'),
});

export type ConditionalLogic = z.infer<typeof ConditionalLogicSchema>;

/**
 * Validation rules for question responses.
 */
export const ValidationRulesSchema = z.object({
  required: z.boolean().optional().describe('Whether the field is required'),
  minLength: z.number().int().optional().describe('Minimum text length'),
  maxLength: z.number().int().optional().describe('Maximum text length'),
  pattern: z
    .string()
    .optional()
    .describe('Regex pattern or built-in pattern name (e.g., "email")'),
  min: z.number().optional().describe('Minimum numeric value'),
  max: z.number().optional().describe('Maximum numeric value'),
  integer: z
    .boolean()
    .optional()
    .describe('Require integer values for numbers'),
  minSelections: z
    .number()
    .int()
    .optional()
    .describe('Minimum number of selections (multiple-select)'),
  maxSelections: z
    .number()
    .int()
    .optional()
    .describe('Maximum number of selections (multiple-select)'),
});

export type ValidationRules = z.infer<typeof ValidationRulesSchema>;

/**
 * Survey question definition.
 */
export const QuestionDefinitionSchema = z.object({
  id: z.string().describe('Unique question identifier within the survey'),
  type: QuestionTypeSchema.describe('Question type'),
  text: z.string().describe('Question text displayed to participants'),
  required: z
    .boolean()
    .default(false)
    .describe('Whether this question must be answered'),
  options: z
    .array(QuestionOptionSchema)
    .optional()
    .describe('Options for multiple-choice or multiple-select questions'),
  scale: RatingScaleSchema.optional().describe(
    'Scale configuration for rating-scale questions',
  ),
  conditional: ConditionalLogicSchema.optional().describe(
    'Conditional logic determining when this question is shown',
  ),
  validation: ValidationRulesSchema.optional().describe(
    'Validation rules for responses',
  ),
});

export type QuestionDefinition = z.infer<typeof QuestionDefinitionSchema>;

/**
 * Survey settings and configuration.
 */
export const SurveySettingsSchema = z.object({
  allowSkip: z
    .boolean()
    .default(true)
    .describe('Allow participants to skip optional questions'),
  allowResume: z
    .boolean()
    .default(true)
    .describe('Allow participants to resume incomplete surveys'),
  shuffleQuestions: z
    .boolean()
    .default(false)
    .describe('Randomize question order'),
  maxAttempts: z
    .number()
    .int()
    .optional()
    .describe('Maximum validation attempts per question'),
});

export type SurveySettings = z.infer<typeof SurveySettingsSchema>;

/**
 * Survey metadata.
 */
export const SurveyMetadataSchema = z.object({
  title: z.string().describe('Survey title'),
  description: z.string().describe('Brief description of the survey'),
  estimatedDuration: z
    .string()
    .optional()
    .describe('Estimated time to complete (e.g., "5-7 minutes")'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
});

export type SurveyMetadata = z.infer<typeof SurveyMetadataSchema>;

/**
 * Complete survey definition.
 */
export const SurveyDefinitionSchema = z.object({
  id: z.string().describe('Unique survey identifier'),
  version: z.string().default('1.0').describe('Survey version'),
  metadata: SurveyMetadataSchema.describe('Survey metadata'),
  questions: z
    .array(QuestionDefinitionSchema)
    .min(1)
    .describe('Survey questions'),
  settings: SurveySettingsSchema.default({}).describe('Survey settings'),
});

export type SurveyDefinition = z.infer<typeof SurveyDefinitionSchema>;

/**
 * Question with runtime eligibility information.
 */
export const EnrichedQuestionSchema = QuestionDefinitionSchema.extend({
  currentlyEligible: z
    .boolean()
    .describe('Whether the question is currently available to ask'),
  eligibilityReason: z
    .string()
    .optional()
    .describe('Explanation of current eligibility status'),
  alreadyAnswered: z
    .boolean()
    .optional()
    .describe('Whether this question has already been answered'),
});

export type EnrichedQuestion = z.infer<typeof EnrichedQuestionSchema>;

/**
 * Survey response record.
 */
export const SurveyResponseSchema = z.object({
  questionId: z.string().describe('Question that was answered'),
  value: z.unknown().describe('Response value (type depends on question type)'),
  answeredAt: z.string().datetime().describe('ISO 8601 timestamp of response'),
  attemptCount: z
    .number()
    .int()
    .default(1)
    .describe('Number of validation attempts'),
});

export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;

/**
 * Session progress tracking.
 */
export const SessionProgressSchema = z.object({
  totalQuestions: z.number().int().describe('Total questions in survey'),
  answeredQuestions: z.number().int().describe('Number of questions answered'),
  requiredAnswered: z
    .number()
    .int()
    .optional()
    .describe('Number of required questions answered'),
  requiredRemaining: z
    .number()
    .int()
    .describe('Number of required questions remaining'),
  percentComplete: z
    .number()
    .min(0)
    .max(100)
    .describe('Percentage of survey completed'),
  estimatedTimeRemaining: z
    .string()
    .optional()
    .describe('Estimated time to complete remaining questions'),
});

export type SessionProgress = z.infer<typeof SessionProgressSchema>;

/**
 * Session status enum.
 */
export const SessionStatusSchema = z.enum([
  'in-progress',
  'completed',
  'abandoned',
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Complete participant session state.
 */
export const ParticipantSessionSchema = z.object({
  sessionId: z.string().describe('Unique session identifier'),
  surveyId: z.string().describe('Survey being taken'),
  surveyVersion: z.string().describe('Version of the survey'),
  participantId: z.string().describe('Participant identifier'),
  tenantId: z.string().describe('Tenant identifier for multi-tenancy'),
  status: SessionStatusSchema.describe('Current session status'),
  startedAt: z.string().datetime().describe('Session start timestamp'),
  lastActivityAt: z.string().datetime().describe('Last activity timestamp'),
  completedAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .describe('Completion timestamp'),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe('Additional session metadata'),
  responses: z
    .record(SurveyResponseSchema)
    .describe('Map of questionId to response'),
  progress: SessionProgressSchema.describe('Current progress metrics'),
});

export type ParticipantSession = z.infer<typeof ParticipantSessionSchema>;

/**
 * Validation error detail.
 */
export const ValidationErrorSchema = z.object({
  field: z.string().describe('Field that failed validation'),
  message: z.string().describe('Human-readable error message'),
  constraint: z.string().describe('Validation constraint that was violated'),
  expected: z.unknown().optional().describe('Expected value or format'),
  actual: z.unknown().optional().describe('Actual value provided'),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Validation result.
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean().describe('Whether validation passed'),
  errors: z.array(ValidationErrorSchema).describe('Validation errors if any'),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Eligibility change notification.
 */
export const EligibilityChangeSchema = z.object({
  questionId: z.string().describe('Question whose eligibility changed'),
  nowEligible: z.boolean().describe('New eligibility status'),
  reason: z
    .string()
    .optional()
    .describe('Explanation for the eligibility change'),
});

export type EligibilityChange = z.infer<typeof EligibilityChangeSchema>;

/**
 * Survey summary information.
 */
export const SurveySummarySchema = z.object({
  id: z.string().describe('Survey identifier'),
  title: z.string().describe('Survey title'),
  description: z.string().describe('Survey description'),
  estimatedDuration: z
    .string()
    .optional()
    .describe('Estimated completion time'),
  questionCount: z.number().int().describe('Total number of questions'),
});

export type SurveySummary = z.infer<typeof SurveySummarySchema>;

/**
 * Export format options.
 */
export const ExportFormatSchema = z.enum(['csv', 'json']);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

/**
 * Export filters for result querying.
 */
export const ExportFiltersSchema = z.object({
  status: SessionStatusSchema.optional().describe('Filter by session status'),
  dateRange: z
    .object({
      start: z.string().datetime().describe('Start date (ISO 8601)'),
      end: z.string().datetime().describe('End date (ISO 8601)'),
    })
    .optional()
    .describe('Filter by date range'),
  participantIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific participants'),
});

export type ExportFilters = z.infer<typeof ExportFiltersSchema>;

/**
 * Completion blocker information.
 */
export const CompletionBlockerSchema = z.object({
  type: z
    .enum(['required-question', 'validation-error', 'conditional-incomplete'])
    .describe('Type of blocker'),
  message: z.string().describe('Human-readable blocker description'),
  questionId: z
    .string()
    .optional()
    .describe('Related question ID if applicable'),
});

export type CompletionBlocker = z.infer<typeof CompletionBlockerSchema>;
