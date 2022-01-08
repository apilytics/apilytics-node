import https from 'https';
import type http from 'http';

import express from 'express';
import request from 'supertest';
import type { Request, Response } from 'express';

import { apilyticsMiddleware } from '../src';

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

    if (req.method === 'POST') {
      res.status(201).end();
      return;
    }

    res.status(200).end();
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

    expect(requestSpy).toHaveBeenLastCalledWith({
      hostname: 'www.apilytics.io',
      port: 443,
      path: '/api/v1/middleware',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': expect.any(Number),
        'X-API-Key': apiKey,
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
      timeMillis: expect.any(Number),
    });
    expect(data['timeMillis']).toEqual(Math.trunc(data['timeMillis']));
  });

  it('should not send query parameters', async () => {
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
      },
    });

    expect(clientRequestMock.on).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.write).toHaveBeenCalledTimes(1);
    expect(clientRequestMock.end).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '/dummy/123/path/',
      method: 'POST',
      statusCode: 201,
      timeMillis: expect.any(Number),
    });
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
      timeMillis: expect.any(Number),
    });
  });
});
