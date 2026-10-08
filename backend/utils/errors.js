/**
 * Custom error classes for Guardian API.
 * Every error has a code, message, and HTTP status.
 */
class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found.`, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed.') {
    super('VALIDATION_ERROR', message, 400);
  }
}

class SafetyLimitError extends AppError {
  constructor(message = 'Safety limit reached. Adjust safety settings to proceed.') {
    super('SAFETY_LIMIT_REACHED', message, 403);
  }
}

class DiscoveryError extends AppError {
  constructor(message = 'Discovery failed. Check the application URL and try again.') {
    super('DISCOVERY_FAILED', message, 502);
  }
}

class TestBlockedError extends AppError {
  constructor(message = 'The test was blocked by the configured safety limit.') {
    super('TEST_BLOCKED', message, 403);
  }
}

class AnalysisIncompleteError extends AppError {
  constructor() {
    super('ANALYSIS_INCOMPLETE', 'Analysis incomplete. Raw evidence is still available.', 422);
  }
}

class IntegrationError extends AppError {
  constructor(service = 'External service') {
    super('INTEGRATION_FAILED', `${service} connection failed. Please reconnect and try again.`, 502);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  SafetyLimitError,
  DiscoveryError,
  TestBlockedError,
  AnalysisIncompleteError,
  IntegrationError,
};