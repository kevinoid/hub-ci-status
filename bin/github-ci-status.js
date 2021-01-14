#!/usr/bin/env node
/**
 * Executable script to query the CI status for a commit on GitHub.
 *
 * @copyright Copyright 2017-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const Yargs = require('yargs/yargs');

const { resolveCommit } = require('../lib/git-utils.js');
const { getProjectName } = require('../lib/github-utils.js');
const packageJson = require('../package.json');
const githubCiStatus = require('..');

// Use same "severity" as hub(1) for determining state
// https://github.com/github/hub/blob/v2.14.2/commands/ci_status.go#L60-L69
const stateBySeverity = [
  'neutral',
  'success',
  'pending',
  'cancelled',
  'timed_out',
  'action_required',
  'failure',
  'error',
];

function coerceWait(arg) {
  if (arg === true) {
    // Treat --wait without argument as infinite wait.
    return Infinity;
  }

  const val = Number(arg);
  if (Number.isNaN(val)) {
    throw new TypeError(`Invalid number "${arg}"`);
  }

  return val;
}

function getStateMarker(state) {
  // Use same status markers as `hub ci-status`
  // https://github.com/github/hub/blob/v2.14.2/commands/ci_status.go#L158-L171
  switch (state) {
    case 'success':
      return '✔︎';

    case 'action_required':
    case 'cancelled':
    case 'error':
    case 'failure':
    case 'timed_out':
      return '✖︎';

    case 'neutral':
      return '◦';

    case 'pending':
      return '●';

    default:
      return '';
  }
}

function formatStatus(status, contextWidth) {
  const stateMarker = getStateMarker(status.state);
  const context = status.context.padEnd(contextWidth);
  const targetUrl = status.target_url ? `\t${status.target_url}` : '';
  return `${stateMarker}\t${context}${targetUrl}`;
}

function formatStatuses(statuses) {
  const maxWidth = statuses.reduce(
    (max, { context }) => Math.max(max, context.length),
    0,
  );
  return statuses.map((status) => formatStatus(status, maxWidth)).join('\n');
}

function getState(combinedStatus) {
  const bestSeverity = combinedStatus.statuses.reduce((maxSeverity, status) => {
    const severity = stateBySeverity.indexOf(status.state);
    return Math.max(severity, maxSeverity);
  }, -1);
  return stateBySeverity[bestSeverity] || '';
}

function stateToExitCode(state) {
  // Use same exit codes as `hub ci-status`
  // https://github.com/github/hub/blob/v2.14.2/commands/ci_status.go#L115-L125
  switch (state) {
    case 'neutral':
    case 'success':
      return 0;

    case 'action_required':
    case 'cancelled':
    case 'error':
    case 'failure':
    case 'timed_out':
      return 1;

    case 'pending':
      return 2;

    default:
      return 3;
  }
}

/** Options for command entry points.
 *
 * @typedef {{
 *   stdin: !module:stream.Readable,
 *   stdout: !module:stream.Writable,
 *   stderr: !module:stream.Writable
 * }} CommandOptions
 * @property {!module:stream.Readable} stdin Stream from which input is read.
 * @property {!module:stream.Writable} stdout Stream to which output is
 * written.
 * @property {!module:stream.Writable} stderr Stream to which errors and
 * non-output status messages are written.
 */
// const CommandOptions;

/** Entry point for this command.
 *
 * @param {Array<string>} args Command-line arguments.
 * @param {!CommandOptions} options Options.
 * @param {function(number)} callback Callback with exit code.
 */
function githubCiStatusCmd(args, options, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  if (args !== undefined
      && args !== null
      && Math.floor(args.length) !== args.length) {
    throw new TypeError('args must be Array-like');
  }

  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  if (!options.stdin || typeof options.stdin.on !== 'function') {
    throw new TypeError('options.stdin must be a stream.Readable');
  }
  if (!options.stdout || typeof options.stdout.write !== 'function') {
    throw new TypeError('options.stdout must be a stream.Writable');
  }
  if (!options.stderr || typeof options.stderr.write !== 'function') {
    throw new TypeError('options.stderr must be a stream.Writable');
  }

  if (args.length >= 2) {
    // Strip "node" and script name, ensure args are strings
    args = Array.prototype.slice.call(args, 2).map(String);
  } else {
    args = [];
  }

  const yargs = new Yargs()
    .parserConfiguration({
      'parse-numbers': false,
      'duplicate-arguments-array': false,
      'flatten-duplicate-arrays': false,
      'greedy-arrays': false,
    })
    .usage('Usage: $0 [options] [ref]')
    .help()
    .alias('help', 'h')
    .alias('help', '?')
    .option('quiet', {
      alias: 'q',
      describe: 'Print less output',
      count: true,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Print more output',
      count: true,
    })
    .option('wait', {
      alias: 'w',
      describe: 'Retry while status is pending (with optional max time in sec)',
      defaultDescription: 'Infinity',
      coerce: coerceWait,
    })
    .version(`${packageJson.name} ${packageJson.version}`)
    .alias('version', 'V')
    .strict();
  yargs.parse(args, async (errYargs, argOpts, output) => {
    if (errYargs) {
      options.stderr.write(`${output || errYargs}\n`);
      callback(1);
      return;
    }

    if (output) {
      options.stdout.write(`${output}\n`);
    }

    if (argOpts.help || argOpts.version) {
      callback(0);
      return;
    }

    if (argOpts._.length > 1) {
      options.stderr.write(
        `Error: Expected at most 1 argument, got ${argOpts._.length}.\n`,
      );
      callback(1);
      return;
    }

    let exitCode = 0;
    try {
      const verbosity = (argOpts.verbose || 0) - (argOpts.quiet || 0);

      const ref = argOpts._[0] || 'HEAD';
      const [[owner, repo], sha] = await Promise.all([
        getProjectName(),
        resolveCommit(ref),
      ]);
      const auth = process.env.GITHUB_TOKEN;
      const combinedStatus = await githubCiStatus(owner, repo, sha, {
        auth,
        wait: argOpts.wait ? argOpts.wait * 1000 : undefined,
      });

      const state = getState(combinedStatus);
      if (verbosity >= 0) {
        const formatted =
          verbosity === 0 ? state : formatStatuses(combinedStatus.statuses);
        options.stdout.write(`${formatted || 'no status'}\n`);
      }

      exitCode = stateToExitCode(state);
    } catch (err) {
      exitCode = 1;
      options.stderr.write(`${err}\n`);
    }

    callback(exitCode);
  });
}

githubCiStatusCmd.default = githubCiStatusCmd;
module.exports = githubCiStatusCmd;

if (require.main === module) {
  // This file was invoked directly.
  // Note:  Could pass process.exit as callback to force immediate exit.
  githubCiStatusCmd(process.argv, process, (exitCode) => {
    process.exitCode = exitCode;
  });
}
