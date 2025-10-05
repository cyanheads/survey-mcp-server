# survey-mcp-server - Directory Structure

Generated on: 2025-10-05 11:04:42

```
survey-mcp-server
├── .clinerules
│   └── AGENTS.md
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .husky
│   └── pre-commit
├── .vscode
│   └── settings.json
├── changelog
│   └── archive1.md
├── docs
│   ├── survey-mcp-server-spec.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── devcheck.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   ├── tree.ts
│   └── validate-mcp-publish-schema.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── container
│   │   ├── registrations
│   │   │   ├── core.ts
│   │   │   └── mcp.ts
│   │   ├── index.ts
│   │   └── tokens.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   ├── definitions
│   │   │   │   ├── echo.resource.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils
│   │   │   │   ├── resourceDefinition.ts
│   │   │   │   └── resourceHandlerFactory.ts
│   │   │   └── resource-registration.ts
│   │   ├── tools
│   │   │   ├── definitions
│   │   │   │   ├── index.ts
│   │   │   │   ├── survey-complete-session.tool.ts
│   │   │   │   ├── survey-export-results.tool.ts
│   │   │   │   ├── survey-get-progress.tool.ts
│   │   │   │   ├── survey-get-question.tool.ts
│   │   │   │   ├── survey-list-available.tool.ts
│   │   │   │   ├── survey-resume-session.tool.ts
│   │   │   │   ├── survey-start-session.tool.ts
│   │   │   │   └── survey-submit-response.tool.ts
│   │   │   ├── utils
│   │   │   │   ├── toolDefinition.ts
│   │   │   │   └── toolHandlerFactory.ts
│   │   │   └── tool-registration.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   ├── authUtils.ts
│   │   │   │   │   └── withAuth.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   └── index.ts
│   │   │   ├── stdio
│   │   │   │   ├── index.ts
│   │   │   │   └── stdioTransport.ts
│   │   │   ├── ITransport.ts
│   │   │   └── manager.ts
│   │   └── server.ts
│   ├── services
│   │   ├── llm
│   │   │   ├── core
│   │   │   │   └── ILlmProvider.ts
│   │   │   ├── providers
│   │   │   │   └── openrouter.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── speech
│   │   │   ├── core
│   │   │   │   ├── ISpeechProvider.ts
│   │   │   │   └── SpeechService.ts
│   │   │   ├── providers
│   │   │   │   ├── elevenlabs.provider.ts
│   │   │   │   └── whisper.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── survey
│   │       ├── core
│   │       │   ├── ISurveyProvider.ts
│   │       │   ├── SurveyService.ts
│   │       │   └── validation.ts
│   │       ├── providers
│   │       │   └── filesystem.provider.ts
│   │       ├── index.ts
│   │       └── types.ts
│   ├── storage
│   │   ├── core
│   │   │   ├── IStorageProvider.ts
│   │   │   ├── storageFactory.ts
│   │   │   ├── StorageService.ts
│   │   │   └── storageValidation.ts
│   │   ├── providers
│   │   │   ├── cloudflare
│   │   │   │   ├── index.ts
│   │   │   │   ├── kvProvider.ts
│   │   │   │   └── r2Provider.ts
│   │   │   ├── fileSystem
│   │   │   │   └── fileSystemProvider.ts
│   │   │   ├── inMemory
│   │   │   │   └── inMemoryProvider.ts
│   │   │   └── supabase
│   │   │       ├── supabase.types.ts
│   │   │       └── supabaseProvider.ts
│   │   └── index.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── error-handler
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── mappings.ts
│   │   │   │   └── types.ts
│   │   │   ├── encoding.ts
│   │   │   ├── health.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   ├── requestContext.ts
│   │   │   ├── runtime.ts
│   │   │   └── startupBanner.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── csvParser.ts
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   ├── jsonParser.ts
│   │   │   ├── pdfParser.ts
│   │   │   ├── xmlParser.ts
│   │   │   └── yamlParser.ts
│   │   ├── scheduling
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry
│   │   │   ├── index.ts
│   │   │   ├── instrumentation.ts
│   │   │   ├── semconv.ts
│   │   │   └── trace.ts
│   │   └── index.ts
│   ├── index.ts
│   └── worker.ts
├── survey-definitions
│   ├── employee
│   │   └── onboarding-2025.json
│   └── product
│       └── feedback
│           └── comprehensive-2025.json
├── survey-responses
│   └── default-tenant
│       └── sess_ZPQ1HY.json
├── tests
│   ├── config
│   │   └── index.int.test.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   └── definitions
│   │   │       └── echo.resource.test.ts
│   │   ├── tools
│   │   │   └── definitions
│   │   │       ├── survey-complete-session.tool.test.ts
│   │   │       ├── survey-export-results.tool.test.ts
│   │   │       ├── survey-get-progress.tool.test.ts
│   │   │       ├── survey-get-question.tool.test.ts
│   │   │       ├── survey-list-available.tool.test.ts
│   │   │       ├── survey-resume-session.tool.test.ts
│   │   │       ├── survey-start-session.tool.test.ts
│   │   │       ├── survey-submit-response.tool.test.ts
│   │   │       └── test-utils.ts
│   │   └── transports
│   │       └── auth
│   │           └── lib
│   │               └── authUtils.test.ts
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── storage
│   │   ├── providers
│   │   │   ├── cloudflare
│   │   │   │   ├── kvProvider.test.ts
│   │   │   │   └── r2Provider.test.ts
│   │   │   └── inMemory
│   │   │       └── inMemoryProvider.test.ts
│   │   └── storageProviderCompliance.test.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── encoding.test.ts
│   │   │   ├── errorHandler.int.test.ts
│   │   │   ├── errorHandler.unit.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── logger.int.test.ts
│   │   │   ├── performance.init.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── requestContext.test.ts
│   │   │   └── runtime.test.ts
│   │   ├── metrics
│   │   │   ├── registry.test.ts
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   └── fetchWithTimeout.test.ts
│   │   ├── parsing
│   │   │   ├── csvParser.test.ts
│   │   │   ├── dateParser.test.ts
│   │   │   ├── jsonParser.test.ts
│   │   │   ├── pdfParser.test.ts
│   │   │   ├── xmlParser.test.ts
│   │   │   └── yamlParser.test.ts
│   │   ├── scheduling
│   │   │   └── scheduler.test.ts
│   │   └── security
│   │       ├── idGenerator.test.ts
│   │       ├── rateLimiter.test.ts
│   │       └── sanitization.test.ts
│   └── setup.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── bun.lock
├── bunfig.toml
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package.json
├── README.md
├── repomix.config.json
├── server.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.test.json
├── tsdoc.json
├── typedoc.json
├── vitest.config.ts
└── wrangler.toml
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._
