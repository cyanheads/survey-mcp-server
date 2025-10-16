# survey-mcp-server - Directory Structure

Generated on: 2025-10-16 13:09:03

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
├── coverage
│   ├── src
│   │   ├── config
│   │   │   ├── index.html
│   │   │   └── index.ts.html
│   │   ├── container
│   │   │   ├── registrations
│   │   │   │   ├── core.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── mcp.ts.html
│   │   │   ├── index.html
│   │   │   ├── index.ts.html
│   │   │   └── tokens.ts.html
│   │   ├── mcp-server
│   │   │   ├── resources
│   │   │   │   ├── utils
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── resourceDefinition.ts.html
│   │   │   │   │   └── resourceHandlerFactory.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── resource-registration.ts.html
│   │   │   ├── tools
│   │   │   │   ├── definitions
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── survey-complete-session.tool.ts.html
│   │   │   │   │   ├── survey-export-results.tool.ts.html
│   │   │   │   │   ├── survey-get-progress.tool.ts.html
│   │   │   │   │   ├── survey-get-question.tool.ts.html
│   │   │   │   │   ├── survey-list-available.tool.ts.html
│   │   │   │   │   ├── survey-resume-session.tool.ts.html
│   │   │   │   │   ├── survey-start-session.tool.ts.html
│   │   │   │   │   └── survey-submit-response.tool.ts.html
│   │   │   │   ├── utils
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── toolDefinition.ts.html
│   │   │   │   │   └── toolHandlerFactory.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── tool-registration.ts.html
│   │   │   ├── transports
│   │   │   │   ├── auth
│   │   │   │   │   ├── lib
│   │   │   │   │   │   ├── authContext.ts.html
│   │   │   │   │   │   ├── authTypes.ts.html
│   │   │   │   │   │   ├── authUtils.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   └── withAuth.ts.html
│   │   │   │   │   ├── strategies
│   │   │   │   │   │   ├── authStrategy.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   ├── jwtStrategy.ts.html
│   │   │   │   │   │   └── oauthStrategy.ts.html
│   │   │   │   │   ├── authFactory.ts.html
│   │   │   │   │   ├── authMiddleware.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── http
│   │   │   │   │   ├── httpErrorHandler.ts.html
│   │   │   │   │   ├── httpTransport.ts.html
│   │   │   │   │   ├── httpTypes.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── sessionIdUtils.ts.html
│   │   │   │   │   └── sessionStore.ts.html
│   │   │   │   ├── stdio
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── stdioTransport.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── ITransport.ts.html
│   │   │   │   └── manager.ts.html
│   │   │   ├── index.html
│   │   │   └── server.ts.html
│   │   ├── services
│   │   │   ├── llm
│   │   │   │   ├── core
│   │   │   │   │   ├── ILlmProvider.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── providers
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── openrouter.provider.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── types.ts.html
│   │   │   ├── speech
│   │   │   │   ├── core
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── ISpeechProvider.ts.html
│   │   │   │   │   └── SpeechService.ts.html
│   │   │   │   ├── providers
│   │   │   │   │   ├── elevenlabs.provider.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── whisper.provider.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── types.ts.html
│   │   │   └── survey
│   │   │       ├── core
│   │   │       │   ├── index.html
│   │   │       │   ├── ISurveyProvider.ts.html
│   │   │       │   ├── SurveyService.ts.html
│   │   │       │   └── validation.ts.html
│   │   │       ├── providers
│   │   │       │   ├── filesystem.provider.ts.html
│   │   │       │   └── index.html
│   │   │       ├── index.html
│   │   │       └── types.ts.html
│   │   ├── storage
│   │   │   ├── core
│   │   │   │   ├── index.html
│   │   │   │   ├── IStorageProvider.ts.html
│   │   │   │   ├── storageFactory.ts.html
│   │   │   │   ├── StorageService.ts.html
│   │   │   │   └── storageValidation.ts.html
│   │   │   └── providers
│   │   │       ├── cloudflare
│   │   │       │   ├── index.html
│   │   │       │   ├── kvProvider.ts.html
│   │   │       │   └── r2Provider.ts.html
│   │   │       ├── fileSystem
│   │   │       │   ├── fileSystemProvider.ts.html
│   │   │       │   └── index.html
│   │   │       ├── inMemory
│   │   │       │   ├── index.html
│   │   │       │   └── inMemoryProvider.ts.html
│   │   │       └── supabase
│   │   │           ├── index.html
│   │   │           ├── supabase.types.ts.html
│   │   │           └── supabaseProvider.ts.html
│   │   ├── types-global
│   │   │   ├── errors.ts.html
│   │   │   └── index.html
│   │   ├── utils
│   │   │   ├── formatting
│   │   │   │   ├── index.html
│   │   │   │   └── markdownBuilder.ts.html
│   │   │   ├── internal
│   │   │   │   ├── error-handler
│   │   │   │   │   ├── errorHandler.ts.html
│   │   │   │   │   ├── helpers.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── mappings.ts.html
│   │   │   │   │   └── types.ts.html
│   │   │   │   ├── encoding.ts.html
│   │   │   │   ├── health.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── logger.ts.html
│   │   │   │   ├── performance.ts.html
│   │   │   │   ├── requestContext.ts.html
│   │   │   │   ├── runtime.ts.html
│   │   │   │   └── startupBanner.ts.html
│   │   │   ├── metrics
│   │   │   │   ├── index.html
│   │   │   │   ├── registry.ts.html
│   │   │   │   └── tokenCounter.ts.html
│   │   │   ├── network
│   │   │   │   ├── fetchWithTimeout.ts.html
│   │   │   │   └── index.html
│   │   │   ├── parsing
│   │   │   │   ├── csvParser.ts.html
│   │   │   │   ├── dateParser.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── jsonParser.ts.html
│   │   │   │   ├── pdfParser.ts.html
│   │   │   │   ├── xmlParser.ts.html
│   │   │   │   └── yamlParser.ts.html
│   │   │   ├── scheduling
│   │   │   │   ├── index.html
│   │   │   │   └── scheduler.ts.html
│   │   │   ├── security
│   │   │   │   ├── idGenerator.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── rateLimiter.ts.html
│   │   │   │   └── sanitization.ts.html
│   │   │   └── telemetry
│   │   │       ├── index.html
│   │   │       ├── instrumentation.ts.html
│   │   │       ├── metrics.ts.html
│   │   │       ├── semconv.ts.html
│   │   │       └── trace.ts.html
│   │   ├── index.html
│   │   ├── index.ts.html
│   │   └── worker.ts.html
│   ├── base.css
│   ├── block-navigation.js
│   ├── coverage-final.json
│   ├── favicon.png
│   ├── index.html
│   ├── prettify.css
│   ├── prettify.js
│   ├── sort-arrow-sprite.png
│   └── sorter.js
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
│   ├── update-coverage.ts
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
│   │   │   │   ├── index.ts
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
│   │   │   │   ├── index.ts
│   │   │   │   ├── sessionIdUtils.ts
│   │   │   │   └── sessionStore.ts
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
│   │   ├── formatting
│   │   │   ├── index.ts
│   │   │   └── markdownBuilder.ts
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
│   │   ├── pagination
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
│   │   │   ├── metrics.ts
│   │   │   ├── semconv.ts
│   │   │   └── trace.ts
│   │   └── index.ts
│   ├── index.ts
│   └── worker.ts
├── storage
│   └── responses
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
│   │   ├── index.int.test.ts
│   │   └── index.test.ts
│   ├── container
│   │   ├── registrations
│   │   │   ├── core.test.ts
│   │   │   └── mcp.test.ts
│   │   ├── index.test.ts
│   │   └── tokens.test.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   ├── definitions
│   │   │   │   └── index.test.ts
│   │   │   ├── utils
│   │   │   │   ├── resourceDefinition.test.ts
│   │   │   │   └── resourceHandlerFactory.test.ts
│   │   │   └── resource-registration.test.ts
│   │   ├── tools
│   │   │   ├── definitions
│   │   │   │   ├── survey-complete-session.tool.test.ts
│   │   │   │   ├── survey-export-results.tool.test.ts
│   │   │   │   ├── survey-get-progress.tool.test.ts
│   │   │   │   ├── survey-get-question.tool.test.ts
│   │   │   │   ├── survey-list-available.tool.test.ts
│   │   │   │   ├── survey-resume-session.tool.test.ts
│   │   │   │   ├── survey-start-session.tool.test.ts
│   │   │   │   ├── survey-submit-response.tool.test.ts
│   │   │   │   └── test-utils.ts
│   │   │   ├── utils
│   │   │   │   ├── core
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── toolDefinition.test.ts
│   │   │   │   └── toolHandlerFactory.test.ts
│   │   │   └── tool-registration.test.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.test.ts
│   │   │   │   │   ├── authTypes.test.ts
│   │   │   │   │   ├── authUtils.test.ts
│   │   │   │   │   └── withAuth.test.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.test.ts
│   │   │   │   │   ├── jwtStrategy.test.ts
│   │   │   │   │   └── oauthStrategy.test.ts
│   │   │   │   ├── authFactory.test.ts
│   │   │   │   ├── authMiddleware.test.ts
│   │   │   │   └── index.test.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.test.ts
│   │   │   │   ├── httpTransport.test.ts
│   │   │   │   ├── httpTypes.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── sessionIdUtils.test.ts
│   │   │   │   └── sessionStore.test.ts
│   │   │   ├── stdio
│   │   │   │   ├── index.test.ts
│   │   │   │   └── stdioTransport.test.ts
│   │   │   ├── ITransport.test.ts
│   │   │   └── manager.test.ts
│   │   └── server.test.ts.disabled
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── scripts
│   │   └── devdocs.test.ts
│   ├── services
│   │   ├── llm
│   │   │   ├── core
│   │   │   │   └── ILlmProvider.test.ts
│   │   │   ├── providers
│   │   │   │   ├── openrouter.provider.test.ts
│   │   │   │   └── openrouter.provider.test.ts.disabled
│   │   │   ├── index.test.ts
│   │   │   └── types.test.ts
│   │   └── speech
│   │       ├── core
│   │       │   ├── ISpeechProvider.test.ts
│   │       │   └── SpeechService.test.ts
│   │       ├── providers
│   │       │   ├── elevenlabs.provider.test.ts
│   │       │   └── whisper.provider.test.ts
│   │       ├── index.test.ts
│   │       └── types.test.ts
│   ├── storage
│   │   ├── core
│   │   │   ├── IStorageProvider.test.ts
│   │   │   ├── storageFactory.test.ts
│   │   │   └── storageValidation.test.ts
│   │   ├── providers
│   │   │   ├── cloudflare
│   │   │   │   ├── kvProvider.test.ts
│   │   │   │   └── r2Provider.test.ts
│   │   │   ├── fileSystem
│   │   │   │   └── fileSystemProvider.test.ts
│   │   │   ├── inMemory
│   │   │   │   └── inMemoryProvider.test.ts
│   │   │   └── supabase
│   │   │       ├── supabase.types.test.ts
│   │   │       └── supabaseProvider.test.ts
│   │   ├── index.test.ts
│   │   ├── storageProviderCompliance.test.ts
│   │   └── StorageService.test.ts
│   ├── types-global
│   │   └── errors.test.ts
│   ├── utils
│   │   ├── formatting
│   │   │   ├── index.test.ts
│   │   │   └── markdownBuilder.test.ts
│   │   ├── internal
│   │   │   ├── error-handler
│   │   │   │   ├── errorHandler.test.ts
│   │   │   │   ├── helpers.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── mappings.test.ts
│   │   │   │   └── types.test.ts
│   │   │   ├── encoding.test.ts
│   │   │   ├── errorHandler.int.test.ts
│   │   │   ├── errorHandler.unit.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── logger.int.test.ts
│   │   │   ├── performance.init.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── requestContext.test.ts
│   │   │   ├── runtime.test.ts
│   │   │   └── startupBanner.test.ts
│   │   ├── metrics
│   │   │   ├── index.test.ts
│   │   │   ├── registry.test.ts
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.test.ts
│   │   │   └── index.test.ts
│   │   ├── pagination
│   │   │   └── index.test.ts
│   │   ├── parsing
│   │   │   ├── csvParser.test.ts
│   │   │   ├── dateParser.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── jsonParser.test.ts
│   │   │   ├── pdfParser.test.ts
│   │   │   ├── xmlParser.test.ts
│   │   │   └── yamlParser.test.ts
│   │   ├── scheduling
│   │   │   ├── index.test.ts
│   │   │   └── scheduler.test.ts
│   │   ├── security
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   └── sanitization.test.ts
│   │   ├── telemetry
│   │   │   ├── index.test.ts
│   │   │   ├── instrumentation.test.ts
│   │   │   ├── metrics.test.ts
│   │   │   ├── semconv.test.ts
│   │   │   └── trace.test.ts
│   │   └── index.test.ts
│   ├── index.test.ts
│   ├── setup.ts
│   └── worker.test.ts
├── .dockerignore
├── .env.example
├── .gitattributes
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
