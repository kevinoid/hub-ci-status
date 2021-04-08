/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const FakeTimers = require('@sinonjs/fake-timers');
const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const timers = require('timers');
const { promisify } = require('util');

const fetchCiStatus = require('../../lib/fetch-ci-status.js');
const packageJson = require('../../package.json');
const { makeCheckRuns, makeCombinedStatus } =
  require('../../test-lib/api-responses.js');

// TODO [engine:node@>=15]: import { setImmediate } from 'timers/promises';
const setImmediateP = promisify(timers.setImmediate);

const { match } = sinon;

const clock = FakeTimers.createClock();
const timeOptions = {
  now: clock.Date.now,
  setTimeout: promisify(clock.setTimeout),
};

function neverCalled() {
  throw new Error('should not be called');
}

const apiArgs = {
  owner: 'owner',
  repo: 'repo',
  ref: 'ref',
};

describe('fetchCiStatus', () => {
  beforeEach(() => clock.reset());

  it('returns status and ref without retry', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('neutral');
    const listForRef = sinon.stub().resolves(checks);
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
    };
    const result = await fetchCiStatus(apiArgs, options);
    sinon.assert.calledOnceWithExactly(getCombinedStatusForRef, apiArgs);
    sinon.assert.calledOnceWithExactly(listForRef, apiArgs);
    assert.deepStrictEqual(result, [status.data, checks.data]);
  });

  it('does not retry on both success', async () => {
    const status = makeCombinedStatus('success');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('success');
    const listForRef = sinon.stub().resolves(checks);
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        setTimeout: neverCalled,
      },
    };
    const result = await fetchCiStatus(apiArgs, options);
    sinon.assert.calledOnceWithExactly(getCombinedStatusForRef, apiArgs);
    sinon.assert.calledOnceWithExactly(listForRef, apiArgs);
    assert.deepStrictEqual(result, [status.data, checks.data]);
  });

  it('does not retry on both failure', async () => {
    const status = makeCombinedStatus('failure');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('failure');
    const listForRef = sinon.stub().resolves(checks);
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        setTimeout: neverCalled,
      },
    };
    const result = await fetchCiStatus(apiArgs, options);
    sinon.assert.calledOnceWithExactly(getCombinedStatusForRef, apiArgs);
    sinon.assert.calledOnceWithExactly(listForRef, apiArgs);
    assert.deepStrictEqual(result, [status.data, checks.data]);
  });

  it('does not retry on both unknown', async () => {
    const status = makeCombinedStatus('test123');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('test123');
    const listForRef = sinon.stub().resolves(checks);
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        setTimeout: neverCalled,
      },
    };
    const result = await fetchCiStatus(apiArgs, options);
    sinon.assert.calledOnceWithExactly(getCombinedStatusForRef, apiArgs);
    sinon.assert.calledOnceWithExactly(listForRef, apiArgs);
    assert.deepStrictEqual(result, [status.data, checks.data]);
  });

  it('retries on pending/queued up to maxTotalMs', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('queued');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  it('retries on pending/in_progress up to maxTotalMs', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('in_progress');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  it('retries on pending/success up to maxTotalMs', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('success');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  it('retries on success/queued up to maxTotalMs', async () => {
    const status = makeCombinedStatus('success');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('queued');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  it('does not retry on pending/failure, by default', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('failure');
    const listForRef = sinon.stub().resolves(checks);
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        setTimeout: neverCalled,
      },
    };
    const result = await fetchCiStatus(apiArgs, options);
    sinon.assert.calledOnceWithExactly(getCombinedStatusForRef, apiArgs);
    sinon.assert.calledOnceWithExactly(listForRef, apiArgs);
    assert.deepStrictEqual(result, [status.data, checks.data]);
  });

  it('retries on pending/failure if waitAll', async () => {
    const status = makeCombinedStatus('pending');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('failure');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
      waitAll: true,
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  it('retries on failure/in_progress if waitAll', async () => {
    const status = makeCombinedStatus('failure');
    const getCombinedStatusForRef = sinon.stub().resolves(status);
    const checks = makeCheckRuns('in_progress');
    const listForRef = sinon.stub().resolves(checks);
    const waitMs = 4000;
    const options = {
      octokit: {
        checks: { listForRef },
        repos: { getCombinedStatusForRef },
      },
      retry: {
        ...timeOptions,
        maxTotalMs: waitMs,
      },
      waitAll: true,
    };
    const result = fetchCiStatus(apiArgs, options);
    await setImmediateP();

    clock.tick(waitMs);
    assert.deepStrictEqual(await result, [status.data, checks.data]);
    sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
    sinon.assert.alwaysCalledWith(listForRef, apiArgs);
    sinon.assert.calledTwice(getCombinedStatusForRef);
    sinon.assert.calledTwice(listForRef);
  });

  describe('with options.debug', () => {
    // This can occur due to late-registered status, or ref not pushed yet.
    it('retries with no statuses or checks', async () => {
      const status = makeCombinedStatus('success');
      const getCombinedStatusForRef = sinon.stub().resolves(status)
        .onCall(0).resolves(makeCombinedStatus());
      const checks = makeCheckRuns('success');
      const listForRef = sinon.stub().resolves(checks)
        .onCall(0).resolves(makeCheckRuns());
      const debug = sinon.stub();
      const options = {
        debug,
        octokit: {
          checks: { listForRef },
          repos: { getCombinedStatusForRef },
        },
        retry: timeOptions,
      };
      const result = fetchCiStatus(apiArgs, options);

      await setImmediateP();
      sinon.assert.callCount(getCombinedStatusForRef, 1);
      clock.tick(4000);
      await setImmediateP();
      sinon.assert.callCount(getCombinedStatusForRef, 2);

      assert.deepStrictEqual(await result, [status.data, checks.data]);
      sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
      sinon.assert.alwaysCalledWith(listForRef, apiArgs);
      sinon.assert.callCount(getCombinedStatusForRef, 2);
      sinon.assert.callCount(listForRef, 2);

      sinon.assert.calledWithExactly(
        debug.getCall(0),
        'Waiting for any CI status or check.  Retry in 4 seconds...',
      );
      sinon.assert.callCount(debug, 1);
      sinon.assert.alwaysCalledOn(debug, options);
    });

    // Since statuses are added asynchronously, wait if none registered.
    it('retries on pending status', async () => {
      const status = makeCombinedStatus('success');
      const getCombinedStatusForRef = sinon.stub().resolves(status)
        .onCall(0).resolves(makeCombinedStatus('pending', 'success'));
      const checks = makeCheckRuns('success');
      const listForRef = sinon.stub().resolves(checks);
      const debug = sinon.stub();
      const options = {
        debug,
        octokit: {
          checks: { listForRef },
          repos: { getCombinedStatusForRef },
        },
        retry: timeOptions,
      };
      const result = fetchCiStatus(apiArgs, options);

      await setImmediateP();
      sinon.assert.callCount(getCombinedStatusForRef, 1);
      clock.tick(4000);
      await setImmediateP();
      sinon.assert.callCount(getCombinedStatusForRef, 2);

      assert.deepStrictEqual(await result, [status.data, checks.data]);
      sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
      sinon.assert.alwaysCalledWith(listForRef, apiArgs);
      sinon.assert.callCount(getCombinedStatusForRef, 2);
      sinon.assert.callCount(listForRef, 2);

      sinon.assert.calledWithExactly(
        debug.getCall(0),
        'Waiting for 1/2 CI statuses.  Retry in 4 seconds...',
      );
      sinon.assert.callCount(debug, 1);
      sinon.assert.alwaysCalledOn(debug, options);
    });

    it('retries on pending checks', async () => {
      const status = makeCombinedStatus('success');
      const getCombinedStatusForRef = sinon.stub().resolves(status);
      const checks = makeCheckRuns('success');
      const listForRef = sinon.stub().resolves(checks)
        .onCall(0).resolves(makeCheckRuns('success', 'in_progress'));
      const debug = sinon.stub();
      const options = {
        debug,
        octokit: {
          checks: { listForRef },
          repos: { getCombinedStatusForRef },
        },
        retry: timeOptions,
      };
      const result = fetchCiStatus(apiArgs, options);

      await setImmediateP();
      sinon.assert.callCount(listForRef, 1);
      clock.tick(4000);
      await setImmediateP();
      sinon.assert.callCount(listForRef, 2);

      assert.deepStrictEqual(await result, [status.data, checks.data]);
      sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
      sinon.assert.alwaysCalledWith(listForRef, apiArgs);
      sinon.assert.callCount(getCombinedStatusForRef, 2);
      sinon.assert.callCount(listForRef, 2);

      sinon.assert.calledWithExactly(
        debug.getCall(0),
        'Waiting for 1/2 checks.  Retry in 4 seconds...',
      );
      sinon.assert.callCount(debug, 1);
      sinon.assert.alwaysCalledOn(debug, options);
    });

    it('retries on pending/queued up to maxTotalMs', async () => {
      const status = makeCombinedStatus('pending');
      const getCombinedStatusForRef = sinon.stub().resolves(status);
      const checks = makeCheckRuns('queued');
      const listForRef = sinon.stub().resolves(checks);
      const waitMs = 4000;
      const debug = sinon.stub();
      const options = {
        debug,
        octokit: {
          checks: { listForRef },
          repos: { getCombinedStatusForRef },
        },
        retry: {
          ...timeOptions,
          maxTotalMs: waitMs,
        },
      };
      const result = fetchCiStatus(apiArgs, options);
      await setImmediateP();

      clock.tick(waitMs);
      assert.deepStrictEqual(await result, [status.data, checks.data]);
      sinon.assert.alwaysCalledWith(getCombinedStatusForRef, apiArgs);
      sinon.assert.alwaysCalledWith(listForRef, apiArgs);
      sinon.assert.calledTwice(getCombinedStatusForRef);
      sinon.assert.calledTwice(listForRef);

      sinon.assert.calledWithExactly(
        debug.getCall(0),
        'Waiting for 1/1 CI statuses and 1/1 checks.  Retry in 4 seconds...',
      );
      sinon.assert.callCount(debug, 1);
      sinon.assert.alwaysCalledOn(debug, options);
    });
  });

  describe('with instrumentation', () => {
    const listForRef = sinon.stub().resolves(makeCheckRuns('success'));
    const getCombinedStatusForRef =
      sinon.stub().resolves(makeCombinedStatus('success'));
    const Octokit = sinon.stub().returns({
      checks: { listForRef },
      repos: { getCombinedStatusForRef },
    });

    const httpAgent = { destroy: sinon.stub() };
    const http = { Agent: sinon.stub().returns(httpAgent) };
    const httpsAgent = { destroy: sinon.stub() };
    const https = { Agent: sinon.stub().returns(httpsAgent) };

    // eslint-disable-next-line no-shadow
    const fetchCiStatus = proxyquire(
      '../../lib/fetch-ci-status.js',
      {
        '@octokit/rest': { Octokit },
        http,
        https,
      },
    );
    beforeEach(() => {
      Octokit.resetHistory();
      listForRef.resetHistory();
      getCombinedStatusForRef.resetHistory();

      httpAgent.destroy.resetHistory();
      http.Agent.resetHistory();
      httpsAgent.destroy.resetHistory();
      https.Agent.resetHistory();
    });

    it('does not construct Octokit with options.options', async () => {
      const options = {
        octokit: {
          checks: { listForRef },
          repos: { getCombinedStatusForRef },
        },
      };
      await fetchCiStatus(apiArgs, options);
      sinon.assert.callCount(Octokit, 0);
    });

    it('constructs Octokit with userAgent by default', async () => {
      await fetchCiStatus(apiArgs);
      sinon.assert.calledOnceWithExactly(Octokit, match({
        request: undefined,
        userAgent: `${packageJson.name}/${packageJson.version}`,
      }));
      sinon.assert.calledWithNew(Octokit);
    });

    it('passes octokitOptions to Octokit constructor', async () => {
      const octokitOptions = {
        foo: 'bar',
        userAgent: 'testagent',
      };
      await fetchCiStatus(apiArgs, { octokitOptions });
      sinon.assert.calledOnceWithExactly(Octokit, match(octokitOptions));
      sinon.assert.calledWithNew(Octokit);
    });

    it('does not create Agent by default', async () => {
      await fetchCiStatus(apiArgs);
      sinon.assert.callCount(http.Agent, 0);
      sinon.assert.callCount(https.Agent, 0);
    });

    it('uses https.Agent with keep-alive for retries', async () => {
      const options = {
        retry: timeOptions,
      };
      await fetchCiStatus(apiArgs, options);
      sinon.assert.callCount(http.Agent, 0);
      sinon.assert.calledOnceWithExactly(
        https.Agent,
        match({ keepAlive: true }),
      );
      sinon.assert.calledWithNew(https.Agent);
      sinon.assert.calledOnceWithExactly(Octokit, match({
        request: match({
          agent: httpsAgent,
        }),
      }));
      sinon.assert.calledWithNew(Octokit);
      sinon.assert.calledOnceWithExactly(httpsAgent.destroy);
    });

    it('uses http.Agent with keep-alive for http baseUrl', async () => {
      const options = {
        octokitOptions: {
          baseUrl: 'http://example.com',
          request: {},
        },
        retry: timeOptions,
      };
      await fetchCiStatus(apiArgs, options);
      sinon.assert.callCount(https.Agent, 0);
      sinon.assert.calledOnceWithExactly(
        http.Agent,
        match({ keepAlive: true }),
      );
      sinon.assert.calledWithNew(http.Agent);
      sinon.assert.calledOnceWithExactly(Octokit, match({
        request: match({
          agent: httpAgent,
        }),
      }));
      sinon.assert.calledWithNew(Octokit);
      sinon.assert.calledOnceWithExactly(httpAgent.destroy);
    });

    it('does not create Agent for unrecognized baseUrl', async () => {
      const options = {
        octokitOptions: {
          baseUrl: 'foo://bar',
        },
        retry: timeOptions,
      };
      await fetchCiStatus(apiArgs, options);
      sinon.assert.callCount(http.Agent, 0);
      sinon.assert.callCount(https.Agent, 0);
    });

    it('does not create Agent if null passed', async () => {
      const options = {
        octokitOptions: {
          baseUrl: 'foo://bar',
          request: {
            agent: null,
          },
        },
        retry: timeOptions,
      };
      await fetchCiStatus(apiArgs, options);
      sinon.assert.calledOnceWithExactly(Octokit, match({
        ...options.octokitOptions,
        request: match({
          ...options.octokitOptions.request,
        }),
      }));
      sinon.assert.callCount(http.Agent, 0);
      sinon.assert.callCount(https.Agent, 0);
    });
  });
});
