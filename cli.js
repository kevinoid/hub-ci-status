/**
 * @copyright Copyright 2017-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module hub-ci-status/cli.js
 */

'use strict';

const {
  Command,
  InvalidOptionArgumentError,
  Option,
} = require('commander');

const packageJson = require('./package.json');
const hubCiStatus = require('.');

// Same --color options as hub(1)
const colorOptions = ['always', 'never', 'auto'];

function coerceWait(arg) {
  if (arg === true) {
    // Treat --wait without argument as infinite wait.
    return Infinity;
  }

  // Note: Don't treat '' as 0 (no wait), since it's more likely user error
  const val = Number(arg);
  if (arg === '' || Number.isNaN(val)) {
    throw new InvalidOptionArgumentError(`Invalid number "${arg}"`);
  }

  if (val < 0) {
    throw new InvalidOptionArgumentError('--wait must not be negative');
  }

  return val;
}

/** Option parser to count the number of occurrences of the option.
 *
 * @private
 * @param {boolean|string} optarg Argument passed to option (ignored).
 * @param {number=} previous Previous value of option (counter).
 * @returns {number} previous + 1.
 */
function countOption(optarg, previous) {
  return (previous || 0) + 1;
}

/** Options for command entry points.
 *
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
 * @param {Array<string>} args Command-line arguments.
 * @param {!CommandOptions} options Options.
 * @param {function(number)} callback Callback with exit code.
 */
function hubCiStatusMain(args, options, callback) {
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

  const command = new Command()
    .exitOverride()
    .configureOutput({
      writeOut: (str) => options.stdout.write(str),
      writeErr: (str) => options.stderr.write(str),
      getOutHelpWidth: () => options.stdout.columns,
      getErrHelpWidth: () => options.stderr.columns,
    })
    .arguments('[ref]')
    .allowExcessArguments(false)
    // Check for required/excess arguments.
    // Workaround https://github.com/tj/commander.js/issues/1493
    .action(() => {})
    .description('Command description.')
    .addOption(
      new Option('--color [when]', 'Colorize verbose output')
        .choices(colorOptions),
    )
    .option('-q, --quiet', 'Print less output', countOption)
    .option('-v, --verbose', 'Print more output', countOption)
    .option(
      '-w, --wait [seconds]',
      'Retry while combined status is pending (with optional max time in sec)',
      coerceWait,
    )
    .option(
      '-W, --wait-all',
      'Retry while any status is pending (implies --wait)',
    )
    .version(packageJson.version);

  try {
    command.parse(args);
  } catch (errParse) {
    const exitCode =
      errParse.exitCode !== undefined ? errParse.exitCode : 1;
    process.nextTick(callback, exitCode);
    return;
  }

  const argOpts = command.opts();
  const maxTotalMs =
    typeof argOpts.wait === 'number' ? argOpts.wait * 1000
      : argOpts.wait || argOpts.waitAll ? Infinity
        : undefined;
  const useColor =
    argOpts.color === 'never' ? false
      : argOpts.color === 'always' || argOpts.color === true ? true
        : undefined;
  const ref = command.args[0];
  const verbosity = (argOpts.verbose || 0) - (argOpts.quiet || 0);

  const gcs = options.hubCiStatus || hubCiStatus;
  // eslint-disable-next-line promise/catch-or-return
  gcs(ref, {
    octokitOptions: {
      auth: options.env ? options.env.GITHUB_TOKEN : undefined,
    },
    stderr: options.stderr,
    stdout: options.stdout,
    useColor,
    verbosity,
    wait: maxTotalMs === undefined ? undefined : { maxTotalMs },
    waitAll: !!argOpts.waitAll,
  })
    .then(
      () => 0,
      (err) => {
        options.stderr.write(`${verbosity > 1 ? err.stack : err}\n`);
        return 1;
      },
    )
    // Note: nextTick for unhandledException (like util.callbackify)
    .then((exitCode) => process.nextTick(callback, exitCode));
}

module.exports = hubCiStatusMain;
