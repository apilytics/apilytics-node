import https from 'https';

const APILYTICS_VERSION = require('../package.json').version;

interface Params {
  apiKey: string;
  path: string;
  method: string;
  statusCode: number | null;
  timeMillis: number;
  query?: string;
  apilyticsIntegration?: string;
  integratedLibrary?: string;
}

export const sendApilyticsMetrics = ({
  apiKey,
  path,
  query,
  method,
  statusCode,
  timeMillis,
  apilyticsIntegration,
  integratedLibrary,
}: Params): void => {
  const data = JSON.stringify({
    path,
    query: query || undefined,
    method,
    statusCode,
    timeMillis,
  });
  let apilyticsVersion = `${
    apilyticsIntegration ?? 'apilytics-node-core'
  }/${APILYTICS_VERSION};node/${process.versions.node}`;

  if (integratedLibrary) {
    apilyticsVersion += `;${integratedLibrary}`;
  }

  const options = {
    hostname: 'www.apilytics.io',
    port: 443,
    path: '/api/v1/middleware',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Key': apiKey,
      'Apilytics-Version': apilyticsVersion,
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
