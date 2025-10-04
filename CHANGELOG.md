# Changelog

All notable changes to this project will be documented in this file.

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
