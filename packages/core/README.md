# `@apilytics/core`

[![npm](https://img.shields.io/npm/v/@apilytics/core)](https://www.npmjs.com/package/@apilytics/core)
[![ci](https://github.com/apilytics/apilytics-node/actions/workflows/ci.yml/badge.svg)](https://github.com/apilytics/apilytics-node/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/apilytics/apilytics-node/branch/master/graph/badge.svg?token=K592YR52WQ)](https://codecov.io/gh/apilytics/apilytics-node)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=007acc)](https://www.typescriptlang.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![node versions](https://img.shields.io/node/v/@apilytics/core)](#what-nodejs-versions-does-the-package-work-with)
[![license](https://img.shields.io/npm/l/@apilytics/core)](https://github.com/apilytics/apilytics-node/blob/master/packages/core/LICENSE)

Apilytics is a service that lets you analyze operational, performance and security metrics from your APIs easily.

Make sure to check out our out-of-the-box middleware packages first:

- [**Express** (`@apilytics/express`)](../express#readme)

- [**Next.js** (`@apilytics/next`)](../next#readme)

## Installation

1. Sign up and get your API key from https://apilytics.io - we offer a completely free trial with no credit card required!

2. Install this package:
```sh
yarn add @apilytics/core
# OR
npm install @apilytics/core
```

3. Set your api key and create a middleware which measures the execution time and sends the metrics:\
  _A good practice is to securely store the API key as an environment variable.
  You can leave the env variable unset in e.g. development and test environments,
  and make the middleware be disabled if the key is `undefined`._

`my-apilytics-middleware.js`:
```javascript
import { milliSecondTimer, sendApilyticsMetrics } from '@apilytics/core';

const myApilyticsMiddleware = async (req, handler) => {
  const apiKey = process.env.APILYTICS_API_KEY;
  if (!apiKey) {
    return handler(req);
  }

  const timer = milliSecondTimer();
  const res = await handler(req);

  sendApilyticsMetrics({
    apiKey,
    path: req.path,
    query: req.queryString,
    method: req.method,
    statusCode: res.statusCode,
    requestSize: req.bodyBytes.length,
    responseSize: res.bodyBytes.length,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim(),
    timeMillis: timer(),
  });
  return res;
};
```

## Frequently Asked Questions

### Does the middleware slow down my backend?

- No. The middleware does all of its requests to the Apilytics API in the background, by using
  promises without awaiting them, so it will not slow down your normal request handling.

### What 3rd party dependencies does `@apilytics/core` have?

- None :)

### What Node.js versions does the package work with?

- `@apilytics/core` is tested to work on all the currently [supported versions of Node](https://nodejs.org/en/about/releases/): 12, 14, 16, and 17.
