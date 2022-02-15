import fs from 'fs';
import https from 'https';
import os from 'os';
import type http from 'http';

import { milliSecondTimer, sendApilyticsMetrics } from '../src';

const APILYTICS_VERSION = require('../package.json').version;

const flushTimers = (): Promise<void> => {
  jest.runAllTimers();
  return new Promise(jest.requireActual('timers').setImmediate);
};

const mockProcessPlatform = (
  platform: typeof process.platform,
): (() => void) => {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });

  return (): void => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  };
};

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

  let requestSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let readFileSpy: jest.SpyInstance;

  const clientRequestMock = {
    on: jest.fn().mockImplementation((event, handler) => {
      handler(new Error());
    }),
    write: jest.fn(),
    end: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers('legacy');
    jest.resetModules();

    process.env = { ...OLD_ENV };

    requestSpy = jest
      .spyOn(https, 'request')
      .mockImplementation(
        () => clientRequestMock as unknown as http.ClientRequest,
      );

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    readFileSpy = jest
      .spyOn(fs.promises, 'readFile')
      // @ts-ignore
      .mockImplementation(fs.readFileSync);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should call apilytics API', async () => {
    sendApilyticsMetrics(params);

    await flushTimers();

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
      cpuUsage: expect.any(Number),
      memoryUsage: expect.any(Number),
      memoryTotal: expect.any(Number),
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

    await flushTimers();

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

    await flushTimers();

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toHaveProperty('query', 'key=val&other=123');
  });

  it('should not send empty query parameters', async () => {
    sendApilyticsMetrics({
      ...params,
      query: undefined,
    });

    await flushTimers();

    expect(requestSpy).toHaveBeenCalledTimes(1);

    let data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).not.toHaveProperty('query');

    sendApilyticsMetrics({
      ...params,
      query: '',
    });

    await flushTimers();

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

    await flushTimers();

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data).toStrictEqual({
      path: '',
      method: '',
      memoryUsage: expect.any(Number),
      memoryTotal: expect.any(Number),
      cpuUsage: expect.any(Number),
      timeMillis: 0,
    });
  });

  it('should send CPU usage percentage between 0 and 1', async () => {
    jest.useRealTimers();
    sendApilyticsMetrics(params);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(data.cpuUsage).toBeLessThanOrEqual(1);
  });

  it('should send non-zero memory usage which should be less than memory total', async () => {
    sendApilyticsMetrics(params);

    await flushTimers();

    expect(requestSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.memoryUsage).toBeGreaterThan(0);
    expect(data.memoryTotal).toBeGreaterThan(data.memoryUsage);
  });

  it('should read /proc/meminfo when on Linux', async () => {
    const restorePlatform = mockProcessPlatform('linux');

    const memoryTotal = 4125478912;
    const memoryAvailable = 3360526336;
    jest.spyOn(os, 'totalmem').mockReturnValueOnce(memoryTotal);

    readFileSpy.mockReturnValueOnce(`MemTotal:        4028788 kB
MemFree:          789940 kB
MemAvailable:    ${memoryAvailable / 1024} kB
Buffers:         2450168 kB
`); // The real file is longer.

    sendApilyticsMetrics(params);

    await flushTimers();

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveBeenCalledWith('/proc/meminfo', 'utf8');

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.memoryUsage).toEqual(memoryTotal - memoryAvailable);
    expect(data.memoryTotal).toEqual(memoryTotal);

    restorePlatform();
  });

  it('should fall back to os.freemem() if reading /proc/meminfo fails on Linux', async () => {
    const restorePlatform = mockProcessPlatform('linux');

    const memoryTotal = 4125478912;
    const freemem = 1024;
    jest.spyOn(os, 'totalmem').mockReturnValueOnce(memoryTotal);
    jest.spyOn(os, 'freemem').mockReturnValueOnce(freemem);

    readFileSpy.mockRejectedValueOnce(new Error());

    sendApilyticsMetrics(params);

    await flushTimers();

    expect(readFileSpy).toHaveBeenCalledTimes(1);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.memoryUsage).toEqual(memoryTotal - freemem);
    expect(data.memoryTotal).toEqual(memoryTotal);

    restorePlatform();
  });

  it('should not try to read /proc/meminfo when not on Linux', async () => {
    const restorePlatform = mockProcessPlatform('win32');

    const memoryTotal = 4125478912;
    const freemem = 1024;
    jest.spyOn(os, 'totalmem').mockReturnValueOnce(memoryTotal);
    jest.spyOn(os, 'freemem').mockReturnValueOnce(freemem);

    sendApilyticsMetrics(params);

    await flushTimers();

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).not.toHaveBeenCalled();

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const data = JSON.parse(clientRequestMock.write.mock.calls[0]);
    expect(data.memoryUsage).toEqual(memoryTotal - freemem);
    expect(data.memoryTotal).toEqual(memoryTotal);

    restorePlatform();
  });

  it('should hide HTTP errors in production', async () => {
    // @ts-ignore: Assigning to a read-only property.
    process.env.NODE_ENV = 'production';

    sendApilyticsMetrics(params);

    await flushTimers();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  it('should not hide HTTP errors when not in production', async () => {
    // @ts-ignore: Assigning to a read-only property.
    process.env.NODE_ENV = 'development';

    sendApilyticsMetrics(params);

    await flushTimers();

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
