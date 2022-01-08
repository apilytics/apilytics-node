# `@apilytics/express`

[![npm](https://img.shields.io/npm/v/@apilytics/express)](https://www.npmjs.com/package/@apilytics/express)
[![ci](https://github.com/apilytics/apilytics-node/actions/workflows/ci.yml/badge.svg)](https://github.com/apilytics/apilytics-node/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/apilytics/apilytics-node/branch/master/graph/badge.svg?token=K592YR52WQ)](https://codecov.io/gh/apilytics/apilytics-node)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=007acc)](https://www.typescriptlang.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![node versions](https://img.shields.io/node/v/@apilytics/express)](#what-nodejs-versions-does-the-package-work-with)
[![license](https://img.shields.io/npm/l/@apilytics/express)](https://github.com/apilytics/apilytics-node/blob/master/packages/express/LICENSE)

## Installation

1. Sign up and get your API key from https://apilytics.io - we offer a completely free trial with no credit card required!

2. Install this package:
```sh
yarn add @apilytics/express
# OR
npm install @apilytics/express
```

3. Enable the middleware and set your API key:  
*A good practice is to securely store the API key as an environment variable.  
You can leave the env variable unset in e.g. development and test environments,
the middleware will be automatically disabled if the key is `undefined`.*

`server.js`:
```javascript
const { apilyticsMiddleware } = require('@apilytics/express');
const express = require('express');

const app = express();

app.use(apilyticsMiddleware(process.env.APILYTICS_API_KEY));
```

## Frequently Asked Questions

### Does the middleware slow down my backend?

- No. The middleware does all of its requests to the Apilytics API in the background, by using
  promises without awaiting them, so it will not slow down your normal request handling.

### What 3rd party dependencies does `@apilytics/express` have?

- None besides Express itself.

### What Node.js versions does the package work with?

- `@apilytics/express` is tested to work on all the currently [supported versions of Node](https://nodejs.org/en/about/releases/): 12, 14, 16, and 17.
