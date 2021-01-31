/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const ansiStyles = require('ansi-styles');
const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { PassThrough } = require('stream');

const { makeCheckRuns, makeCombinedStatus } =
  require('../test-lib/api-responses.js');

const { match } = sinon;

const fetchCiStatus = sinon.stub();
const getProjectName = sinon.stub();
const resolveCommit = sinon.stub();
const githubCiStatus = proxyquire(
  '..',
  {
    './lib/fetch-ci-status.js': fetchCiStatus,
    './lib/git-utils.js': { resolveCommit },
    './lib/github-utils.js': { getProjectName },
  },
);

const testOwner = 'owner';
const testRepo = 'repo';
const testRef = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const matchOwnerRepoRef = match({
  owner: testOwner,
  repo: testRepo,
  ref: testRef,
});
let testOptions;

beforeEach(() => {
  testOptions = {
    stdout: new PassThrough({ encoding: 'utf8' }),
    stderr: new PassThrough({ encoding: 'utf8' }),
  };

  fetchCiStatus.reset();
  getProjectName.reset();
  getProjectName.returns([testOwner, testRepo]);
  resolveCommit.reset();
  resolveCommit.returns(testRef);
});

const statePriority = [
  'test123',
  'neutral',
  'success',
  'pending',
  'cancelled',
  'timed_out',
  'action_required',
  'failure',
  'error',
];
const stateToColor = {
  success: 'green',
  action_required: 'red', // eslint-disable-line camelcase
  cancelled: 'red',
  error: 'red',
  failure: 'red',
  timed_out: 'red', // eslint-disable-line camelcase
  neutral: 'black',
  pending: 'yellow',
  test123: undefined,
};
const stateToExit = {
  success: 0,
  neutral: 0,
  action_required: 1, // eslint-disable-line camelcase
  cancelled: 1,
  error: 1,
  failure: 1,
  timed_out: 1, // eslint-disable-line camelcase
  pending: 2,
  test123: 3,
};
const stateToMarker = {
  success: '✔︎',
  action_required: '✖︎', // eslint-disable-line camelcase
  cancelled: '✖︎',
  error: '✖︎',
  failure: '✖︎',
  timed_out: '✖︎', // eslint-disable-line camelcase
  neutral: '◦',
  pending: '●',
  test123: '',
};

describe('githubCiStatus', () => {
  it('checks HEAD by default', async () => {
    fetchCiStatus.resolves([
      makeCombinedStatus('success').data,
      makeCheckRuns('success').data,
    ]);
    const result = await githubCiStatus(undefined, testOptions);
    assert.strictEqual(testOptions.stdout.read(), 'success\n');
    assert.strictEqual(testOptions.stderr.read(), null);
    assert.strictEqual(result, 0);

    sinon.assert.calledOnceWithExactly(getProjectName, undefined);
    sinon.assert.calledOnceWithExactly(resolveCommit, 'HEAD', undefined);
    sinon.assert.calledOnceWithExactly(
      fetchCiStatus,
      matchOwnerRepoRef,
      match({}),
    );
  });

  it('calls resolveCommit with rev argument', async () => {
    const testRev = 'mybranch';
    fetchCiStatus.resolves([
      makeCombinedStatus('success').data,
      makeCheckRuns('success').data,
    ]);
    await githubCiStatus(testRev, testOptions);
    sinon.assert.calledOnceWithExactly(resolveCommit, testRev, undefined);
    sinon.assert.calledOnceWithExactly(
      fetchCiStatus,
      matchOwnerRepoRef,
      match({}),
    );
  });

  it('propagates getProjectName error', async () => {
    const errTest = new Error('test');
    getProjectName.rejects(errTest);
    await assert.rejects(
      () => githubCiStatus(undefined, testOptions),
      errTest,
    );
    assert.strictEqual(testOptions.stdout.read(), null);
    assert.strictEqual(testOptions.stderr.read(), null);

    sinon.assert.calledOnceWithExactly(getProjectName, undefined);
    sinon.assert.callCount(fetchCiStatus, 0);
  });

  it('propagates getProjectName error', async () => {
    const errTest = new Error('test');
    resolveCommit.rejects(errTest);
    await assert.rejects(
      () => githubCiStatus(undefined, testOptions),
      errTest,
    );
    assert.strictEqual(testOptions.stdout.read(), null);
    assert.strictEqual(testOptions.stderr.read(), null);

    sinon.assert.calledOnceWithExactly(resolveCommit, 'HEAD', undefined);
    sinon.assert.callCount(fetchCiStatus, 0);
  });

  it('prints "no status" if no checks or statuses', async () => {
    fetchCiStatus.resolves([
      makeCombinedStatus().data,
      makeCheckRuns().data,
    ]);
    const result = await githubCiStatus(undefined, testOptions);
    assert.strictEqual(testOptions.stdout.read(), 'no status\n');
    assert.strictEqual(testOptions.stderr.read(), null);
    assert.strictEqual(result, 3);
  });

  it('does not colorize non-verbose output', async () => {
    fetchCiStatus.resolves([
      makeCombinedStatus('success').data,
      makeCheckRuns('failure').data,
    ]);
    await githubCiStatus(undefined, {
      ...testOptions,
      useColor: true,
    });
    assert.strictEqual(testOptions.stdout.read(), 'failure\n');
    assert.strictEqual(testOptions.stderr.read(), null);
  });

  for (let i = 1; i < statePriority.length; i += 1) {
    // eslint-disable-next-line no-loop-func
    it(`prefers ${statePriority[i]} to ${statePriority[i - 1]}`, async () => {
      const state1 = statePriority[i - 1];
      const state2 = statePriority[i];
      let fetchResult;
      if (state1 === 'pending') {
        fetchResult = [
          makeCombinedStatus('pending').data,
          makeCheckRuns(state2).data,
        ];
      } else if (state2 === 'pending') {
        fetchResult = [
          makeCombinedStatus('pending').data,
          makeCheckRuns(state1).data,
        ];
      } else {
        fetchResult = [makeCombinedStatus().data];
        // Swap order to ensure first/last isn't preferred
        if (i % 2) {
          fetchResult[1] = makeCheckRuns(state1, state2).data;
        } else {
          fetchResult[1] = makeCheckRuns(state2, state1).data;
        }
      }
      fetchCiStatus.resolves(fetchResult);
      await githubCiStatus(undefined, testOptions);
      assert.strictEqual(testOptions.stdout.read(), `${state2}\n`);
      assert.strictEqual(testOptions.stderr.read(), null);
    });
  }

  describe('with verbosity=1', () => {
    beforeEach(() => { testOptions.verbosity = 1; });

    it('prints "no status" if no checks or statuses', async () => {
      fetchCiStatus.resolves([
        makeCombinedStatus().data,
        makeCheckRuns().data,
      ]);
      await githubCiStatus(undefined, testOptions);
      assert.strictEqual(testOptions.stdout.read(), 'no status\n');
      assert.strictEqual(testOptions.stderr.read(), null);
    });

    for (const [state, marker] of Object.entries(stateToMarker)) {
      if (['success', 'pending', 'failure', 'test123'].includes(state)) {
        // eslint-disable-next-line no-loop-func
        it(`prints status ${state} with marker ${marker}`, async () => {
          fetchCiStatus.resolves([
            makeCombinedStatus(state).data,
            makeCheckRuns().data,
          ]);
          const result = await githubCiStatus(undefined, testOptions);
          assert.strictEqual(
            testOptions.stdout.read(),
            `${marker}\tcontinuous-integration/jenkins\t`
            + 'https://ci.example.com/1000/output\n',
          );
          assert.strictEqual(testOptions.stderr.read(), null);
          assert.strictEqual(result, stateToExit[state]);
        });
      }

      if (state !== 'pending') {
        // eslint-disable-next-line no-loop-func
        it(`prints check ${state} with marker ${marker}`, async () => {
          fetchCiStatus.resolves([
            makeCombinedStatus().data,
            makeCheckRuns(state).data,
          ]);
          const result = await githubCiStatus(undefined, testOptions);
          assert.strictEqual(
            testOptions.stdout.read(),
            `${marker}\tmighty_readme\t`
            + 'https://github.com/github/hello-world/runs/4\n',
          );
          assert.strictEqual(testOptions.stderr.read(), null);
          assert.strictEqual(result, stateToExit[state]);
        });
      }
    }

    it('pads second column with spaces to align URLs', async () => {
      fetchCiStatus.resolves([
        makeCombinedStatus('success').data,
        makeCheckRuns('success').data,
      ]);
      await githubCiStatus(undefined, testOptions);
      const marker = stateToMarker.success;
      assert.strictEqual(
        testOptions.stdout.read(),
        `${marker}\tcontinuous-integration/jenkins\t`
        + 'https://ci.example.com/1000/output\n'
        + `${marker}\tmighty_readme                 \t`
        + 'https://github.com/github/hello-world/runs/4\n',
      );
      assert.strictEqual(testOptions.stderr.read(), null);
    });

    it('omits padding without any URLs', async () => {
      const combinedStatus = makeCombinedStatus('success').data;
      const checkRuns = makeCheckRuns('success').data;
      /* eslint-disable camelcase */
      fetchCiStatus.resolves([
        {
          ...combinedStatus,
          statuses: combinedStatus.statuses.map((status) => ({
            ...status,
            target_url: '',
          })),
        },
        {
          ...checkRuns,
          check_runs: checkRuns.check_runs.map((checkRun) => ({
            ...checkRun,
            html_url: '',
          })),
        },
      ]);
      /* eslint-enable camelcase */
      await githubCiStatus(undefined, testOptions);
      const marker = stateToMarker.success;
      assert.strictEqual(
        testOptions.stdout.read(),
        `${marker}\tcontinuous-integration/jenkins\n`
        + `${marker}\tmighty_readme\n`,
      );
      assert.strictEqual(testOptions.stderr.read(), null);
    });

    it('colorizes if stdout.isTTY', async () => {
      fetchCiStatus.resolves([
        makeCombinedStatus('success').data,
        makeCheckRuns().data,
      ]);
      testOptions.stdout.isTTY = true;
      await githubCiStatus(undefined, testOptions);
      const { open, close } = ansiStyles[stateToColor.success];
      const marker = stateToMarker.success;
      assert.strictEqual(
        testOptions.stdout.read(),
        `${open}${marker}${close}\tcontinuous-integration/jenkins\t`
        + 'https://ci.example.com/1000/output\n',
      );
      assert.strictEqual(testOptions.stderr.read(), null);
    });

    describe('with useColor', () => {
      beforeEach(() => { testOptions.useColor = true; });

      for (const [state, colorName] of Object.entries(stateToColor)) {
        if (['success', 'pending', 'failure', 'test123'].includes(state)) {
          // eslint-disable-next-line no-loop-func
          it(`prints status ${state} in color ${colorName}`, async () => {
            fetchCiStatus.resolves([
              makeCombinedStatus(state).data,
              makeCheckRuns().data,
            ]);
            await githubCiStatus(undefined, testOptions);
            const { open, close } =
              colorName ? ansiStyles[colorName] : { open: '', close: '' };
            const marker = stateToMarker[state];
            assert.strictEqual(
              testOptions.stdout.read(),
              `${open}${marker}${close}\tcontinuous-integration/jenkins\t`
              + 'https://ci.example.com/1000/output\n',
            );
            assert.strictEqual(testOptions.stderr.read(), null);
          });
        }

        if (state !== 'pending') {
          // eslint-disable-next-line no-loop-func
          it(`prints check ${state} in color ${colorName}`, async () => {
            fetchCiStatus.resolves([
              makeCombinedStatus().data,
              makeCheckRuns(state).data,
            ]);
            await githubCiStatus(undefined, testOptions);
            const { open, close } =
              colorName ? ansiStyles[colorName] : { open: '', close: '' };
            const marker = stateToMarker[state];
            assert.strictEqual(
              testOptions.stdout.read(),
              `${open}${marker}${close}\tmighty_readme\t`
              + 'https://github.com/github/hello-world/runs/4\n',
            );
            assert.strictEqual(testOptions.stderr.read(), null);
          });
        }
      }
    });
  });

  describe('with verbosity=2', () => {
    beforeEach(() => { testOptions.verbosity = 2; });

    it('prints fetchCiStatus options.debug to stderr', async () => {
      const testMsg = 'test message 123';
      fetchCiStatus.callsFake(async (params, opts) => {
        opts.debug(testMsg);
        return [
          makeCombinedStatus('success').data,
          makeCheckRuns().data,
        ];
      });
      await githubCiStatus(undefined, testOptions);
      const marker = stateToMarker.success;
      assert.strictEqual(
        testOptions.stdout.read(),
        `${marker}\tcontinuous-integration/jenkins\t`
        + 'https://ci.example.com/1000/output\n',
      );
      assert.strictEqual(testOptions.stderr.read(), `DEBUG: ${testMsg}\n`);
    });
  });
});
