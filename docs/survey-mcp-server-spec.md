# Survey MCP Server - Project Specification

**Version:** 1.0.0
**Project Name:** `survey-mcp-server`
**Target Audience:** Open source community, enterprise customers (future)
**Primary Use Case:** Enable LLMs to conduct dynamic, conversational surveys with structured data collection

---

## Tool Overview

| Tool Name | Purpose | Key Input Parameters | Key Output Fields |
|-----------|---------|---------------------|-------------------|
| `survey_list_available` | Discover available surveys | `tenantId?: string` | `surveys[]` (id, title, description, duration, questionCount) |
| `survey_start_session` | Initialize session & load complete survey context | `surveyId: string`<br>`participantId: string`<br>`metadata?: object` | `sessionId`, `survey`, `allQuestions[]`, `nextSuggestedQuestions[]` (3-5), `guidanceForLLM` |
| `survey_get_question` | Refresh question eligibility after state changes | `sessionId: string`<br>`questionId: string` | `question`, `currentlyEligible: boolean`, `eligibilityReason`, `alreadyAnswered`, `guidanceForLLM` |
| `survey_submit_response` | Record answer & get updated state | `sessionId: string`<br>`questionId: string`<br>`value: any` | `success`, `validation`, `progress`, `updatedEligibility[]`, `nextSuggestedQuestions[]` (3-5), `guidanceForLLM` |
| `survey_get_progress` | Check completion eligibility & remaining questions | `sessionId: string` | `status`, `progress`, `unansweredRequired[]`, `unansweredOptional[]`, `canComplete`, `completionBlockers[]`, `guidanceForLLM` |
| `survey_complete_session` | Finalize session | `sessionId: string` | `success: boolean`, `completedAt`, `summary` (duration, questions answered) |
| `survey_export_results` | Export session data | `surveyId: string`<br>`format: 'csv' \| 'json'`<br>`filters?: object` | `format`, `data` (CSV/JSON string), `recordCount`, `generatedAt` |
| `survey_resume_session` | Resume session & restore context | `sessionId: string` | `resumed`, `answeredQuestions[]`, `nextSuggestedQuestions[]` (3-5), `progress`, `guidanceForLLM` |

---

## Executive Summary

The Survey MCP Server transforms LLMs into intelligent interviewers capable of conducting fluid, adaptive surveys while maintaining structured data collection. The server provides tools for the LLM to:

1. Load and understand survey definitions
2. Track participant progress and responses
3. Dynamically adapt questions based on context
4. Validate and store responses with state management
5. Export results for analysis

The LLM drives the entire interaction by calling MCP tools, receiving rich context in responses to guide the conversation naturally.

---

## Core Design Principles

### 1. **LLM-Driven, Tool-Informed**
- The LLM maintains conversation control and personality
- Tool responses provide rich context (progress %, next suggested questions, validation results)
- Tools shape behavior through response design, not rigid workflows
- Every tool response includes explicit `guidanceForLLM` field with behavioral instructions

### 2. **Hybrid Flow Control**
- **Guided mode:** Tools suggest 3-5 questions at a time based on completion state
- **Flexible mode:** LLM can choose which suggested question to ask based on conversation flow
- **Conditional logic:** Survey definitions support skip logic and branching
- **Question batching:** Multiple questions provided upfront to enable conversational planning

### 3. **State-First Architecture**
- Every participant interaction is tracked with full state (current question, completion %, session metadata)
- Resume capability built-in from day one
- Idempotent operations (re-asking a question updates the existing response)
- Full survey context loaded at session start (`allQuestions[]` array)

### 4. **Generic & Extensible**
- No hardcoded business logic
- JSON-based survey definitions (filesystem for v1, pluggable storage for enterprise)
- Multi-tenancy ready (tenant isolation via `context.tenantId`)

### 5. **LLM Behavioral Guidance (Not Constraints)**
Tool responses provide helpful guidance while preserving conversational flexibility:

- **Use Provided Questions:** "Ask questions from the survey definition - these are the questions that need answers."
- **Natural Language OK:** "Feel free to ask questions naturally and conversationally, but ensure you're covering the actual survey questions."
- **Flexible Ordering:** "You can ask questions in any order that feels natural to the conversation flow."
- **Eligibility Awareness:** "Check 'currentlyEligible' to know which questions are currently available (some may unlock based on previous answers)."
- **Validation Support:** Tool responses include validation rules so LLM can guide participants appropriately and re-prompt when needed.
- **Progress Awareness:** Every response includes progress metrics to help LLM pace the conversation and know when completion is possible.

These guidance points are embedded in:
- Tool output schemas (Zod descriptions sent to LLM)
- `guidanceForLLM` fields in major tool responses (written as helpful suggestions, not strict commands)
- Question objects include `currentlyEligible` and `eligibilityReason` for context
- Validation results include specific, actionable feedback when responses don't meet requirements

---

## Architecture Overview

### Data Model

#### Survey Definition (`surveys/*.json`)
```json
{
  "id": "customer-satisfaction-q1-2025",
  "version": "1.0",
  "metadata": {
    "title": "Q1 2025 Customer Satisfaction Survey",
    "description": "Quarterly customer feedback collection",
    "estimatedDuration": "5-7 minutes",
    "tags": ["customer-feedback", "satisfaction"]
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "required": true,
      "text": "How satisfied are you with our product?",
      "options": [
        { "value": "very-satisfied", "label": "Very Satisfied" },
        { "value": "satisfied", "label": "Satisfied" },
        { "value": "neutral", "label": "Neutral" },
        { "value": "dissatisfied", "label": "Dissatisfied" },
        { "value": "very-dissatisfied", "label": "Very Dissatisfied" }
      ],
      "validation": {
        "required": true
      }
    },
    {
      "id": "q2",
      "type": "free-form",
      "required": false,
      "text": "What could we improve?",
      "conditional": {
        "dependsOn": "q1",
        "showIf": ["dissatisfied", "very-dissatisfied"]
      },
      "validation": {
        "minLength": 10,
        "maxLength": 500
      }
    },
    {
      "id": "q3",
      "type": "rating-scale",
      "required": true,
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "scale": { "min": 0, "max": 10, "step": 1 }
    },
    {
      "id": "q4",
      "type": "email",
      "required": false,
      "text": "Would you like us to follow up? Please provide your email.",
      "validation": {
        "pattern": "email"
      }
    }
  ],
  "settings": {
    "allowSkip": true,
    "allowResume": true,
    "shuffleQuestions": false,
    "maxAttempts": 3
  }
}
```

#### Participant Session (`responses/{tenantId}/{sessionId}.json`)
```json
{
  "sessionId": "sess_abc123",
  "surveyId": "customer-satisfaction-q1-2025",
  "surveyVersion": "1.0",
  "participantId": "participant_xyz789",
  "tenantId": "default-tenant",
  "status": "in-progress",
  "startedAt": "2025-01-15T10:30:00Z",
  "lastActivityAt": "2025-01-15T10:35:00Z",
  "completedAt": null,
  "metadata": {
    "source": "web",
    "userAgent": "Claude Desktop 1.0"
  },
  "responses": {
    "q1": {
      "questionId": "q1",
      "value": "dissatisfied",
      "answeredAt": "2025-01-15T10:31:00Z",
      "attemptCount": 1
    },
    "q2": {
      "questionId": "q2",
      "value": "The onboarding process was confusing and lacked clear documentation.",
      "answeredAt": "2025-01-15T10:35:00Z",
      "attemptCount": 1
    }
  },
  "progress": {
    "totalQuestions": 4,
    "answeredQuestions": 2,
    "requiredRemaining": 2,
    "percentComplete": 50,
    "estimatedTimeRemaining": "3 minutes"
  }
}
```

---

## Tool Definitions

### 1. **`survey_list_available`**
**Purpose:** Discover available surveys
**Input:** `{ tenantId?: string }`
**Output:**
```json
{
  "surveys": [
    {
      "id": "customer-satisfaction-q1-2025",
      "title": "Q1 2025 Customer Satisfaction Survey",
      "description": "Quarterly customer feedback collection",
      "estimatedDuration": "5-7 minutes",
      "questionCount": 4
    }
  ]
}
```
**LLM Context:** "You can start any of these surveys with a participant."

---

### 2. **`survey_start_session`**
**Purpose:** Initialize a new participant session and load the complete survey context
**Input:**
```json
{
  "surveyId": "customer-satisfaction-q1-2025",
  "participantId": "participant_xyz789",
  "metadata": {
    "source": "web",
    "userAgent": "Claude Desktop 1.0"
  }
}
```
**Output:**
```json
{
  "sessionId": "sess_abc123",
  "survey": {
    "id": "customer-satisfaction-q1-2025",
    "title": "Q1 2025 Customer Satisfaction Survey",
    "description": "Quarterly customer feedback collection",
    "totalQuestions": 4,
    "estimatedDuration": "5-7 minutes"
  },
  "suggestedOpening": "Let's begin the Q1 2025 Customer Satisfaction Survey. This should take about 5-7 minutes.",
  "allQuestions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "text": "How satisfied are you with our product?",
      "required": true,
      "options": [
        { "value": "very-satisfied", "label": "Very Satisfied" },
        { "value": "satisfied", "label": "Satisfied" },
        { "value": "neutral", "label": "Neutral" },
        { "value": "dissatisfied", "label": "Dissatisfied" },
        { "value": "very-dissatisfied", "label": "Very Dissatisfied" }
      ],
      "currentlyEligible": true,
      "eligibilityReason": "Always available (no conditional logic)"
    },
    {
      "id": "q2",
      "type": "free-form",
      "text": "What could we improve?",
      "required": false,
      "validation": { "minLength": 10, "maxLength": 500 },
      "currentlyEligible": false,
      "eligibilityReason": "Conditional: becomes available if q1 answer is 'dissatisfied' or 'very-dissatisfied'"
    },
    {
      "id": "q3",
      "type": "rating-scale",
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "required": true,
      "scale": { "min": 0, "max": 10, "step": 1 },
      "currentlyEligible": true,
      "eligibilityReason": "Always available (no conditional logic)"
    },
    {
      "id": "q4",
      "type": "email",
      "text": "Would you like us to follow up? Please provide your email.",
      "required": false,
      "validation": { "pattern": "email" },
      "currentlyEligible": true,
      "eligibilityReason": "Always available (no conditional logic)"
    }
  ],
  "nextSuggestedQuestions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "text": "How satisfied are you with our product?",
      "required": true,
      "options": [
        { "value": "very-satisfied", "label": "Very Satisfied" },
        { "value": "satisfied", "label": "Satisfied" },
        { "value": "neutral", "label": "Neutral" },
        { "value": "dissatisfied", "label": "Dissatisfied" },
        { "value": "very-dissatisfied", "label": "Very Dissatisfied" }
      ]
    },
    {
      "id": "q3",
      "type": "rating-scale",
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "required": true,
      "scale": { "min": 0, "max": 10, "step": 1 }
    },
    {
      "id": "q4",
      "type": "email",
      "text": "Would you like us to follow up? Please provide your email.",
      "required": false,
      "validation": { "pattern": "email" }
    }
  ],
  "guidanceForLLM": "You have the complete survey context. Feel free to ask questions in any order that feels natural to the conversation. The 'nextSuggestedQuestions' array provides a good starting point. Be conversational and adaptive - you can explore topics as they arise. Just make sure to eventually cover all required questions before completing the survey."
}
```
**LLM Context:** "Session created. You have the full survey context with all questions available. The suggested questions provide a good starting point, but feel free to adapt the order based on how the conversation flows. Be natural and responsive to the participant."

---

### 3. **`survey_get_question`**
**Purpose:** Refresh a specific question's eligibility and details (useful after responses change conditional logic)
**Input:** `{ sessionId: "sess_abc123", questionId: "q2" }`
**Output:**
```json
{
  "question": {
    "id": "q2",
    "type": "free-form",
    "text": "What could we improve?",
    "required": false,
    "validation": { "minLength": 10, "maxLength": 500 }
  },
  "currentlyEligible": true,
  "eligibilityReason": "Conditional logic satisfied (q1 = 'dissatisfied')",
  "alreadyAnswered": false,
  "guidanceForLLM": "This question is now available to ask. Feel free to weave it into the conversation naturally when it makes sense contextually."
}
```
**LLM Context:** "This question is currently eligible and hasn't been answered yet. Ask it when it feels natural in the conversation flow."

---

### 4. **`survey_submit_response`**
**Purpose:** Record a participant's answer and get updated survey state
**Input:**
```json
{
  "sessionId": "sess_abc123",
  "questionId": "q1",
  "value": "dissatisfied"
}
```
**Output:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": []
  },
  "progress": {
    "percentComplete": 25,
    "answeredQuestions": 1,
    "totalQuestions": 4,
    "requiredRemaining": 3,
    "estimatedTimeRemaining": "4 minutes"
  },
  "updatedEligibility": [
    {
      "questionId": "q2",
      "nowEligible": true,
      "reason": "Triggered by dissatisfaction response (q1 = 'dissatisfied')"
    }
  ],
  "nextSuggestedQuestions": [
    {
      "id": "q2",
      "type": "free-form",
      "text": "What could we improve?",
      "required": false,
      "validation": { "minLength": 10, "maxLength": 500 },
      "triggeredBy": "q1 response"
    },
    {
      "id": "q3",
      "type": "rating-scale",
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "required": true,
      "scale": { "min": 0, "max": 10, "step": 1 }
    },
    {
      "id": "q4",
      "type": "email",
      "text": "Would you like us to follow up? Please provide your email.",
      "required": false,
      "validation": { "pattern": "email" }
    }
  ],
  "guidanceForLLM": "Response recorded successfully. The conditional question q2 is now available because the participant indicated dissatisfaction. You have several suggested questions to work with - choose whichever feels most natural based on how the conversation is flowing."
}
```
**LLM Context:** "Answer saved. Progress updated to 25%. A new conditional question (q2) became available based on this response. You have multiple questions to choose from - follow the conversation's natural direction."

**Validation Failure Example:**
```json
{
  "success": false,
  "validation": {
    "valid": false,
    "errors": [
      {
        "field": "value",
        "message": "Response must be at least 10 characters long (currently 5 characters)",
        "constraint": "minLength",
        "expected": 10,
        "actual": 5
      }
    ]
  },
  "guidanceForLLM": "The participant's response was too short (needs at least 10 characters). Politely ask them to expand on their answer with a bit more detail."
}
```

---

### 5. **`survey_get_progress`**
**Purpose:** Check session state, completion eligibility, and get remaining questions
**Input:** `{ sessionId: "sess_abc123" }`
**Output:**
```json
{
  "status": "in-progress",
  "progress": {
    "totalQuestions": 4,
    "answeredQuestions": 2,
    "requiredAnswered": 1,
    "requiredRemaining": 2,
    "percentComplete": 50,
    "estimatedTimeRemaining": "3 minutes"
  },
  "unansweredRequired": [
    {
      "id": "q3",
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "type": "rating-scale",
      "currentlyEligible": true
    }
  ],
  "unansweredOptional": [
    {
      "id": "q4",
      "text": "Would you like us to follow up? Please provide your email.",
      "type": "email",
      "currentlyEligible": true
    }
  ],
  "canComplete": false,
  "completionBlockers": [
    "Required question q3 has not been answered"
  ],
  "guidanceForLLM": "Session is 50% complete. There are still required questions to cover before the survey can be completed. Continue the conversation naturally and work through the remaining questions."
}
```
**LLM Context:** "Session is 50% complete. 2 required questions remaining. Keep the conversation going until all required questions have been addressed."

---

### 6. **`survey_complete_session`**
**Purpose:** Finalize a session
**Input:** `{ sessionId: "sess_abc123" }`
**Output:**
```json
{
  "success": true,
  "sessionId": "sess_abc123",
  "completedAt": "2025-01-15T10:40:00Z",
  "summary": {
    "totalQuestions": 4,
    "answeredQuestions": 4,
    "duration": "10 minutes"
  },
  "message": "Survey completed successfully. Thank the participant!"
}
```
**LLM Context:** "Survey is complete. Wrap up the conversation gracefully."

---

### 7. **`survey_export_results`**
**Purpose:** Export session data
**Input:**
```json
{
  "surveyId": "customer-satisfaction-q1-2025",
  "format": "csv",
  "filters": {
    "status": "completed",
    "dateRange": { "start": "2025-01-01", "end": "2025-01-31" }
  }
}
```
**Output:**
```json
{
  "format": "csv",
  "data": "sessionId,surveyId,participantId,q1,q2,q3,q4,completedAt\nsess_abc123,...",
  "recordCount": 142,
  "generatedAt": "2025-01-15T11:00:00Z"
}
```
**LLM Context:** "Export generated with 142 completed responses."

---

### 8. **`survey_resume_session`** (Optional but Recommended)
**Purpose:** Resume an incomplete session and restore full survey context
**Input:** `{ sessionId: "sess_abc123" }`
**Output:**
```json
{
  "resumed": true,
  "sessionId": "sess_abc123",
  "survey": {
    "id": "customer-satisfaction-q1-2025",
    "title": "Q1 2025 Customer Satisfaction Survey",
    "totalQuestions": 4
  },
  "lastActivity": "2025-01-15T10:35:00Z",
  "elapsedTimeSinceLastActivity": "15 minutes",
  "progress": {
    "percentComplete": 50,
    "answeredQuestions": 2,
    "requiredRemaining": 2
  },
  "answeredQuestions": [
    { "id": "q1", "text": "How satisfied are you with our product?", "answer": "dissatisfied" },
    { "id": "q2", "text": "What could we improve?", "answer": "The onboarding process was confusing..." }
  ],
  "nextSuggestedQuestions": [
    {
      "id": "q3",
      "type": "rating-scale",
      "text": "On a scale of 0-10, how likely are you to recommend us?",
      "required": true,
      "scale": { "min": 0, "max": 10, "step": 1 }
    },
    {
      "id": "q4",
      "type": "email",
      "text": "Would you like us to follow up? Please provide your email.",
      "required": false
    }
  ],
  "guidanceForLLM": "Welcome the participant back warmly. Acknowledge the time gap (15 minutes) and recap their progress (50% complete). Pick up the conversation naturally from where they left off."
}
```
**LLM Context:** "Session resumed successfully. Welcome them back, acknowledge the time gap, recap their progress (2 of 4 questions answered), and continue naturally with the remaining questions."

---

## Question Types (v1 Scope)

| Type | Description | Validation |
|------|-------------|------------|
| `free-form` | Open-ended text | `minLength`, `maxLength`, `pattern` |
| `multiple-choice` | Single selection | `required`, `options` |
| `multiple-select` | Multiple selections | `minSelections`, `maxSelections` |
| `rating-scale` | Numeric rating | `min`, `max`, `step` |
| `email` | Email address | Built-in email regex |
| `number` | Numeric input | `min`, `max`, `integer` |
| `boolean` | Yes/No | None |

---

## Implementation Phases

### Phase 1: Core Survey Flow (MVP)
- [ ] Survey definition schema + validation
- [ ] Recursive survey loader with `SURVEY_DEFINITIONS_PATH` support
- [ ] Session state management (filesystem storage via `SURVEY_RESPONSES_PATH`)
- [ ] Tools: `survey_list_available`, `survey_start_session`, `survey_get_question`, `survey_submit_response`, `survey_get_progress`, `survey_complete_session`
- [ ] Basic question types: `free-form`, `multiple-choice`, `rating-scale`
- [ ] Validation engine (required, min/max length, pattern matching)
- [ ] Unit tests + compliance suite

### Phase 2: Advanced Features
- [ ] Conditional logic (skip logic, branching)
- [ ] `survey_resume_session` tool
- [ ] Additional question types: `multiple-select`, `email`, `number`, `boolean`
- [ ] CSV export (`survey_export_results`)
- [ ] Progress analytics in responses

### Phase 3: Enterprise Readiness
- [ ] Multi-tenancy support (via `context.tenantId`)
- [ ] Pluggable storage (Supabase, Cloudflare KV/R2)
- [ ] CRUD tools for survey definitions (`survey_create`, `survey_update`, `survey_delete`)
- [ ] JSON export format
- [ ] Advanced analytics (completion rates, average duration, sentiment scoring)
- [ ] Webhook support for completion events

---

## Storage Strategy

### v1: Filesystem (Development & Small Scale)

#### Survey Definitions
- **Location:** Configured via `SURVEY_DEFINITIONS_PATH` environment variable
- **Default:** `./surveys` (relative to project root)
- **Format:** Nested directory structure with `.json` files
- **Ingestion:** Recursive directory scanner that discovers all `*.json` files
- **Organization:** Supports arbitrary nesting for organizational purposes

**Example Directory Structure:**
```
/path/to/surveys/
├── customer-feedback/
│   ├── satisfaction/
│   │   ├── q1-2025.json
│   │   └── q2-2025.json
│   └── nps/
│       └── annual-2025.json
├── employee-engagement/
│   ├── onboarding.json
│   └── quarterly-pulse.json
└── research/
    ├── product-discovery/
    │   └── feature-validation.json
    └── user-testing/
        └── prototype-feedback.json
```

**Survey Loader Behavior:**
- Scans `SURVEY_DEFINITIONS_PATH` recursively on startup
- Indexes all `*.json` files by their `id` field (not filename)
- Validates schema for each survey definition
- Logs warnings for invalid/duplicate surveys but continues loading
- Supports hot-reload (optional) via file watcher for development

#### Response Storage
- **Location:** Configured via `SURVEY_RESPONSES_PATH` environment variable
- **Default:** `./storage/responses` (relative to project root)
- **Structure:** `{tenantId}/{sessionId}.json`

**Example:**
```
/path/to/responses/
├── default-tenant/
│   ├── sess_abc123.json
│   └── sess_xyz789.json
└── enterprise-tenant-001/
    ├── sess_def456.json
    └── sess_ghi789.json
```

### v2: Multi-Tenant (Enterprise)
- **Survey Definitions:** Still filesystem-based via `SURVEY_DEFINITIONS_PATH` (allows Git versioning, easy management)
- **Response Storage:** Enhanced to support pluggable backends via `StorageService` abstraction
  - Tenant isolation enforced by `context.tenantId`
  - Supports filesystem (via `SURVEY_RESPONSES_PATH`), Supabase, Cloudflare KV/R2

### Environment Variables

```bash
# Survey Definitions (always filesystem-based)
SURVEY_DEFINITIONS_PATH=./surveys         # Absolute or relative path to survey JSON directory

# Response Storage
SURVEY_RESPONSES_PATH=./storage/responses # Absolute or relative path for filesystem-based responses

# Future: Multi-backend support (Phase 3)
# SURVEY_STORAGE_PROVIDER=filesystem      # 'filesystem' | 'supabase' | 'cloudflare-kv'
# When non-filesystem, SURVEY_RESPONSES_PATH is ignored
```

---

## LLM Interaction Examples

### Example 1: Standard Survey Flow
```
LLM: Hi! I'd like to gather some feedback. This will take about 5-7 minutes. Ready to start?
User: Sure!

[LLM calls survey_start_session]
[Response includes suggested opening and first question]

LLM: Great! First question: How satisfied are you with our product?
     - Very Satisfied
     - Satisfied
     - Neutral
     - Dissatisfied
     - Very Dissatisfied

User: I'd say dissatisfied.

[LLM calls survey_submit_response with q1="dissatisfied"]
[Response triggers conditional q2 and shows 25% progress]

LLM: I appreciate your honesty. What could we improve?

User: The onboarding was really confusing.

[LLM calls survey_submit_response with q2="The onboarding was really confusing."]
[Response shows 50% progress, suggests q3]

LLM: Thank you for that feedback. Next question: On a scale of 0-10, how likely are you to recommend us to a colleague?

[Survey continues...]
```

### Example 2: Flexible Questioning (LLM adapts order)
```
LLM: Before we move on, I noticed you mentioned onboarding issues. Would you like us to follow up via email about that?

[LLM calls survey_get_question for q4 (email) out of order]
[Response confirms q4 is valid to ask]

User: Yes, that would be helpful. My email is user@example.com

[LLM calls survey_submit_response with q4="user@example.com"]
[Validation passes, progress updates]

LLM: Perfect, we'll reach out soon. Now, let's finish up with the last question...
```

---

## Success Metrics

### Technical
- Tool response time: <200ms (p95)
- Session state consistency: 100%
- Validation accuracy: 100%
- Storage compatibility: Filesystem, Supabase, Cloudflare KV/R2

### User Experience
- Survey completion rate: >80%
- Average time to complete: Within estimated duration ±20%
- LLM question ordering accuracy: >90% match to survey flow
- Resume success rate: >95%

---

## Open Questions & Future Considerations

1. **Real-time analytics:** Should tools provide live sentiment/topic analysis?
2. **Localization:** Support multi-language surveys?
3. **Templates:** Pre-built survey templates (NPS, CSAT, employee engagement)?
4. **Integrations:** Webhooks, Slack notifications, CRM sync?
5. **Accessibility:** Audio transcription support for voice-based surveys?

---

## Repository Structure (based on mcp-ts-template)

```
survey-mcp-server/
├── src/
│   ├── mcp-server/
│   │   ├── tools/
│   │   │   └── definitions/
│   │   │       ├── survey-list-available.tool.ts
│   │   │       ├── survey-start-session.tool.ts
│   │   │       ├── survey-get-question.tool.ts
│   │   │       ├── survey-submit-response.tool.ts
│   │   │       ├── survey-get-progress.tool.ts
│   │   │       ├── survey-complete-session.tool.ts
│   │   │       ├── survey-export-results.tool.ts
│   │   │       └── survey-resume-session.tool.ts
│   │   └── resources/
│   │       └── definitions/
│   │           └── survey-definition.resource.ts
│   ├── services/
│   │   └── survey/
│   │       ├── core/
│   │       │   ├── ISurveyProvider.ts
│   │       │   └── SurveyService.ts
│   │       ├── providers/
│   │       │   └── filesystem.provider.ts
│   │       ├── types.ts
│   │       └── index.ts
├── surveys/  # Survey definitions directory (SURVEY_DEFINITIONS_PATH)
│   ├── customer-feedback/
│   │   └── satisfaction/
│   │       └── q1-2025.json
│   └── employee-engagement/
│       └── onboarding.json
└── storage/
    └── responses/  # Response storage directory (SURVEY_RESPONSES_PATH)
        └── default-tenant/
            └── sess_abc123.json
└── tests/
    ├── tools/
    └── services/
```

---

## Next Steps

1. **Review & Approve Spec:** Confirm design decisions
2. **Bootstrap Repository:** Fork `mcp-ts-template`
3. **Phase 1 Implementation:**
   - Survey schema + validation
   - Core 6 tools
   - Filesystem storage
   - Example surveys
4. **Testing & Documentation:**
   - Unit tests for all tools
   - Integration tests for survey flows
   - README with quick start guide
5. **Open Source Release:**
   - GitHub repository
   - npm package publication
   - Example integrations (Claude Desktop, Cline)

---

**Ready to build?** 🚀
