import https from 'https';
import type http from 'http';

import { milliSecondTimer, sendApilyticsMetrics } from '../src';

const APILYTICS_VERSION = require('../package.json').version;

describe('sendApilyticsMetrics()', () => {
  const OLD_ENV = process.env;
  const apiKey = 'dummy-key';

  const params = {
    apiKey,
    path: '/',
    method: 'GET',
    statusCode: 200,
    timeMillis: 10,
  };

  let consoleErrorSpy: jest.SpyInstance;
  let requestSpy: jest.SpyInstance;

  const clientRequestMock = {
    on: jest.fn().mockImplementation((event, handler) => {
      handler(new Error());
    }),
    write: jest.fn(),
    end: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    requestSpy = jest
      .spyOn(https, 'request')
      .mockImplementation(
        () => clientRequestMock as unknown as http.ClientRequest,
      );

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should call apilytics API', async () => {
    sendApilyticsMetrics(params);

    expect(requestSpy).toHaveBeenCalledTimes(1);

    expect(APILYTICS_VERSION).toBeTruthy();
    expect(process.versions.node).toBeTruthy();

    expect(requestSpy).toHaveBeenLastCalledWith({
      hostname: 'www.apilytics.io',
      port: 443,
      path: '/api/v1/middleware',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': expect.any(Number),
        'X-API-Key': apiKey,
        'Apilytics-Version': `apilytics-node-core/${APILYTICS_VERSION};node/${process.versions.node}`,
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

  it('should allow to pass optional `apilyticsIntegration` and `integratedLibrary` params', async () => {
    sendApilyticsMetrics({
      ...params,
      apilyticsIntegration: 'dummy',
      integratedLibrary: 'lib/1.2.3',
    });

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
        'Apilytics-Version': `dummy/${APILYTICS_VERSION};node/${process.versions.node};lib/1.2.3`,
      },
    });
  });

  it('should send query parameters', async () => {
    sendApilyticsMetrics({
      ...params,
      query: 'key=val&other=123',
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toHaveProperty('query', 'key=val&other=123');
  });

  it('should not send empty query parameters', async () => {
    sendApilyticsMetrics({
      ...params,
      query: undefined,
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);

    let data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).not.toHaveProperty('query');

    sendApilyticsMetrics({
      ...params,
      query: '',
    });

    expect(requestSpy).toHaveBeenCalledTimes(2);

    data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).not.toHaveProperty('query');
  });

  it('should handle empty values correctly', async () => {
    sendApilyticsMetrics({
      apiKey,
      path: '',
      method: '',
      timeMillis: 0,
      query: '',
      statusCode: null,
      requestSize: undefined,
      responseSize: undefined,
      userAgent: '',
      apilyticsIntegration: undefined,
      integratedLibrary: undefined,
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '',
      method: '',
      timeMillis: 0,
    });
  });

  it('should hide HTTP errors in production', async () => {
    // @ts-ignore: Assigning to a read-only property.
    process.env.NODE_ENV = 'production';

    sendApilyticsMetrics(params);

    // Make the inner Promise in `sendApilyticsMetrics` resolve immediately.
    await new Promise(process.nextTick);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  it('should not hide HTTP errors when not in production', async () => {
    // @ts-ignore: Assigning to a read-only property.
    process.env.NODE_ENV = 'development';

    sendApilyticsMetrics(params);
    await new Promise(process.nextTick);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('milliSecondTimer()', () => {
  it('should return a positive integer', async () => {
    const timer = milliSecondTimer();
    await new Promise((resolve) => setTimeout(resolve, 10)); // Sleep for 10ms.
    const elapsed = timer();
    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toEqual(Math.trunc(elapsed));
  });

  it('should return a higher value when called again', async () => {
    const timer = milliSecondTimer();
    const first = timer();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = timer();
    expect(second).toBeGreaterThan(first);
  });
});
