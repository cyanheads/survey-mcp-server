# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2025-10-05

### Added

- **Advanced Question Types**: Introduced support for new, highly-requested question formats:
  - `date`, `datetime`, `time`: For capturing temporal data with ISO 8601 validation.
  - `matrix`: For creating complex grid/table questions with rows and columns.
- **Advanced Validation Rules**: Added a rich set of validation constraints for new question types:
  - **Date/Time**: `minDate`, `maxDate`, `allowPast`, `allowFuture`, `allowWeekends`, and `excludedDates`.
  - **Matrix**: Validation for required rows and correct column selections (single or multiple).
- **Multi-Condition Logic**: Upgraded conditional branching to support complex `AND`/`OR` logic between multiple conditions, allowing for more sophisticated survey flows.
- **Survey Analytics**: Implemented the core service-layer for survey analytics (`SurveyService.getAnalytics`), including a `FilesystemSurveyProvider` implementation to calculate session stats, completion rates, and response distributions.
- **Help Text**: Added a `helpText` field to question definitions to provide contextual guidance to the LLM/interviewer.
- **New Survey Examples**: Included two new comprehensive survey definitions (`employee-onboarding-2025.json`, `product-feedback-comprehensive.json`) to demonstrate all new features.

### Changed

- **Directory Structure**: Refactored survey data storage for better organization and clarity:
  - Renamed `surveys/` to `survey-definitions/` for storing survey schemas.
  - Created a new top-level `survey-responses/` directory for participant session data.
  - Updated `.env.example` and default configurations to reflect the new paths.
- **Codebase Documentation**: Added extensive JSDoc and architecture notes to `filesystem.provider.ts` to clarify its domain-specific purpose and distinction from the generic `StorageService`.

### Removed

- **Old Survey Data**: Removed outdated survey definition and session files from the old `surveys/` directory.

### Fixed

- **Readability**: Removed unnecessary truncation of survey descriptions in the `survey_list_available` tool output.
- **Conditional Logic Display**: The `survey_get_question` tool now correctly displays complex multi-condition logic.

## [1.0.2] - 2025-10-05

### Changed

- **Survey Tool Output Enhancement**: Completely redesigned `responseFormatter` functions for all 8 survey tools to provide richer, more informative LLM-facing outputs:
  - **Visual Progress Indicators**: Added ASCII progress bars (`[████████░░] 80%`) to `survey_submit_response`, `survey_resume_session`, and `survey_get_progress` for better progress visualization.
  - **Enhanced Question Details**: `survey_submit_response` now returns full question text with eligibility status and [Required]/[Optional] tags instead of just question IDs, enabling the LLM to immediately ask the next question without additional tool calls.
  - **Newly Unlocked Questions Highlighting**: `survey_submit_response` now prominently displays questions that became available due to conditional logic, with reasons explaining why they unlocked.
  - **Rich Status Indicators**: Consistent emoji usage across all tools (✅ ⚠️ 🔒 📊 🎯 👋 💡) for better scannability and visual hierarchy.
  - **Answer Previews**: `survey_resume_session` now shows truncated previews of previously answered questions (first 5) with their responses.
  - **Question Type Details**: `survey_get_question` now displays validation rules, multiple-choice options, rating scale ranges, and conditional dependencies.
  - **Completion Guidance**: `survey_get_progress` provides motivational messages ("Almost there! Just 1 required question remaining") and detailed breakdowns of required vs optional questions.
  - **Survey Discovery**: `survey_list_available` improved with better formatting, empty state handling, and actionable next steps.
  - **Smart Truncation**: Long text fields (descriptions, question text) are intelligently truncated with ellipsis for readability.
  - **Export Previews**: `survey_export_results` now shows syntax-highlighted CSV/JSON previews with usage tips specific to each format.
  - **Session Completion**: `survey_complete_session` enhanced with celebration messaging, full completion bar, and "What's Next" guidance.

### Fixed

- **Test Suite**: Updated all tool test files to match the new enhanced response formatters:
  - `tests/mcp-server/tools/definitions/survey-get-question.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-submit-response.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-complete-session.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-get-progress.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-start-session.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-resume-session.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-list-available.tool.test.ts`
  - `tests/mcp-server/tools/definitions/survey-export-results.tool.test.ts`
- **ESLint Compliance**: Fixed unsafe `any` type assignments in `survey-export-results.tool.ts` JSON parsing logic.

## [1.0.1] - 2025-10-04

### Changed

- **Agent Protocol**: Updated `AGENTS.md` to include best practices and detailed examples for implementing `responseFormatter` functions in tools, guiding the LLM's consumption of tool output.
- **Configuration**: Changed the default MCP HTTP port from `3010` to `3019` in `src/config/index.ts`, `Dockerfile`, `smithery.yaml`, `tests/config/index.int.test.ts and `README.md`.
- **Packaging**: Updated `package.json` with a more descriptive summary and added a `publishConfig` for public NPM deployment. Updated `server.json` to use the scoped package name `@cyanheads/survey-mcp-server` and added environment variable arguments for survey paths.

### Removed

- **MCP Prompts & Roots**: Removed the `Prompts` and `Roots` capabilities from the server to streamline focus on core Tool and Resource functionalities. This included deleting all related definitions, registration logic, and documentation. These features can be reintroduced later if needed.

## [1.0.0] - 2025-10-04

### Added

- **Survey Feature**: Introduced a comprehensive suite of tools for creating and managing conversational surveys.
  - `survey_list_available`: Discovers available surveys.
  - `survey_start_session`: Initializes a new survey session.
  - `survey_get_question`: Retrieves a specific question.
  - `survey_submit_response`: Records a participant's answer.
  - `survey_get_progress`: Checks the current progress of a session.
  - `survey_complete_session`: Finalizes a survey session.
  - `survey_resume_session`: Resumes an incomplete survey session.
  - `survey_export_results`: Exports survey data in CSV or JSON format.
- **Survey Service**: Implemented `SurveyService` to manage survey logic, with an initial `filesystem` provider for storing survey definitions and session data.
- **Unit Tests**: Added a full suite of unit tests for all new survey tools to ensure reliability.
- **Documentation**: Added `docs/survey-mcp-server-spec.md` with detailed API specifications for the new tools.

### Changed

- **Dependencies**: Updated `package.json` to include `zod` for robust data validation in survey tools.
- **Configuration**: Updated `server.json`, `.env.example`, `src/index.ts`, `src/container/tokens.ts`, and `src/container/registrations/core.ts` to support and integrate the new survey service and tools.
- **Project Focus**: Shifted the project from a generic MCP template to a dedicated survey management server.

### Removed

- **Template Files**: Deleted all boilerplate `template-*` tool definitions, their associated tests, and related documentation to streamline the codebase.
