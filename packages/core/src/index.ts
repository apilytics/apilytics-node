import https from 'https';
import process from 'process';

interface Params {
  apiKey: string;
  path: string;
  method: string;
  statusCode: number | null;
  timeMillis: number;
}

export const sendApilyticsMetrics = (params: Params): void => {
  const { apiKey, ...metrics } = params;
  const data = JSON.stringify(metrics);

  const options = {
    hostname: 'www.apilytics.io',
    port: 443,
    path: '/api/v1/middleware',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Key': apiKey,
    },
  };

  new Promise((_, reject) => {
    const req = https.request(options);
    req.on('error', (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }
  });
};

export const milliSecondTimer = (): (() => number) => {
  const startTimeNs = process.hrtime.bigint();

  return (): number => {
    const endTimeNs = process.hrtime.bigint();
    return Number((endTimeNs - startTimeNs) / BigInt(1_000_000));
  };
};
