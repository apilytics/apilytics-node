import https from 'https';
import type http from 'http';

import { milliSecondTimer, sendApilyticsMetrics } from '../src';

describe('sendApilyticsMetrics()', () => {
  const OLD_ENV = process.env;

  const params = {
    apiKey: 'dummy-key',
    path: '/',
    method: 'GET',
    statusCode: 200,
    timeMillis: 10,
  };

  let consoleErrorSpy: jest.SpyInstance;

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

    jest
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
