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

const hubCiStatus = require('.');
const getPackageJson = require('./lib/get-package-json.js');

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
 * @param {!Array<string>} args Command-line arguments.
 * @param {!CommandOptions} options Options.
 * @returns {!Promise<number>} Promise for exit code.  Only rejected for
 * arguments with invalid type (or args.length < 2).
 */
async function hubCiStatusMain(args, options) {
  if (!Array.isArray(args) || args.length < 2) {
    throw new TypeError('args must be an Array with at least 2 items');
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
    // TODO: Replace with .version(packageJson.version) loaded as JSON module
    // https://github.com/nodejs/node/issues/37141
    .option('-V, --version', 'output the version number')
    .option(
      '-w, --wait [seconds]',
      'Retry while combined status is pending (with optional max time in sec)',
      coerceWait,
    )
    .option(
      '-W, --wait-all',
      'Retry while any status is pending (implies --wait)',
    );

  try {
    command.parse(args);
  } catch (errParse) {
    // Note: Error message already printed to stderr by Commander
    return errParse.exitCode !== undefined ? errParse.exitCode : 1;
  }

  const argOpts = command.opts();

  if (argOpts.version) {
    const packageJson = await getPackageJson();
    options.stdout.write(`${packageJson.version}\n`);
    return 0;
  }

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
  try {
    await gcs(ref, {
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
    return 0;
  } catch (err) {
    options.stderr.write(`${verbosity > 1 ? err.stack : err}\n`);
    return 1;
  }
}

module.exports = hubCiStatusMain;
