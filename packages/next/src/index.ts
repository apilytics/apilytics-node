import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

const NEXT_VERSION = require('next/package.json').version;

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
    let statusCode = null;
    const timer = milliSecondTimer();

    try {
      await handler(req, res);
      // Set this only after it was clear that `handler` didn't throw an error,
      // otherwise, we could end up sending NextApiResponse's default 200 status.
      statusCode = res.statusCode;
    } finally {
      sendApilyticsMetrics({
        apiKey,
        path: req.url?.split('?')[0] ?? '',
        method: req.method ?? '',
        statusCode,
        timeMillis: timer(),
        apilyticsIntegration: 'apilytics-node-next',
        integratedLibrary: `next/${NEXT_VERSION}`,
      });
    }
  };
};
