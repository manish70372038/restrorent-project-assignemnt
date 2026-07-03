// Centralized error handler. Every controller forwards errors here via next(err)
// or by throwing inside an async route wrapped with asyncHandler.
const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose duplicate key error (also used for our double-booking guard)
  if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern && err.keyPattern.table) {
      message = 'This table is already booked for the selected date and time slot';
    } else if (err.keyPattern && err.keyPattern.email) {
      message = 'An account with this email already exists';
    } else {
      message = 'Duplicate value violates a unique constraint';
    }
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  res.status(statusCode).json({ message });
};

// Wraps async route handlers so thrown errors / rejected promises reach errorHandler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

module.exports = { errorHandler, asyncHandler, notFound };
