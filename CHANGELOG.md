# Changelog

All notable changes to this project will be documented in this file.

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
