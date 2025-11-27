const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Unauthorized Access'
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      message: 'Resource already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      message: 'Referenced resource not found'
    });
  }

  res.status(500).json({
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };