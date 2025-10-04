/**
 * @fileoverview Filesystem-based survey provider implementation.
 * Loads survey definitions from JSON files and stores session data in filesystem.
 * @module src/services/survey/providers/filesystem.provider
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { inject, injectable } from 'tsyringe';

import { parseConfig } from '@/config/index.js';
import { AppConfig } from '@/container/tokens.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/index.js';
import { idGenerator } from '@/utils/security/idGenerator.js';
import type { ISurveyProvider } from '../core/ISurveyProvider.js';
import type {
  ExportFilters,
  ExportFormat,
  ParticipantSession,
  SurveyDefinition,
} from '../types.js';
import { ParticipantSessionSchema, SurveyDefinitionSchema } from '../types.js';

type AppConfigType = ReturnType<typeof parseConfig>;

/**
 * Filesystem-based survey provider.
 * - Surveys loaded from config.survey.definitionsPath (recursive scan)
 * - Sessions stored in config.survey.responsesPath/{tenantId}/{sessionId}.json
 */
@injectable()
export class FilesystemSurveyProvider implements ISurveyProvider {
  private surveys: Map<string, SurveyDefinition> = new Map();
  private surveysPath: string;
  private responsesPath: string;
  private initialized = false;

  constructor(@inject(AppConfig) private config: AppConfigType) {
    this.surveysPath = this.config.survey.definitionsPath;
    this.responsesPath = this.config.survey.responsesPath;
  }

  /**
   * Initialize the provider by loading all survey definitions.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing filesystem survey provider');

    // Create responses directory if it doesn't exist
    if (!existsSync(this.responsesPath)) {
      await mkdir(this.responsesPath, { recursive: true });
      logger.info('Created responses directory');
    }

    // Check if surveys directory exists
    if (!existsSync(this.surveysPath)) {
      logger.warning('Survey definitions directory does not exist');
      this.initialized = true;
      return;
    }

    // Recursively load all survey JSON files
    await this.loadSurveysRecursive(this.surveysPath);

    logger.info('Filesystem survey provider initialized');

    this.initialized = true;
  }

  /**
   * Recursively scan directory for survey JSON files.
   */
  private async loadSurveysRecursive(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectories
          await this.loadSurveysRecursive(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Load JSON file
          await this.loadSurveyFile(fullPath);
        }
      }
    } catch (error) {
      logger.error(
        'Error scanning survey directory',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Load and validate a single survey definition file.
   */
  private async loadSurveyFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as unknown;

      // Validate against schema
      const survey = SurveyDefinitionSchema.parse(parsed);

      // Check for duplicate IDs
      if (this.surveys.has(survey.id)) {
        logger.warning('Duplicate survey ID detected, skipping');
        return;
      }

      this.surveys.set(survey.id, survey);
      logger.debug('Loaded survey definition');
    } catch (error) {
      logger.error(
        'Failed to load survey file',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get all available surveys.
   */
  getAllSurveys(_tenantId?: string): Promise<SurveyDefinition[]> {
    this.ensureInitialized();
    return Promise.resolve(Array.from(this.surveys.values()));
  }

  /**
   * Get a specific survey by ID.
   */
  getSurveyById(
    surveyId: string,
    _tenantId?: string,
  ): Promise<SurveyDefinition | null> {
    this.ensureInitialized();
    return Promise.resolve(this.surveys.get(surveyId) || null);
  }

  /**
   * Create a new participant session.
   */
  async createSession(
    session: ParticipantSession,
  ): Promise<ParticipantSession> {
    this.ensureInitialized();

    // Generate session ID if not provided
    const sessionWithId: ParticipantSession = {
      ...session,
      sessionId: session.sessionId || `sess_${idGenerator.generate()}`,
    };

    // Validate session data
    const validatedSession = ParticipantSessionSchema.parse(sessionWithId);

    // Write to filesystem
    const sessionPath = this.getSessionPath(
      validatedSession.sessionId,
      validatedSession.tenantId,
    );
    await this.ensureDirectoryExists(sessionPath);
    await writeFile(sessionPath, JSON.stringify(validatedSession, null, 2));

    logger.debug('Created participant session');

    return validatedSession;
  }

  /**
   * Get an existing session.
   */
  async getSession(
    sessionId: string,
    tenantId: string,
  ): Promise<ParticipantSession | null> {
    this.ensureInitialized();

    const sessionPath = this.getSessionPath(sessionId, tenantId);

    try {
      if (!existsSync(sessionPath)) {
        return null;
      }

      const content = await readFile(sessionPath, 'utf-8');
      const parsed = JSON.parse(content) as unknown;
      return ParticipantSessionSchema.parse(parsed);
    } catch (error) {
      logger.error(
        'Failed to read session',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Update an existing session.
   */
  async updateSession(
    session: ParticipantSession,
  ): Promise<ParticipantSession> {
    this.ensureInitialized();

    // Validate session data
    const validatedSession = ParticipantSessionSchema.parse(session);

    // Write to filesystem
    const sessionPath = this.getSessionPath(
      validatedSession.sessionId,
      validatedSession.tenantId,
    );
    await this.ensureDirectoryExists(sessionPath);
    await writeFile(sessionPath, JSON.stringify(validatedSession, null, 2));

    logger.debug('Updated participant session');

    return validatedSession;
  }

  /**
   * Get all sessions for a survey (with optional filters).
   */
  async getSessionsBySurvey(
    surveyId: string,
    tenantId: string,
    filters?: ExportFilters,
  ): Promise<ParticipantSession[]> {
    this.ensureInitialized();

    const tenantDir = join(this.responsesPath, tenantId);

    if (!existsSync(tenantDir)) {
      return [];
    }

    const sessions: ParticipantSession[] = [];
    const files = await readdir(tenantDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const content = await readFile(join(tenantDir, file), 'utf-8');
        const session = ParticipantSessionSchema.parse(JSON.parse(content));

        // Filter by survey ID
        if (session.surveyId !== surveyId) {
          continue;
        }

        // Apply filters
        if (filters?.status && session.status !== filters.status) {
          continue;
        }

        if (filters?.dateRange) {
          const sessionDate = new Date(
            session.completedAt || session.startedAt,
          );
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          if (sessionDate < start || sessionDate > end) {
            continue;
          }
        }

        if (
          filters?.participantIds &&
          !filters.participantIds.includes(session.participantId)
        ) {
          continue;
        }

        sessions.push(session);
      } catch (error) {
        logger.warning('Skipping invalid session file', {
          requestId: 'filesystem-provider-session-scan',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return sessions;
  }

  /**
   * Export survey results in the specified format.
   */
  async exportResults(
    surveyId: string,
    tenantId: string,
    format: ExportFormat,
    filters?: ExportFilters,
  ): Promise<{ data: string; recordCount: number }> {
    this.ensureInitialized();

    const sessions = await this.getSessionsBySurvey(
      surveyId,
      tenantId,
      filters,
    );

    if (format === 'json') {
      return {
        data: JSON.stringify(sessions, null, 2),
        recordCount: sessions.length,
      };
    }

    // CSV export
    if (sessions.length === 0) {
      return {
        data: 'sessionId,surveyId,participantId,status,startedAt,completedAt',
        recordCount: 0,
      };
    }

    // Get survey to extract question IDs
    const survey = await this.getSurveyById(surveyId, tenantId);
    if (!survey) {
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        `Survey not found: ${surveyId}`,
      );
    }

    // Build CSV header
    const questionIds = survey.questions.map((q) => q.id);
    const headers = [
      'sessionId',
      'surveyId',
      'participantId',
      'status',
      'startedAt',
      'completedAt',
      ...questionIds,
    ];

    // Build CSV rows
    const rows = sessions.map((session) => {
      const baseFields = [
        session.sessionId,
        session.surveyId,
        session.participantId,
        session.status,
        session.startedAt,
        session.completedAt || '',
      ];

      const responseFields = questionIds.map((qid) => {
        const response = session.responses[qid];
        if (!response) {
          return '';
        }
        // Handle complex values (arrays, objects)
        if (typeof response.value === 'object' && response.value !== null) {
          return JSON.stringify(response.value).replace(/"/g, '""');
        }
        // For primitives (string, number, boolean)
        const stringValue = String(response.value);
        return stringValue.replace(/"/g, '""');
      });

      return [...baseFields, ...responseFields]
        .map((field) => `"${field}"`)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return {
      data: csv,
      recordCount: sessions.length,
    };
  }

  /**
   * Health check.
   */
  healthCheck(): Promise<boolean> {
    return Promise.resolve(this.initialized && existsSync(this.surveysPath));
  }

  /**
   * Get the filesystem path for a session file.
   */
  private getSessionPath(sessionId: string, tenantId: string): string {
    return join(this.responsesPath, tenantId, `${sessionId}.json`);
  }

  /**
   * Ensure the directory for a file path exists.
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const { dir } = parse(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Throw error if provider not initialized.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'Survey provider not initialized',
      );
    }
  }
}
