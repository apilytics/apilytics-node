import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

let EXPRESS_VERSION: string | undefined;
try {
  EXPRESS_VERSION = require('express/package.json').version;
} catch {
  // `express` peer dependency not installed (for some reason).
}

/**
 * Express middleware that sends API analytics data to Apilytics (https://apilytics.io).

 * This should ideally be the first middleware you add to your app.
 *
 * @param apiKey - The API key for your Apilytics origin.
 * @returns An Express middleware that can be passed to `app.use()`.
 *
 * @example
 *
 *     const { apilyticsMiddleware } = require('@apilytics/express');
 *     const express = require('express');
 *
 *     const app = express();
 *
 *     app.use(apilyticsMiddleware("your-api-key"));
 */
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
      const { pathname: path, search: query } = new URL(
        req.originalUrl,
        'http://_', // Cannot parse a relative URL, so make it absolute.
      );

      const requestSize = numberOrUndefined(req.headers['content-length']);

      const responseSize = numberOrUndefined(
        // @ts-ignore: `_contentLength` is not typed, but it does exist sometimes
        // when the header doesn't. Even if it doesn't this won't fail at runtime.
        res.getHeader('content-length') ?? res._contentLength,
      );

      sendApilyticsMetrics({
        apiKey,
        path,
        query,
        method: req.method,
        statusCode: res.statusCode,
        requestSize,
        responseSize,
        userAgent: req.headers['user-agent'],
        timeMillis: timer(),
        apilyticsIntegration: 'apilytics-node-express',
        integratedLibrary: EXPRESS_VERSION
          ? `express/${EXPRESS_VERSION}`
          : undefined,
      });
    });
    next();
  };
};

const numberOrUndefined = (value: unknown): number | undefined => {
  const converted = Number(value);
  return Number.isNaN(converted) ? undefined : converted;
};
