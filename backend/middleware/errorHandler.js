/**
 * Global error handler middleware.
 * Converts all errors to structured JSON responses.
 * NEVER returns raw objects or stack traces to clients.
 */
function errorHandler(err, req, res, _next) {
  // Log full error server-side for debugging
  console.error(`[ERROR] ${err.code || 'INTERNAL_ERROR'}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.statusCode
    ? err.message
    : 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

module.exports = errorHandler;