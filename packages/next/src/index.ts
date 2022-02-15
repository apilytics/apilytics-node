import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

let NEXT_VERSION: string | undefined;
try {
  NEXT_VERSION = require('next/package.json').version;
} catch {
  // `next` peer dependency not installed (for some reason).
}

/**
 * Next.js middleware that sends API analytics data to Apilytics (https://apilytics.io).
 *
 * This should ideally be the outermost middleware that you wrap your handler with.
 *
 * @param handler - Next.js API route handler that this middleware should apply to.
 * @param apiKey - The API key for your Apilytics origin.
 * @returns A new API route handler which wraps the one that was passed in.
 *
 * @example
 *
 *     import { withApilytics } from '@apilytics/next';
 *
 *     const handler = async (req, res) => {
 *       // ...
 *     };
 *
 *     export default withApilytics(handler, "<your-api-key>");
 */
export const withApilytics = <T>(
  handler: NextApiHandler<T>,
  apiKey: string | undefined,
): NextApiHandler<T> => {
  if (!apiKey) {
    return handler;
  }

  return async (
    req: NextApiRequest,
    res: NextApiResponse<T>,
  ): Promise<void> => {
    let statusCode: number | undefined;
    let responseSize: number | undefined;
    const timer = milliSecondTimer();

    try {
      await handler(req, res);
      // Set this only after it was clear that `handler` didn't throw an error,
      // otherwise, we could end up sending NextApiResponse's default 200 status.
      statusCode = res.statusCode;
    } finally {
      let path, query;
      if (req.url) {
        ({ pathname: path, search: query } = new URL(
          req.url,
          'http://_', // Cannot parse a relative URL, so make it absolute.
        ));
      }

      const _requestSize = Number(req.headers['content-length']);
      const requestSize = isNaN(_requestSize) ? undefined : _requestSize;

      const _responseSize = Number(
        // @ts-ignore: `_contentLength` is not typed, but it does exist sometimes
        // when the header doesn't. Even if it doesn't this won't fail at runtime.
        res.getHeader('content-length') ?? res._contentLength,
      );
      responseSize = isNaN(_responseSize) ? undefined : _responseSize;

      sendApilyticsMetrics({
        apiKey,
        path: path ?? '',
        query,
        method: req.method ?? '',
        statusCode,
        requestSize,
        responseSize,
        userAgent: req.headers['user-agent'],
        timeMillis: timer(),
        apilyticsIntegration: 'apilytics-node-next',
        integratedLibrary: NEXT_VERSION ? `next/${NEXT_VERSION}` : undefined,
      });
    }
  };
};
