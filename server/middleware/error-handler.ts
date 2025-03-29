import { Request, Response, NextFunction } from "express";

/**
 * Custom error class for HTTP status errors
 */
export class StatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "StatusError";
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error("Error:", err);

  if (err instanceof StatusError) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  // Default to 500 internal server error for unhandled exceptions
  res.status(500).json({
    error: "Internal server error"
  });
}