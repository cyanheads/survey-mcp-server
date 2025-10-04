<div align="center">
  <h1>@cyanheads/survey-mcp-server</h1>
  <p><b>Transform LLMs into intelligent interviewers. A production-grade MCP server for conducting dynamic, conversational surveys with structured data collection. Features skip logic, session resume, multi-tenancy, and pluggable storage backends.</b></p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.0.1-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.18.2-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-In%20Development-yellow.svg?style=flat-square)](https://github.com/cyanheads/survey-mcp-server/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/)

</div>

---

## 🛠️ Tools Overview

This server provides eight powerful tools for managing the complete survey lifecycle with LLM-driven interactions:

| Tool Name                 | Description                                                                                            |
| :------------------------ | :----------------------------------------------------------------------------------------------------- |
| `survey_list_available`   | Discover available surveys in the definitions directory.                                               |
| `survey_start_session`    | Initialize a new session with complete survey context, all questions, and initial suggested questions. |
| `survey_get_question`     | Refresh a specific question's eligibility status after state changes (useful for conditional logic).   |
| `survey_submit_response`  | Record participant answers with validation, returning updated progress and next suggested questions.   |
| `survey_get_progress`     | Check completion status, remaining required/optional questions, and completion eligibility.            |
| `survey_complete_session` | Finalize a completed session (requires all required questions answered).                               |
| `survey_export_results`   | Export session data in CSV or JSON format with optional filtering by status, date range, etc.          |
| `survey_resume_session`   | Resume an incomplete session, restoring full context including answered questions and progress.        |

### `survey_list_available`

**Discover available surveys** loaded from your survey definitions directory.

**Key Features:**

- Lists all surveys discovered via recursive directory scan of `SURVEY_DEFINITIONS_PATH`
- Returns survey metadata: ID, title, description, estimated duration, and question count
- Optional tenant filtering for multi-tenant deployments

**Example Use Cases:**

- "Show me all available surveys"
- "What surveys can participants take?"
- "List surveys for tenant X"

---

### `survey_start_session`

**Initialize a new survey session** with complete context for LLM-driven conversations.

**Key Features:**

- Creates new session with unique session ID and participant tracking
- Loads complete survey definition with all questions upfront
- Returns initial 3-5 suggested questions based on eligibility (unconditional questions first, required before optional)
- Each question includes `currentlyEligible` flag and `eligibilityReason` for transparency
- Provides `guidanceForLLM` field with conversational instructions
- Supports session metadata for tracking source, user agent, etc.

**Example Use Cases:**

- "Start the customer satisfaction survey for participant ABC123"
- "Begin a new session for the Q1 feedback survey"
- "Initialize survey session with metadata: source=web, userAgent=Claude"

---

### `survey_get_question`

**Refresh a question's eligibility** and details after session state changes.

**Key Features:**

- Returns current eligibility status based on latest session state
- Provides eligibility reason (e.g., "Conditional logic satisfied", "Always available")
- Indicates if question was already answered
- Useful for checking if conditional questions became available after previous answers

**Example Use Cases:**

- "Has question q2 become available yet?"
- "Check if the follow-up question is now eligible"
- "Refresh question details after the participant answered the dependency"

---

### `survey_submit_response`

**Record participant answers** with validation and get dynamic response guidance.

**Key Features:**

- Validates responses against question constraints (min/max length, patterns, required fields, etc.)
- Returns validation errors with specific, actionable feedback
- Updates session progress (percentage complete, questions answered, time remaining estimate)
- Returns `updatedEligibility` array showing newly available conditional questions
- Provides 3-5 refreshed `nextSuggestedQuestions` based on new state
- Includes `guidanceForLLM` with context-aware instructions

**Example Use Cases:**

- "Submit answer 'very-satisfied' for question q1"
- "Record the participant's email: user@example.com"
- "Save free-form response with validation"

---

### `survey_get_progress`

**Check session status** and completion eligibility.

**Key Features:**

- Returns completion status: `in-progress`, `completed`, `abandoned`
- Progress metrics: total questions, answered count, required remaining, percentage complete
- Lists all unanswered required questions (with eligibility status)
- Lists all unanswered optional questions (with eligibility status)
- `canComplete` boolean indicating if session can be finalized
- `completionBlockers` array explaining what's preventing completion

**Example Use Cases:**

- "How much of the survey is complete?"
- "What required questions are still unanswered?"
- "Can we complete the survey now?"

---

### `survey_complete_session`

**Finalize a completed session** when all required questions have been answered.

**Key Features:**

- Validates that all required questions (including conditionally required) are answered
- Updates session status to `completed` and sets `completedAt` timestamp
- Returns summary with total questions answered and session duration
- Prevents duplicate completion

**Example Use Cases:**

- "Complete the survey session"
- "Finalize session sess_abc123"
- "Mark the survey as finished"

---

### `survey_export_results`

**Export session data** for analysis and reporting.

**Key Features:**

- Export in CSV or JSON format
- Filter by survey ID, status, date range, and custom criteria
- Returns formatted data with record count and generation timestamp
- CSV format includes one row per session with flattened question responses
- JSON format preserves full session structure

**Example Use Cases:**

- "Export all completed responses for survey customer-satisfaction-q1-2025 as CSV"
- "Get JSON export of sessions completed in January 2025"
- "Export in-progress sessions for analysis"

---

### `survey_resume_session`

**Resume an incomplete session** with full context restoration.

**Key Features:**

- Restores complete survey context and session state
- Returns all previously answered questions with responses
- Provides 3-5 refreshed `nextSuggestedQuestions` for remaining questions
- Shows elapsed time since last activity
- Current progress summary (percentage, remaining questions)
- Includes `guidanceForLLM` with welcome-back messaging suggestions

**Example Use Cases:**

- "Resume session sess_abc123"
- "Continue the survey where the participant left off"
- "Restore session state for participant to finish later"

## ✨ Features

This server is built on the [`mcp-ts-template`](https://github.com/cyanheads/mcp-ts-template) and inherits its rich feature set:

- **Declarative Tools**: Define capabilities in single, self-contained files. The framework handles registration, validation, and execution.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2`) without changing business logic.
- **Full-Stack Observability**: Deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Edge-Ready**: Write code once and run it seamlessly on your local machine or at the edge on Cloudflare Workers.

Plus, specialized features for **Survey Management**:

- **LLM-Driven Surveys**: Tools provide rich context (progress, next suggested questions, validation results) to guide natural conversation flow.
- **Hybrid Flow Control**: Guided mode with 3-5 suggested questions + flexible ordering based on conversation context.
- **Conditional Logic**: Skip logic and branching based on previous answers with real-time eligibility updates.
- **JSON-Based Survey Definitions**: Define surveys in simple JSON files with recursive directory scanning.
- **Multiple Question Types**: Free-form text, multiple choice, rating scales, email, number, and boolean questions.
- **Validation Engine**: Min/max length, patterns, required fields, and custom constraints.
- **Session Resume**: Built-in state management allows participants to pause and continue later.

## 🚀 Getting Started

### MCP Client Settings/Configuration

Add the following to your MCP Client configuration file (e.g., `cline_mcp_settings.json`).

```json
{
  "mcpServers": {
    "survey-mcp-server": {
      "command": "bunx",
      "args": ["survey-mcp-server@latest"],
      "env": {
        "MCP_LOG_LEVEL": "info",
        "SURVEY_DEFINITIONS_PATH": "./surveys",
        "SURVEY_RESPONSES_PATH": "./storage/responses"
      }
    }
  }
}
```

### Prerequisites

- [Bun v1.2.0](https://bun.sh/) or higher.

### Installation

1.  **Clone the repository:**

```sh
git clone https://github.com/cyanheads/survey-mcp-server.git
```

2.  **Navigate into the directory:**

```sh
cd survey-mcp-server
```

3.  **Install dependencies:**

```sh
bun install
```

4.  **Create example surveys:**

```sh
mkdir -p surveys/examples
# Add your survey JSON files to surveys/examples/
# See docs/survey-mcp-server-spec.md for schema details
```

## 🛠️ Core Capabilities: Survey Tools

This server equips AI agents with specialized tools to conduct dynamic, conversational surveys while maintaining structured data collection.

### Example Interaction Flow

```
1. LLM calls survey_start_session
   → Receives full survey context, all questions, and first 3-5 suggested questions

2. LLM asks questions naturally in conversation
   → Follows suggestions but can adapt order based on context
   → Uses natural language while ensuring survey questions are covered

3. For each answer, LLM calls survey_submit_response
   → Receives validation feedback (re-prompts if needed)
   → Gets progress update (50% complete, 2 of 4 questions answered)
   → Refreshed suggestions with newly eligible conditional questions

4. LLM can check survey_get_progress anytime
   → Knows exactly what's required vs optional
   → Understands what remains before completion is possible

5. When all required questions answered, LLM calls survey_complete_session
   → Session finalized with timestamp and summary
   → Ready for export via survey_export_results
```

📖 **[View detailed specification and examples →](./docs/survey-mcp-server-spec.md)**

## ⚙️ Configuration

All configuration is centralized and validated at startup in `src/config/index.ts`. Key environment variables in your `.env` file include:

| Variable                  | Description                                                                    | Default               |
| :------------------------ | :----------------------------------------------------------------------------- | :-------------------- |
| `SURVEY_DEFINITIONS_PATH` | Path to directory containing survey JSON files (recursive scan).               | `./surveys`           |
| `SURVEY_RESPONSES_PATH`   | Path to directory for storing session responses (filesystem mode).             | `./storage/responses` |
| `MCP_TRANSPORT_TYPE`      | The transport to use: `stdio` or `http`.                                       | `http`                |
| `MCP_HTTP_PORT`           | The port for the HTTP server.                                                  | `3019`                |
| `MCP_AUTH_MODE`           | Authentication mode: `none`, `jwt`, or `oauth`.                                | `none`                |
| `STORAGE_PROVIDER_TYPE`   | Storage backend: `in-memory`, `filesystem`, `supabase`, `cloudflare-kv`, `r2`. | `in-memory`           |
| `OTEL_ENABLED`            | Set to `true` to enable OpenTelemetry.                                         | `false`               |
| `LOG_LEVEL`               | The minimum level for logging (`debug`, `info`, `warn`, `error`).              | `info`                |
| `MCP_AUTH_SECRET_KEY`     | **Required for `jwt` auth.** A 32+ character secret key.                       | `(none)`              |
| `OAUTH_ISSUER_URL`        | **Required for `oauth` auth.** URL of the OIDC provider.                       | `(none)`              |

## ▶️ Running the Server

### Local Development

- **Build and run the production version**:

  ```sh
  # One-time build
  bun rebuild

  # Run the built server
  bun start:http
  # or
  bun start:stdio
  ```

- **Run checks and tests**:
  ```sh
  bun devcheck # Lints, formats, type-checks, and more
  bun test # Runs the test suite
  ```

### Cloudflare Workers

1.  **Build the Worker bundle**:

```sh
bun build:worker
```

2.  **Run locally with Wrangler**:

```sh
bun deploy:dev
```

3.  **Deploy to Cloudflare**:
    ```sh
    bun deploy:prod
    ```

## 📂 Project Structure

| Directory                   | Purpose & Contents                                                                  |
| :-------------------------- | :---------------------------------------------------------------------------------- |
| `surveys/`                  | **Survey definitions** (JSON files). Nested directories supported for organization. |
| `storage/responses/`        | **Session responses** (when using filesystem storage). Organized by tenant ID.      |
| `src/mcp-server/tools`      | **Survey tool definitions** (`survey-*.tool.ts`). 8 tools for complete lifecycle.   |
| `src/mcp-server/resources`  | Resource definitions for survey metadata and discovery.                             |
| `src/services/survey/`      | Survey service with filesystem provider for loading definitions.                    |
| `src/mcp-server/transports` | Implementations for HTTP and STDIO transports, including auth middleware.           |
| `src/storage`               | `StorageService` abstraction and all storage provider implementations.              |
| `src/container`             | Dependency injection container registrations and tokens.                            |
| `src/utils`                 | Core utilities for logging, error handling, performance, and security.              |
| `src/config`                | Environment variable parsing and validation with Zod.                               |
| `tests/`                    | Unit and integration tests, mirroring the `src/` directory structure.               |
| `docs/`                     | Detailed specifications and guides (see `survey-mcp-server-spec.md`).               |

## 🧑‍💻 Agent Development Guide

For strict rules when using this server with an AI agent, refer to the **`.clinerules`** file (or `AGENTS.md`) in this repository. Key principles include:

- **Logic Throws, Handlers Catch**: Never use `try/catch` in your tool `logic`. Throw an `McpError` instead.
- **Pass the Context**: Always pass the `RequestContext` object through your call stack for logging and tracing.
- **Use the Barrel Exports**: Register new tools and resources only in the `index.ts` barrel files within their respective `definitions` directories.

## 🤝 Contributing

Issues and pull requests are welcome! If you plan to contribute, please run the local checks and tests before submitting your PR.

```sh
bun run devcheck
bun test
```

## 📜 License

This project is licensed under the Apache 2.0 License. See the [LICENSE](./LICENSE) file for details.
