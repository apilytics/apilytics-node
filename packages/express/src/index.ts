import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';
import type { NextFunction, Request, Response } from 'express';
import type { RequestHandler } from 'express-serve-static-core';

export const apilyticsMiddleware = (
  apiKey: string | undefined,
): RequestHandler => {
  if (!apiKey) {
    return (req: Request, res: Response, next: NextFunction): void => {
      next();
    };
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = milliSecondTimer();

    res.on('finish', () => {
      sendApilyticsMetrics({
        apiKey,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        timeMillis: timer(),
      });
    });

    next();
  };
};
