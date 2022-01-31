import https from 'https';
import type http from 'http';

import express from 'express';
import request from 'supertest';
import type { Request, Response } from 'express';

import { apilyticsMiddleware } from '../src';

const APILYTICS_VERSION = require('@apilytics/core/package.json').version;
const EXPRESS_VERSION = require('express/package.json').version;

describe('apilyticsMiddleware()', () => {
  const apiKey = 'dummy-key';

  const clientRequestMock = {
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };

  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest
      .spyOn(https, 'request')
      .mockImplementation(
        () => clientRequestMock as unknown as http.ClientRequest,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const testHandler = (req: Request, res: Response): void => {
    if (req.path.includes('error')) {
      throw new Error();
    }

    if (req.url?.includes('empty')) {
      res.status(200).end();
      return;
    }

    if (req.method === 'POST') {
      res.status(201).send('created');
      return;
    }

    res.status(200).send('ok');
  };

  const createAgent = ({
    apiKey,
  }: {
    apiKey: string | undefined;
  }): request.SuperAgentTest => {
    const app = express();

    app.use(apilyticsMiddleware(apiKey));

    app.all('*', testHandler);

    return request.agent(app);
  };

  it('should call Apilytics API', async () => {
    const agent = createAgent({ apiKey });
    const response = await agent.get('/');
    expect(response.status).toEqual(200);

    expect(requestSpy).toHaveBeenCalledTimes(1);

    expect(APILYTICS_VERSION).toBeTruthy();
    expect(process.versions.node).toBeTruthy();
    expect(EXPRESS_VERSION).toBeTruthy();

    expect(requestSpy).toHaveBeenLastCalledWith({
      hostname: 'www.apilytics.io',
      port: 443,
      path: '/api/v1/middleware',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': expect.any(Number),
        'X-API-Key': apiKey,
        'Apilytics-Version': `apilytics-node-express/${APILYTICS_VERSION};node/${process.versions.node};express/${EXPRESS_VERSION}`,
      },
    });

    expect(clientRequestMock.on).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.write).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.end).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '/',
      method: 'GET',
      statusCode: 200,
      responseSize: 2,
      timeMillis: expect.any(Number),
    });
    expect(data['timeMillis']).toEqual(Math.trunc(data['timeMillis']));
  });

  it('should send query parameters', async () => {
    const agent = createAgent({ apiKey });
    const response = await agent.post('/dummy/123/path/?param=foo&param2=bar');
    expect(response.status).toEqual(201);

    expect(requestSpy).toHaveBeenCalledTimes(1);

    expect(requestSpy).toHaveBeenLastCalledWith({
      hostname: 'www.apilytics.io',
      port: 443,
      path: '/api/v1/middleware',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': expect.any(Number),
        'X-API-Key': apiKey,
        'Apilytics-Version': `apilytics-node-express/${APILYTICS_VERSION};node/${process.versions.node};express/${EXPRESS_VERSION}`,
      },
    });

    expect(clientRequestMock.on).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.write).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.end).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '/dummy/123/path/',
      query: '?param=foo&param2=bar',
      method: 'POST',
      statusCode: 201,
      requestSize: 0,
      responseSize: 7,
      timeMillis: expect.any(Number),
    });
  });

  it('should handle zero request and response sizes', async () => {
    const agent = createAgent({ apiKey });
    const response = await agent.post('/empty');
    expect(response.status).toEqual(200);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.requestSize).toEqual(0);
    expect(data.responseSize).toEqual(0);
  });

  it('should handle non zero request and response sizes', async () => {
    const agent = createAgent({ apiKey });
    const response = await agent.post('/dummy').send({ hello: 'world' });
    expect(response.status).toEqual(201);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.requestSize).toEqual(17);
    expect(data.responseSize).toEqual(7);
  });

  it('should be disabled if API key is unset', async () => {
    const agent = createAgent({ apiKey: undefined });
    const response = await agent.get('/');
    expect(response.status).toEqual(200);

    expect(requestSpy).toHaveBeenCalledTimes(0);
  });

  it('should send data even on errors', async () => {
    const agent = createAgent({ apiKey });

    const response = await agent.get('/error');
    expect(response?.status).toEqual(500);

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '/error',
      method: 'GET',
      statusCode: 500,
      responseSize: expect.any(Number),
      timeMillis: expect.any(Number),
    });
  });

  it('should handle undefined content lengths', async () => {
    const agent = createAgent({ apiKey });
    const numberSpy = jest
      .spyOn(global, 'Number')
      .mockImplementation(() => NaN);
    const response = await agent.get('/empty');
    numberSpy.mockRestore();
    expect(response.status).toEqual(200);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });
});
