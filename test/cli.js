/**
 * @copyright Copyright 2016,2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import assert from 'assert';
import sinon from 'sinon';
import stream from 'stream';

import getPackageJson from '../lib/get-package-json.js';
import hubCiStatusCmd from '../cli.js';

const { match } = sinon;

// Simulate arguments passed by the node runtime
const RUNTIME_ARGS = ['node', 'hub-ci-status'];

function neverCalled() {
  assert.fail('Should never be called');
}

function getTestOptions() {
  return {
    env: Object.create(null),
    hubCiStatus: neverCalled,
    stdin: new stream.PassThrough(),
    stdout: new stream.PassThrough({ encoding: 'utf8' }),
    stderr: new stream.PassThrough({ encoding: 'utf8' }),
  };
}

describe('hub-ci-status command', () => {
  it('rejects TypeError with no arguments', () => {
    return assert.rejects(
      hubCiStatusCmd,
      TypeError,
    );
  });

  it('rejects TypeError for non-array-like args', () => {
    return assert.rejects(
      () => hubCiStatusCmd({}, getTestOptions()),
      TypeError,
    );
  });

  it('rejects TypeError for non-object options', () => {
    return assert.rejects(
      () => hubCiStatusCmd(RUNTIME_ARGS, true),
      TypeError,
    );
  });

  it('rejects TypeError for non-Readable stdin', () => {
    const options = {
      ...getTestOptions(),
      stdin: {},
    };
    return assert.rejects(
      () => hubCiStatusCmd(RUNTIME_ARGS, options),
      TypeError,
    );
  });

  it('rejects TypeError for non-Writable stdout', () => {
    const options = {
      ...getTestOptions(),
      stdout: new stream.Readable(),
    };
    return assert.rejects(
      () => hubCiStatusCmd(RUNTIME_ARGS, options),
      TypeError,
    );
  });

  it('rejects TypeError for non-Writable stderr', () => {
    const options = {
      ...getTestOptions(),
      stderr: new stream.Readable(),
    };
    return assert.rejects(
      () => hubCiStatusCmd(RUNTIME_ARGS, options),
      TypeError,
    );
  });

  for (const helpOpt of ['--help', '-h']) {
    it(`${helpOpt} prints help message to stdout`, async () => {
      const args = [...RUNTIME_ARGS, helpOpt];
      const options = getTestOptions();
      const exitCode = await hubCiStatusCmd(args, options);
      assert.strictEqual(options.stderr.read(), null);
      const output = options.stdout.read();
      assert(output, 'produces help output');
      assert.match(output, /--wait\b/);
      assert.strictEqual(exitCode, 0);
    });
  }

  for (const versionOpt of ['--version', '-V']) {
    it(`${versionOpt} prints version message to stdout`, async () => {
      const packageJson = await getPackageJson();
      const args = [...RUNTIME_ARGS, versionOpt];
      const options = getTestOptions();
      const exitCode = await hubCiStatusCmd(args, options);
      assert.strictEqual(options.stderr.read(), null);
      const output = options.stdout.read();
      assert.strictEqual(output, `${packageJson.version}\n`);
      assert.strictEqual(exitCode, 0);
    });
  }

  it('passes through options.stdout and stderr', async () => {
    const hubCiStatus = sinon.stub().resolves(0);
    const options = {
      ...getTestOptions(),
      hubCiStatus,
    };
    await hubCiStatusCmd(RUNTIME_ARGS, options);
    sinon.assert.callCount(hubCiStatus, 1);
    const gcsOptions = hubCiStatus.getCall(0).args[1];
    assert.strictEqual(gcsOptions.stderr, options.stderr);
    assert.strictEqual(gcsOptions.stdout, options.stdout);
  });

  it('passes $GITHUB_TOKEN as options.octokitOptions.auth', async () => {
    const hubCiStatus = sinon.stub().resolves(0);
    const testToken = '123abc';
    const options = {
      ...getTestOptions(),
      env: {
        GITHUB_TOKEN: testToken,
      },
      hubCiStatus,
    };
    await hubCiStatusCmd(RUNTIME_ARGS, options);
    sinon.assert.callCount(hubCiStatus, 1);
    const gcsOptions = hubCiStatus.getCall(0).args[1];
    assert.strictEqual(gcsOptions.octokitOptions.auth, testToken);
  });

  function expectArgsAs(args, expectRef, expectOptions) {
    const testDesc =
      `interprets ${args.join(' ')} as ${expectRef}, ${expectOptions}`;
    it(testDesc, async () => {
      const allArgs = [...RUNTIME_ARGS, ...args];
      const hubCiStatus = sinon.stub().resolves(0);
      const options = {
        ...getTestOptions(),
        hubCiStatus,
      };
      const exitCode = await hubCiStatusCmd(allArgs, options);
      assert.strictEqual(options.stderr.read(), null);
      assert.strictEqual(options.stdout.read(), null);
      assert.strictEqual(exitCode, 0);
      sinon.assert.calledOnceWithExactly(
        hubCiStatus,
        expectRef,
        expectOptions,
      );
    });
  }

  // Check individual arguments are handled correctly
  expectArgsAs([], undefined, match({
    auth: undefined,
    useColor: undefined,
    verbosity: 0,
    wait: undefined,
  }));
  expectArgsAs(['ref'], 'ref', match({
    auth: undefined,
    useColor: undefined,
    verbosity: 0,
    wait: undefined,
  }));
  expectArgsAs(['1234'], '1234', match({
    auth: undefined,
    useColor: undefined,
    verbosity: 0,
    wait: undefined,
  }));
  expectArgsAs(['--color'], undefined, match({ useColor: true }));
  expectArgsAs(['--color=always'], undefined, match({ useColor: true }));
  expectArgsAs(['--color=never'], undefined, match({ useColor: false }));
  // FIXME: I'd prefer --color behave like getopt_long(3) optional_argument,
  // but can't find a way to do it with yargs.  Consumes next arg for now.
  expectArgsAs(['--color', 'never'], undefined, match({ useColor: false }));
  expectArgsAs(['--quiet'], undefined, match({ verbosity: -1 }));
  expectArgsAs(['--quiet', 'ref'], 'ref', match({ verbosity: -1 }));
  expectArgsAs(['-q'], undefined, match({ verbosity: -1 }));
  expectArgsAs(['-q', 'ref'], 'ref', match({ verbosity: -1 }));
  expectArgsAs(['-qq'], undefined, match({ verbosity: -2 }));
  expectArgsAs(['--verbose'], undefined, match({ verbosity: 1 }));
  expectArgsAs(['--verbose', 'ref'], 'ref', match({ verbosity: 1 }));
  expectArgsAs(['-v'], undefined, match({ verbosity: 1 }));
  expectArgsAs(['-v', 'ref'], 'ref', match({ verbosity: 1 }));
  expectArgsAs(['-vv'], undefined, match({ verbosity: 2 }));
  expectArgsAs(['-qv'], undefined, match({ verbosity: 0 }));
  expectArgsAs(['--wait'], undefined, match({
    wait: { maxTotalMs: Infinity },
    waitAll: false,
  }));
  expectArgsAs(['--wait=60'], undefined, match({
    wait: { maxTotalMs: 60000 },
    waitAll: false,
  }));
  // FIXME: As above, would prefer getopt_long(3) optional_argument behavior
  expectArgsAs(['--wait', '60'], undefined, match({
    wait: { maxTotalMs: 60000 },
    waitAll: false,
  }));
  expectArgsAs(['-w'], undefined, match({
    wait: { maxTotalMs: Infinity },
    waitAll: false,
  }));
  expectArgsAs(['-w60'], undefined, match({
    wait: { maxTotalMs: 60000 },
    waitAll: false,
  }));
  // FIXME: As above, would prefer getopt_long(3) optional_argument behavior
  expectArgsAs(['-w', '60'], undefined, match({
    wait: { maxTotalMs: 60000 },
    waitAll: false,
  }));
  expectArgsAs(['--wait-all'], undefined, match({
    wait: { maxTotalMs: Infinity },
    waitAll: true,
  }));
  expectArgsAs(['--wait-all', '10'], '10', match({
    wait: { maxTotalMs: Infinity },
    waitAll: true,
  }));
  expectArgsAs(['--wait-all', '--wait', '10'], undefined, match({
    wait: { maxTotalMs: 10000 },
    waitAll: true,
  }));
  expectArgsAs(['--wait', '10', '--wait-all'], undefined, match({
    wait: { maxTotalMs: 10000 },
    waitAll: true,
  }));
  expectArgsAs(['-W'], undefined, match({
    wait: { maxTotalMs: Infinity },
    waitAll: true,
  }));
  expectArgsAs(['-w', '10', '-W'], undefined, match({
    wait: { maxTotalMs: 10000 },
    waitAll: true,
  }));
  // 0 wait value allowed to simplify script use
  expectArgsAs(['--wait', '0'], undefined, match({
    wait: { maxTotalMs: 0 },
    waitAll: false,
  }));
  expectArgsAs(['--wait-all', '--wait', '0'], undefined, match({
    wait: { maxTotalMs: 0 },
    waitAll: true,
  }));

  function expectArgsErr(args, expectErrMsg) {
    it(`prints error and exits for ${args.join(' ')}`, async () => {
      const allArgs = [...RUNTIME_ARGS, ...args];
      const options = getTestOptions();
      const exitCode = await hubCiStatusCmd(allArgs, options);
      assert.strictEqual(options.stdout.read(), null);
      assert.match(options.stderr.read(), expectErrMsg);
      assert.strictEqual(exitCode, 1);
    });
  }

  // Check argument errors are handled correctly
  expectArgsErr(['--color=maybe'], /\bcolor\b/);
  expectArgsErr(['--color='], /\bcolor\b/);
  expectArgsErr(['--wait=nope'], /\bwait\b/);
  expectArgsErr(['--wait='], /\bwait\b/);
  expectArgsErr(['--wait=-1'], /\bwait\b/);
  expectArgsErr(['-wnope'], /\bwait\b/);
  expectArgsErr(['-w-1'], /\bwait\b/);
  // Note: commander treats negative values for optional arguments as unknown
  // https://github.com/tj/commander.js/issues/61
  // https://github.com/tj/commander.js/pull/583#issuecomment-486819992
  expectArgsErr(['--wait', '-1'], /\bunknown option\b/);
  expectArgsErr(['-w', '-1'], /\bunknown option\b/);
  expectArgsErr(['--unknown123'], /\bunknown123\b/);
  // Note: Differs from hub(1), which ignores unexpected ci-status arguments.
  expectArgsErr(['ref1', 'ref2'], /\barguments?\b/i);

  it('prints hubCiStatus rejection to stderr', async () => {
    const errTest = new RangeError('test');
    const hubCiStatus = sinon.stub().rejects(errTest);
    const options = {
      ...getTestOptions(),
      hubCiStatus,
    };
    const exitCode = await hubCiStatusCmd(RUNTIME_ARGS, options);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), `${errTest}\n`);
    assert.strictEqual(exitCode, 1);
  });

  it('prints hubCiStatus rejection stack if very verbose', async () => {
    const args = [...RUNTIME_ARGS, '-vv'];
    const errTest = new RangeError('test');
    const hubCiStatus = sinon.stub().rejects(errTest);
    const options = {
      ...getTestOptions(),
      hubCiStatus,
    };
    const exitCode = await hubCiStatusCmd(args, options);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), `${errTest.stack}\n`);
    assert.strictEqual(exitCode, 1);
  });
});
