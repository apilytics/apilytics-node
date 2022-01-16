import { URL } from 'url';

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
      let path, query;
      if (req.url) {
        ({ pathname: path, search: query } = new URL(
          req.url,
          'http://_', // Cannot parse a relative URL, so make it absolute.
        ));
      }
      sendApilyticsMetrics({
        apiKey,
        path: path ?? '',
        query,
        method: req.method ?? '',
        statusCode,
        timeMillis: timer(),
        apilyticsIntegration: 'apilytics-node-next',
        integratedLibrary: `next/${NEXT_VERSION}`,
      });
    }
  };
};
