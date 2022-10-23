/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import FakeTimers from '@sinonjs/fake-timers';
import assert from 'node:assert';
import sinon from 'sinon';
import timers from 'node:timers';
import { promisify } from 'node:util';

import retryAsync from '../../lib/retry-async.js';

// TODO [engine:node@>=15]: import { setImmediate } from 'timers/promises';
const setImmediateP = promisify(timers.setImmediate);

const clock = FakeTimers.createClock();
const timeOptions = {
  now: clock.Date.now,
  setTimeout: promisify(clock.setTimeout),
};

function neverCalled() {
  throw new Error('should not be called');
}

describe('retryAsync', () => {
  beforeEach(() => clock.reset());

  it('calls operation immediately with given args once if truthy', async () => {
    const stubResult = {};
    const stub = sinon.stub().resolves(stubResult);
    const args = [1, {}, false];
    const result = retryAsync(
      stub,
      { setTimeout: neverCalled },
      ...args,
    );
    sinon.assert.calledOnceWithExactly(stub, ...args);
    assert.strictEqual(await result, stubResult);
    sinon.assert.calledOnceWithExactly(stub, ...args);
  });

  it('calls operation with given number of args', async () => {
    const stubResult = {};
    const stub = sinon.stub().resolves(stubResult);
    const args = [undefined, undefined];
    const result = retryAsync(
      stub,
      { setTimeout: neverCalled },
      ...args,
    );
    sinon.assert.calledOnceWithExactly(stub, ...args);
    assert.strictEqual(await result, stubResult);
    sinon.assert.calledOnceWithExactly(stub, ...args);
  });

  it('returns immediately for !shouldRetry', async () => {
    const stubResult = null;
    const stub = sinon.stub().resolves(stubResult);
    const shouldRetry = sinon.stub().returns(false);
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        shouldRetry,
      },
    );
    sinon.assert.calledOnceWithExactly(stub);

    await setImmediateP();
    sinon.assert.calledOnceWithExactly(shouldRetry, stubResult);
    assert.strictEqual(await result, stubResult);
    sinon.assert.calledOnceWithExactly(stub);
    sinon.assert.calledOnceWithExactly(shouldRetry, stubResult);
  });

  it('returns immediately with rejection', async () => {
    const stubCause = new Error('test');
    const stub = sinon.stub().rejects(stubCause);
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        shouldRetry: neverCalled,
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
    await assert.rejects(
      () => result,
      (cause) => {
        assert.strictEqual(cause, stubCause);
        return true;
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
  });

  it('returns immediately with exception', async () => {
    const stubCause = new Error('test');
    const stub = sinon.stub().throws(stubCause);
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        shouldRetry: neverCalled,
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
    await assert.rejects(
      () => result,
      (cause) => {
        assert.strictEqual(cause, stubCause);
        return true;
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
  });

  it('handles non-Promise return values', async () => {
    const stubResult = undefined;
    const stub = sinon.stub().returns(stubResult);
    const shouldRetry = sinon.stub().returns(false);
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        shouldRetry,
      },
    );
    sinon.assert.calledOnceWithExactly(stub);

    await setImmediateP();
    sinon.assert.calledOnceWithExactly(shouldRetry, stubResult);
    assert.strictEqual(await result, stubResult);
    sinon.assert.calledOnceWithExactly(stub);
    sinon.assert.calledOnceWithExactly(shouldRetry, stubResult);
  });

  it('returns immediately for empty waitMs', async () => {
    const stub = sinon.stub();
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        waitMs: [],
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
    await result;
    sinon.assert.calledOnceWithExactly(stub);
  });

  // Behave like for-of and only call .return for early exit
  it('does not call return on exhausted waitMs iterator', async () => {
    const stub = sinon.stub();
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        waitMs: {
          [Symbol.iterator]: () => ({
            next: () => ({ done: true }),
            return: neverCalled,
          }),
        },
      },
    );
    sinon.assert.calledOnceWithExactly(stub);
    await result;
    sinon.assert.calledOnceWithExactly(stub);
  });

  // Behave like for-of and call .return for early exit
  it('calls .return on non-exhausted waitMs iterator', async () => {
    const stubResult = 1;
    const stub = sinon.stub();
    stub.onFirstCall().returns(undefined);
    stub.onSecondCall().returns(stubResult);
    const waitMs = 1000;
    const iterReturn = sinon.stub();
    const iter = {
      next: () => ({ value: waitMs }),
      return: iterReturn,
    };
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        waitMs: {
          [Symbol.iterator]: () => iter,
        },
      },
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    assert.strictEqual(clock.countTimers(), 1);
    clock.tick(waitMs);

    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 2);
    sinon.assert.alwaysCalledWithExactly(stub);

    // .return() is called exactly once, on iter, with no arguments
    sinon.assert.calledOnceWithExactly(iterReturn);
    sinon.assert.alwaysCalledOn(iterReturn, iter);
  });

  it('returns after all waitMs', async () => {
    const stubResult = false;
    const stub = sinon.stub();
    stub.onFirstCall().returns(undefined);
    stub.onSecondCall().returns(stubResult);
    const args = [false, undefined];
    const waitMs = [1000];
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        waitMs,
      },
      ...args,
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(waitMs[0] - 1);
    await setImmediateP();
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(1);
    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 2);
    sinon.assert.alwaysCalledWithExactly(stub, ...args);
  });

  it('accepts constant number waitMs', async () => {
    const stubResult = 1;
    const stub = sinon.stub();
    stub.onThirdCall().returns(stubResult);
    const waitMs = 1000;
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        waitMs,
      },
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(waitMs);
    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(waitMs);
    await setImmediateP();
    sinon.assert.callCount(stub, 3);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 3);
    sinon.assert.alwaysCalledWithExactly(stub);
  });

  it('returns after maxTotalMs', async () => {
    const stubResult = false;
    const stub = sinon.stub();
    stub.onFirstCall().returns(undefined);
    stub.onSecondCall().returns(stubResult);
    const maxTotalMs = 10000;
    const waitMs = maxTotalMs;
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        maxTotalMs,
        waitMs,
      },
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(maxTotalMs);
    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 2);
    sinon.assert.alwaysCalledWithExactly(stub);
  });

  it('reduces last wait time to avoid exceeding maxTotalMs', async () => {
    const stubResult = false;
    const stub = sinon.stub();
    stub.onFirstCall().returns(undefined);
    stub.onSecondCall().returns(stubResult);
    const maxTotalMs = 5000;
    const waitMs = 10000;
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        maxTotalMs,
        waitMs,
      },
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(maxTotalMs);
    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 2);
    sinon.assert.alwaysCalledWithExactly(stub);
  });

  it('does not wait less than minWaitMs', async () => {
    const stubResult = false;
    const stub = sinon.stub();
    stub.onFirstCall().returns(undefined);
    stub.onSecondCall().returns(stubResult);
    const minWaitMs = 500;
    const maxTotalMs = 1100;
    const waitMs = 1000;
    const result = retryAsync(
      stub,
      {
        ...timeOptions,
        maxTotalMs,
        minWaitMs,
        waitMs,
      },
    );
    sinon.assert.callCount(stub, 1);

    await setImmediateP();
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(clock.countTimers(), 1);

    clock.tick(waitMs);
    await setImmediateP();
    sinon.assert.callCount(stub, 2);
    assert.strictEqual(clock.countTimers(), 0);

    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 2);
    sinon.assert.alwaysCalledWithExactly(stub);
  });

  it('does not wait at all if maxTotalMs < minWaitMs', async () => {
    const stubResult = false;
    const stub = sinon.stub().returns(stubResult);
    const result = retryAsync(
      stub,
      {
        setTimeout: neverCalled,
        maxTotalMs: 500,
        minWaitMs: 1000,
        waitMs: 1000,
      },
    );
    sinon.assert.callCount(stub, 1);
    assert.strictEqual(await result, stubResult);
    sinon.assert.callCount(stub, 1);
    sinon.assert.alwaysCalledWithExactly(stub);
  });

  it('rejects with TypeError without arguments', () => {
    return assert.rejects(
      () => retryAsync(),
      TypeError,
    );
  });

  it('rejects with TypeError for non-function operation', () => {
    return assert.rejects(
      () => retryAsync(1),
      TypeError,
    );
  });

  it('rejects with TypeError for null options', () => {
    return assert.rejects(
      () => retryAsync(neverCalled, null),
      TypeError,
    );
  });

  it('rejects with TypeError if options.waitMs is not iterable', () => {
    return assert.rejects(
      () => retryAsync(neverCalled, { waitMs: {} }),
      TypeError,
    );
  });
});
