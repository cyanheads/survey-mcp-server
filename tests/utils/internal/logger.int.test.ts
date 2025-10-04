/**
 * @fileoverview Integration tests for the Logger utility.
 * These tests validate file creation, log level handling, and rate limiting with Pino.
 */
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { config } from '../../../src/config/index.js';
import { Logger } from '../../../src/utils/internal/logger.js';

const LOGS_DIR = path.join(process.cwd(), 'logs', 'logger-test');
const COMBINED_LOG_PATH = path.join(LOGS_DIR, 'combined.log');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');

// Override config to use a dedicated test directory
config.logsPath = LOGS_DIR;

function readJsonLog(filePath: string): any[] {
  if (!existsSync(filePath)) {
    return [];
  }
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

describe('Logger Integration (Pino)', () => {
  let logger: Logger;

  beforeAll(async () => {
    // Clean up old logs if they exist
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
    // We get a singleton instance, so we will reuse it. Tests should not interfere.
    logger = Logger.getInstance();
    if (!logger.isInitialized()) {
      await logger.initialize('debug');
    }
  });

  afterAll(async () => {
    await logger.close();
    // Clean up the test log directory
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
  });

  it('should create log files on initialization', async () => {
    // Pino file transport creation is very fast, but let's be safe.
    await new Promise((res) => setTimeout(res, 100));
    expect(existsSync(COMBINED_LOG_PATH)).toBe(true);
    expect(existsSync(ERROR_LOG_PATH)).toBe(true);
  });

  it('should write an info message to the combined log but not the error log', async () => {
    await new Promise<void>((resolve) => {
      logger.info('This is a pino info message', {
        testId: 'pino-info-test',
        requestId: 'test-pino-1',
        timestamp: new Date().toISOString(),
      });

      // Give pino a moment to write to the file stream
      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const infoLogEntry = combinedLog.find(
          (log) => log.testId === 'pino-info-test',
        );
        expect(infoLogEntry).toBeDefined();
        expect(infoLogEntry.msg).toBe('This is a pino info message');
        expect(infoLogEntry.level).toBe(30); // Pino's level for info

        const errorLog = readJsonLog(ERROR_LOG_PATH);
        const errorLogEntry = errorLog.find(
          (log) => log.testId === 'pino-info-test',
        );
        expect(errorLogEntry).toBeUndefined();
        resolve();
      }, 200);
    });
  });

  it('should write an error message to both combined and error logs', async () => {
    await new Promise<void>((resolve) => {
      logger.error('This is a pino error message', new Error('test error'), {
        testId: 'pino-error-test',
        requestId: 'test-pino-2',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const combinedErrorEntry = combinedLog.find(
          (log) => log.testId === 'pino-error-test',
        );
        expect(combinedErrorEntry).toBeDefined();
        expect(combinedErrorEntry.msg).toBe('This is a pino error message');
        expect(combinedErrorEntry.level).toBe(50); // Pino's level for error
        expect(combinedErrorEntry.err.message).toBe('test error');

        const errorLog = readJsonLog(ERROR_LOG_PATH);
        const errorLogEntry = errorLog.find(
          (log) => log.testId === 'pino-error-test',
        );
        expect(errorLogEntry).toBeDefined();
        expect(errorLogEntry.msg).toBe('This is a pino error message');
        resolve();
      }, 200);
    });
  });

  it('should respect the log level and not log debug messages if level is info', async () => {
    // Read current log size to check for new entries later
    const initialLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');

    logger.setLevel('info');
    logger.debug('This pino debug message should not be logged', {
      testId: 'pino-debug-test',
      requestId: 'test-pino-3',
      timestamp: new Date().toISOString(),
    });

    await new Promise((res) => setTimeout(res, 200));

    const updatedLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');
    const newLogContent = updatedLog.substring(initialLog.length);
    expect(newLogContent).not.toContain('pino-debug-test');

    // Reset level for other tests
    logger.setLevel('debug');
  });

  it('should log emergency level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.emerg('Emergency situation detected', {
        testId: 'pino-emerg-test',
        requestId: 'test-pino-emerg',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const emergEntry = combinedLog.find(
          (log) => log.testId === 'pino-emerg-test',
        );
        expect(emergEntry).toBeDefined();
        expect(emergEntry.msg).toBe('Emergency situation detected');
        // Pino fatal level is 60
        expect(emergEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 200);
    });
  });

  it('should log critical level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.crit('Critical error occurred', {
        testId: 'pino-crit-test',
        requestId: 'test-pino-crit',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const critEntry = combinedLog.find(
          (log) => log.testId === 'pino-crit-test',
        );
        expect(critEntry).toBeDefined();
        expect(critEntry.msg).toBe('Critical error occurred');
        // Mapped to error level (50) in Pino
        expect(critEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 200);
    });
  });

  it('should log alert level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.alert('Alert condition triggered', {
        testId: 'pino-alert-test',
        requestId: 'test-pino-alert',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const alertEntry = combinedLog.find(
          (log) => log.testId === 'pino-alert-test',
        );
        expect(alertEntry).toBeDefined();
        expect(alertEntry.msg).toBe('Alert condition triggered');
        // Mapped to error/fatal level in Pino
        expect(alertEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 200);
    });
  });

  it('should log notice level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.notice('Notice level message', {
        testId: 'pino-notice-test',
        requestId: 'test-pino-notice',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const noticeEntry = combinedLog.find(
          (log) => log.testId === 'pino-notice-test',
        );
        expect(noticeEntry).toBeDefined();
        expect(noticeEntry.msg).toBe('Notice level message');
        // Mapped to info level (30) in Pino
        expect(noticeEntry.level).toBeGreaterThanOrEqual(30);
        resolve();
      }, 200);
    });
  });
});
