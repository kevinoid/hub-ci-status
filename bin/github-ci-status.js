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
const githubCiStatus = require('..');

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
    .usage('Usage: $0 [options] <owner> <repo> <ref>')
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
    .version(`${packageJson.name} ${packageJson.version}`)
    .alias('version', 'V')
    .strict();
  yargs.parse(args, (errYargs, argOpts, output) => {
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

    if (argOpts._.length !== 3) {
      options.stderr.write(
        `Error: Expected 3 arguments, got ${argOpts._.length}.\n`,
      );
      callback(1);
      return;
    }

    const [owner, repo, ref] = argOpts._;
    const auth = process.env.GITHUB_TOKEN;
    // eslint-disable-next-line promise/catch-or-return
    githubCiStatus(owner, repo, ref, { auth })
      .then((combinedStatus) => {
        options.stdout.write(`${combinedStatus.state}\n`);
        return 0;
      })
      .catch((err) => {
        options.stderr.write(`${err}\n`);
        return 1;
      })
      // Note: nextTick for unhandledException (like util.callbackify)
      .then((exitCode) => process.nextTick(callback, exitCode));
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
