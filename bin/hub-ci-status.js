#!/usr/bin/env node
/**
 * Executable script to query the CI status for a commit on GitHub.
 *
 * @copyright Copyright 2017-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const Yargs = require('yargs/yargs');

const packageJson = require('../package.json');
const hubCiStatus = require('..');

// Same --color options as hub(1)
const colorOptions = ['always', 'never', 'auto'];

function coerceColor(arg) {
  if (arg === true) {
    // Treat --color without argument as 'always'.
    return 'always';
  }

  if (colorOptions.includes(arg)) {
    return arg;
  }

  throw new RangeError(
    `Unrecognized --color argument '${arg}'.  Choices: ${
      colorOptions.join(', ')}`,
  );
}

function coerceWait(arg) {
  if (arg === true) {
    // Treat --wait without argument as infinite wait.
    return Infinity;
  }

  // Note: Don't treat '' as 0 (no wait), since it's more likely user error
  const val = Number(arg);
  if (arg === '' || Number.isNaN(val)) {
    throw new TypeError(`Invalid number "${arg}"`);
  }

  if (val < 0) {
    throw new RangeError('--wait must not be negative');
  }

  return val;
}

/** Options for command entry points.
 *
 * @private
 * @typedef {{
 *   env: object<string,string>|undefined,
 *   stdin: !module:stream.Readable,
 *   stdout: !module:stream.Writable,
 *   stderr: !module:stream.Writable
 * }} CommandOptions
 * @property {object<string,string>=} env Environment variables.
 * @property {!module:stream.Readable} stdin Stream from which input is read.
 * @property {!module:stream.Writable} stdout Stream to which output is
 * written.
 * @property {!module:stream.Writable} stderr Stream to which errors and
 * non-output status messages are written.
 */
// const CommandOptions;

/** Entry point for this command.
 *
 * @private
 * @param {Array<string>} args Command-line arguments.
 * @param {!CommandOptions} options Options.
 * @param {function(number)} callback Callback with exit code.
 */
function hubCiStatusCmd(args, options, callback) {
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
      'parse-positional-numbers': false,
      'duplicate-arguments-array': false,
      'flatten-duplicate-arrays': false,
      'greedy-arrays': false,
    })
    .usage('Usage: $0 [options] [ref]')
    .help()
    .alias('help', 'h')
    .alias('help', '?')
    .options('color', {
      describe: `Colorize verbose output (${colorOptions.join('|')})`,
      coerce: coerceColor,
    })
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
      describe: 'Retry while combined status is pending'
        + ' (with optional max time in sec)',
      defaultDescription: 'Infinity',
      coerce: coerceWait,
    })
    .options('wait-all', {
      alias: 'W',
      boolean: true,
      describe: 'Retry while any status is pending (implies --wait)',
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

    const maxTotalMs = argOpts.wait !== undefined ? argOpts.wait * 1000
      : argOpts.waitAll ? Infinity
        : undefined;
    const useColor = argOpts.color === 'never' ? false
      : argOpts.color === 'always' ? true
        : undefined;
    const ref = argOpts._[0];
    const verbosity = (argOpts.verbose || 0) - (argOpts.quiet || 0);

    let exitCode = 0;
    try {
      const gcs = options.hubCiStatus || hubCiStatus;
      exitCode = await gcs(ref, {
        octokitOptions: {
          auth: options.env ? options.env.GITHUB_TOKEN : undefined,
        },
        stderr: options.stderr,
        stdout: options.stdout,
        useColor,
        verbosity,
        wait: maxTotalMs === undefined ? undefined : { maxTotalMs },
        waitAll: !!argOpts.waitAll,
      });
    } catch (err) {
      exitCode = 1;
      options.stderr.write(`${verbosity > 1 ? err.stack : err}\n`);
    }

    callback(exitCode);
  });
}

module.exports = hubCiStatusCmd;

if (require.main === module) {
  // This file was invoked directly.
  // Note:  Could pass process.exit as callback to force immediate exit.
  hubCiStatusCmd(process.argv, process, (exitCode) => {
    process.exitCode = exitCode;
  });
}
