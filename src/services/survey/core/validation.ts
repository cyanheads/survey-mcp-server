/**
 * @fileoverview Validation engine for survey question responses.
 * Validates responses against question types and validation rules.
 * @module src/services/survey/core/validation
 */

import type {
  QuestionDefinition,
  ValidationError,
  ValidationResult,
} from '../types.js';

/**
 * Email regex pattern for validation.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a response value against a question definition.
 *
 * @param question The question definition with validation rules
 * @param value The response value to validate
 * @returns Validation result with errors if any
 */
export function validateResponse(
  question: QuestionDefinition,
  value: unknown,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if required
  if (
    question.required &&
    (value === null || value === undefined || value === '')
  ) {
    errors.push({
      field: 'value',
      message: 'This question is required and must have a response',
      constraint: 'required',
    });
    return { valid: false, errors };
  }

  // If value is empty and not required, validation passes
  if (value === null || value === undefined || value === '') {
    return { valid: true, errors: [] };
  }

  // Type-specific validation
  switch (question.type) {
    case 'free-form':
      validateFreeForm(question, value, errors);
      break;
    case 'multiple-choice':
      validateMultipleChoice(question, value, errors);
      break;
    case 'multiple-select':
      validateMultipleSelect(question, value, errors);
      break;
    case 'rating-scale':
      validateRatingScale(question, value, errors);
      break;
    case 'email':
      validateEmail(question, value, errors);
      break;
    case 'number':
      validateNumber(question, value, errors);
      break;
    case 'boolean':
      validateBoolean(question, value, errors);
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate free-form text response.
 */
function validateFreeForm(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Free-form response must be a string',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  const validation = question.validation;
  if (!validation) {
    return;
  }

  // Min length
  if (
    validation.minLength !== undefined &&
    value.length < validation.minLength
  ) {
    errors.push({
      field: 'value',
      message: `Response must be at least ${validation.minLength} characters long (currently ${value.length} characters)`,
      constraint: 'minLength',
      expected: validation.minLength,
      actual: value.length,
    });
  }

  // Max length
  if (
    validation.maxLength !== undefined &&
    value.length > validation.maxLength
  ) {
    errors.push({
      field: 'value',
      message: `Response must not exceed ${validation.maxLength} characters (currently ${value.length} characters)`,
      constraint: 'maxLength',
      expected: validation.maxLength,
      actual: value.length,
    });
  }

  // Pattern matching
  if (validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: 'value',
          message: `Response does not match required pattern: ${validation.pattern}`,
          constraint: 'pattern',
          expected: validation.pattern,
        });
      }
    } catch (_error) {
      errors.push({
        field: 'validation.pattern',
        message: 'Invalid regex pattern in validation rules',
        constraint: 'pattern',
      });
    }
  }
}

/**
 * Validate multiple-choice response.
 */
function validateMultipleChoice(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Multiple-choice response must be a string',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  if (!question.options) {
    errors.push({
      field: 'question.options',
      message: 'Multiple-choice question must have options defined',
      constraint: 'definition',
    });
    return;
  }

  const validValues = question.options.map((opt) => opt.value);
  if (!validValues.includes(value)) {
    errors.push({
      field: 'value',
      message: `Invalid option selected. Must be one of: ${validValues.join(', ')}`,
      constraint: 'options',
      expected: validValues,
      actual: value,
    });
  }
}

/**
 * Validate multiple-select response.
 */
function validateMultipleSelect(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (!Array.isArray(value)) {
    errors.push({
      field: 'value',
      message: 'Multiple-select response must be an array',
      constraint: 'type',
      expected: 'array',
      actual: typeof value,
    });
    return;
  }

  if (!question.options) {
    errors.push({
      field: 'question.options',
      message: 'Multiple-select question must have options defined',
      constraint: 'definition',
    });
    return;
  }

  const validValues = question.options.map((opt) => opt.value);
  const invalidSelections = value.filter(
    (v) => typeof v !== 'string' || !validValues.includes(v),
  );

  if (invalidSelections.length > 0) {
    errors.push({
      field: 'value',
      message: `Invalid selections: ${invalidSelections.join(', ')}. Must be from: ${validValues.join(', ')}`,
      constraint: 'options',
      expected: validValues,
      actual: invalidSelections,
    });
  }

  const validation = question.validation;
  if (validation) {
    // Min selections
    if (
      validation.minSelections !== undefined &&
      value.length < validation.minSelections
    ) {
      errors.push({
        field: 'value',
        message: `Must select at least ${validation.minSelections} option(s) (currently ${value.length} selected)`,
        constraint: 'minSelections',
        expected: validation.minSelections,
        actual: value.length,
      });
    }

    // Max selections
    if (
      validation.maxSelections !== undefined &&
      value.length > validation.maxSelections
    ) {
      errors.push({
        field: 'value',
        message: `Must select no more than ${validation.maxSelections} option(s) (currently ${value.length} selected)`,
        constraint: 'maxSelections',
        expected: validation.maxSelections,
        actual: value.length,
      });
    }
  }
}

/**
 * Validate rating-scale response.
 */
function validateRatingScale(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'number') {
    errors.push({
      field: 'value',
      message: 'Rating-scale response must be a number',
      constraint: 'type',
      expected: 'number',
      actual: typeof value,
    });
    return;
  }

  if (!question.scale) {
    errors.push({
      field: 'question.scale',
      message: 'Rating-scale question must have scale defined',
      constraint: 'definition',
    });
    return;
  }

  const { min, max, step } = question.scale;

  if (value < min || value > max) {
    errors.push({
      field: 'value',
      message: `Rating must be between ${min} and ${max} (received ${value})`,
      constraint: 'range',
      expected: { min, max },
      actual: value,
    });
  }

  // Check step alignment
  if (step && (value - min) % step !== 0) {
    errors.push({
      field: 'value',
      message: `Rating must align with step size of ${step} starting from ${min}`,
      constraint: 'step',
      expected: step,
      actual: value,
    });
  }
}

/**
 * Validate email response.
 */
function validateEmail(
  _question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Email response must be a string',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  if (!EMAIL_REGEX.test(value)) {
    errors.push({
      field: 'value',
      message: 'Invalid email address format',
      constraint: 'pattern',
      expected: 'valid email address',
      actual: value,
    });
  }
}

/**
 * Validate number response.
 */
function validateNumber(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'number') {
    errors.push({
      field: 'value',
      message: 'Number response must be a number',
      constraint: 'type',
      expected: 'number',
      actual: typeof value,
    });
    return;
  }

  const validation = question.validation;
  if (!validation) {
    return;
  }

  // Integer constraint
  if (validation.integer && !Number.isInteger(value)) {
    errors.push({
      field: 'value',
      message: 'Number must be an integer',
      constraint: 'integer',
      expected: 'integer',
      actual: value,
    });
  }

  // Min value
  if (validation.min !== undefined && value < validation.min) {
    errors.push({
      field: 'value',
      message: `Number must be at least ${validation.min} (received ${value})`,
      constraint: 'min',
      expected: validation.min,
      actual: value,
    });
  }

  // Max value
  if (validation.max !== undefined && value > validation.max) {
    errors.push({
      field: 'value',
      message: `Number must not exceed ${validation.max} (received ${value})`,
      constraint: 'max',
      expected: validation.max,
      actual: value,
    });
  }
}

/**
 * Validate boolean response.
 */
function validateBoolean(
  _question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'boolean') {
    errors.push({
      field: 'value',
      message: 'Boolean response must be true or false',
      constraint: 'type',
      expected: 'boolean',
      actual: typeof value,
    });
  }
}
