/**
 * @fileoverview Barrel file for all tool definitions.
 * This file re-exports all tool definitions for easy import and registration.
 * It also exports an array of all definitions for automated registration.
 * @module src/mcp-server/tools/definitions
 */

import { surveyCompleteSessionTool } from './survey-complete-session.tool.js';
import { surveyExportResultsTool } from './survey-export-results.tool.js';
import { surveyGetProgressTool } from './survey-get-progress.tool.js';
import { surveyGetQuestionTool } from './survey-get-question.tool.js';
import { surveyListAvailableTool } from './survey-list-available.tool.js';
import { surveyResumeSessionTool } from './survey-resume-session.tool.js';
import { surveyStartSessionTool } from './survey-start-session.tool.js';
import { surveySubmitResponseTool } from './survey-submit-response.tool.js';

/**
 * An array containing all tool definitions for easy iteration.
 */
export const allToolDefinitions = [
  surveyListAvailableTool,
  surveyStartSessionTool,
  surveyGetQuestionTool,
  surveySubmitResponseTool,
  surveyGetProgressTool,
  surveyCompleteSessionTool,
  surveyExportResultsTool,
  surveyResumeSessionTool,
];
