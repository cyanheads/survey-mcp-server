/**
 * @fileoverview Survey provider interface defining the contract for survey data access.
 * Implementations can use filesystem, database, or other storage mechanisms.
 * @module src/services/survey/core/ISurveyProvider
 */

import type {
  ExportFilters,
  ExportFormat,
  ParticipantSession,
  SurveyDefinition,
} from '../types.js';

/**
 * Provider interface for survey data access.
 * Implementations must handle survey definitions and participant sessions.
 */
export interface ISurveyProvider {
  /**
   * Initialize the provider (load surveys, establish connections, etc.).
   * Called once during application startup.
   */
  initialize(): Promise<void>;

  /**
   * Get all available survey definitions.
   * @param tenantId Optional tenant identifier for multi-tenant scenarios
   * @returns Array of survey definitions
   */
  getAllSurveys(tenantId?: string): Promise<SurveyDefinition[]>;

  /**
   * Get a specific survey definition by ID.
   * @param surveyId Unique survey identifier
   * @param tenantId Optional tenant identifier
   * @returns Survey definition or null if not found
   */
  getSurveyById(
    surveyId: string,
    tenantId?: string,
  ): Promise<SurveyDefinition | null>;

  /**
   * Create a new participant session.
   * @param session Initial session state
   * @returns Created session with generated sessionId
   */
  createSession(session: ParticipantSession): Promise<ParticipantSession>;

  /**
   * Get an existing session by ID.
   * @param sessionId Session identifier
   * @param tenantId Tenant identifier
   * @returns Session state or null if not found
   */
  getSession(
    sessionId: string,
    tenantId: string,
  ): Promise<ParticipantSession | null>;

  /**
   * Update an existing session (typically to record responses or update status).
   * @param session Updated session state
   * @returns Updated session
   */
  updateSession(session: ParticipantSession): Promise<ParticipantSession>;

  /**
   * Get all sessions for a specific survey (used for export).
   * @param surveyId Survey identifier
   * @param tenantId Tenant identifier
   * @param filters Optional filters for date range, status, etc.
   * @returns Array of matching sessions
   */
  getSessionsBySurvey(
    surveyId: string,
    tenantId: string,
    filters?: ExportFilters,
  ): Promise<ParticipantSession[]>;

  /**
   * Export survey results in the specified format.
   * @param surveyId Survey identifier
   * @param tenantId Tenant identifier
   * @param format Export format (csv or json)
   * @param filters Optional filters
   * @returns Formatted export data as string
   */
  exportResults(
    surveyId: string,
    tenantId: string,
    format: ExportFormat,
    filters?: ExportFilters,
  ): Promise<{ data: string; recordCount: number }>;

  /**
   * Health check for the provider.
   * @returns True if the provider is operational
   */
  healthCheck(): Promise<boolean>;
}
