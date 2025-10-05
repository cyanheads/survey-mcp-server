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
    case 'date':
      validateDate(question, value, errors);
      break;
    case 'datetime':
      validateDateTime(question, value, errors);
      break;
    case 'time':
      validateTime(question, value, errors);
      break;
    case 'matrix':
      validateMatrix(question, value, errors);
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

/**
 * Validate date response (ISO 8601 date string: YYYY-MM-DD).
 */
function validateDate(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Date response must be a string in ISO 8601 format (YYYY-MM-DD)',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  // Validate ISO 8601 date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    errors.push({
      field: 'value',
      message:
        'Date must be in ISO 8601 format (YYYY-MM-DD), e.g., "2025-01-15"',
      constraint: 'pattern',
      expected: 'YYYY-MM-DD',
      actual: value,
    });
    return;
  }

  // Parse and validate as valid date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    errors.push({
      field: 'value',
      message: 'Invalid date value',
      constraint: 'pattern',
      actual: value,
    });
    return;
  }

  // Apply date-specific validations
  const dateTimeRules = question.validation?.dateTime;
  if (dateTimeRules) {
    validateDateTimeRules(date, value, dateTimeRules, errors);
  }
}

/**
 * Validate datetime response (ISO 8601 datetime string).
 */
function validateDateTime(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message:
        'DateTime response must be a string in ISO 8601 format (e.g., "2025-01-15T14:30:00Z")',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  // Parse and validate as valid datetime
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    errors.push({
      field: 'value',
      message:
        'Invalid datetime value. Must be ISO 8601 format (e.g., "2025-01-15T14:30:00Z")',
      constraint: 'pattern',
      actual: value,
    });
    return;
  }

  // Apply date-specific validations
  const dateTimeRules = question.validation?.dateTime;
  if (dateTimeRules) {
    validateDateTimeRules(date, value, dateTimeRules, errors);
  }
}

/**
 * Validate time response (ISO 8601 time string: HH:MM or HH:MM:SS).
 */
function validateTime(
  _question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({
      field: 'value',
      message: 'Time response must be a string in format HH:MM or HH:MM:SS',
      constraint: 'type',
      expected: 'string',
      actual: typeof value,
    });
    return;
  }

  // Validate time format (HH:MM or HH:MM:SS)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!timeRegex.test(value)) {
    errors.push({
      field: 'value',
      message:
        'Time must be in format HH:MM or HH:MM:SS (24-hour format), e.g., "14:30" or "14:30:00"',
      constraint: 'pattern',
      expected: 'HH:MM or HH:MM:SS',
      actual: value,
    });
  }
}

/**
 * Validate matrix question response.
 * Expected format: { [rowId]: string | string[] }
 */
function validateMatrix(
  question: QuestionDefinition,
  value: unknown,
  errors: ValidationError[],
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push({
      field: 'value',
      message:
        'Matrix response must be an object mapping row IDs to selected column values',
      constraint: 'type',
      expected: 'object',
      actual: Array.isArray(value) ? 'array' : typeof value,
    });
    return;
  }

  if (!question.matrix) {
    errors.push({
      field: 'question.matrix',
      message: 'Matrix question must have matrix configuration defined',
      constraint: 'definition',
    });
    return;
  }

  const matrixValue = value as Record<string, unknown>;
  const rowIds = question.matrix.rows.map((row) => row.id);
  const validColumnValues = question.matrix.columns.map((col) => col.value);
  const allowMultiple = question.matrix.allowMultiplePerRow;

  // Validate all required rows are present
  for (const rowId of rowIds) {
    if (question.required && !(rowId in matrixValue)) {
      errors.push({
        field: `value.${rowId}`,
        message: `Missing response for row: ${rowId}`,
        constraint: 'required',
        expected: rowIds,
      });
      continue;
    }

    const rowValue = matrixValue[rowId];
    if (rowValue === undefined || rowValue === null || rowValue === '') {
      continue; // Skip validation for empty optional rows
    }

    // Validate row response format
    if (allowMultiple) {
      // Expect array of column values
      if (!Array.isArray(rowValue)) {
        errors.push({
          field: `value.${rowId}`,
          message: `Row ${rowId} expects an array of column values`,
          constraint: 'type',
          expected: 'array',
          actual: typeof rowValue,
        });
        continue;
      }

      // Validate each selection
      const invalidSelections = rowValue.filter(
        (v) => typeof v !== 'string' || !validColumnValues.includes(v),
      );
      if (invalidSelections.length > 0) {
        errors.push({
          field: `value.${rowId}`,
          message: `Invalid column selections for row ${rowId}: ${invalidSelections.join(', ')}. Must be from: ${validColumnValues.join(', ')}`,
          constraint: 'options',
          expected: validColumnValues,
          actual: invalidSelections,
        });
      }
    } else {
      // Expect single column value
      if (typeof rowValue !== 'string') {
        errors.push({
          field: `value.${rowId}`,
          message: `Row ${rowId} expects a single column value (string)`,
          constraint: 'type',
          expected: 'string',
          actual: typeof rowValue,
        });
        continue;
      }

      if (!validColumnValues.includes(rowValue)) {
        errors.push({
          field: `value.${rowId}`,
          message: `Invalid column selection for row ${rowId}: "${rowValue}". Must be one of: ${validColumnValues.join(', ')}`,
          constraint: 'options',
          expected: validColumnValues,
          actual: rowValue,
        });
      }
    }
  }
}

/**
 * Helper function to validate date/time specific rules.
 */
function validateDateTimeRules(
  date: Date,
  originalValue: string,
  rules: {
    minDate?: string | undefined;
    maxDate?: string | undefined;
    allowWeekends?: boolean | undefined;
    allowPast?: boolean | undefined;
    allowFuture?: boolean | undefined;
    excludedDates?: string[] | undefined;
  },
  errors: ValidationError[],
): void {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Compare dates only, ignore time
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  // Check past/future constraints
  if (rules.allowPast === false && dateOnly < now) {
    errors.push({
      field: 'value',
      message: 'Past dates are not allowed',
      constraint: 'allowPast',
      actual: originalValue,
    });
  }

  if (rules.allowFuture === false && dateOnly > now) {
    errors.push({
      field: 'value',
      message: 'Future dates are not allowed',
      constraint: 'allowFuture',
      actual: originalValue,
    });
  }

  // Check min/max date range
  if (rules.minDate) {
    const minDate = new Date(rules.minDate);
    minDate.setHours(0, 0, 0, 0);
    if (dateOnly < minDate) {
      errors.push({
        field: 'value',
        message: `Date must be on or after ${rules.minDate}`,
        constraint: 'minDate',
        expected: rules.minDate,
        actual: originalValue,
      });
    }
  }

  if (rules.maxDate) {
    const maxDate = new Date(rules.maxDate);
    maxDate.setHours(0, 0, 0, 0);
    if (dateOnly > maxDate) {
      errors.push({
        field: 'value',
        message: `Date must be on or before ${rules.maxDate}`,
        constraint: 'maxDate',
        expected: rules.maxDate,
        actual: originalValue,
      });
    }
  }

  // Check weekend constraint
  if (rules.allowWeekends === false) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      errors.push({
        field: 'value',
        message: 'Weekend dates are not allowed',
        constraint: 'allowWeekends',
        actual: originalValue,
      });
    }
  }

  // Check excluded dates
  if (rules.excludedDates && rules.excludedDates.length > 0) {
    const dateStr = originalValue.split('T')[0]; // Get date part only
    if (dateStr && rules.excludedDates.includes(dateStr)) {
      errors.push({
        field: 'value',
        message: `This date is excluded: ${dateStr}`,
        constraint: 'excludedDates',
        actual: originalValue,
      });
    }
  }
}
