/**
 * Centralized error handler middleware
 * 
 * Catches all errors thrown or passed via next(err) and returns
 * a consistent response shape: { error: { code, message, details } }
 */

function errorHandler(err, req, res, next) {
  // Log the full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    const target = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${target} already exists`,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.meta?.cause || 'Record not found',
      },
    });
  }

  // Custom app errors (thrown with status and code)
  if (err.status && err.code) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Fallback — unexpected errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message || 'Something went wrong',
    },
  });
}

/**
 * Helper to create an app error with status, code, and message.
 * Throw this in route handlers and it will be caught by errorHandler.
 *
 * Usage: throw AppError(404, 'NOT_FOUND', 'Member not found')
 */
function AppError(status, code, message, details = null) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

module.exports = { errorHandler, AppError };
