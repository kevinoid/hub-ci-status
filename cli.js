/**
 * @copyright Copyright 2017-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module "hub-ci-status/cli.js"
 */

import {
  Command,
  InvalidArgumentError,
  Option,
} from 'commander';

import getPackageJson from './lib/get-package-json.js';
import hubCiStatus from './index.js';

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
    throw new InvalidArgumentError(`Invalid number "${arg}"`);
  }

  if (val < 0) {
    throw new InvalidArgumentError('--wait must not be negative');
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
 *   env: Object<string,string>|undefined,
 *   stdin: !module:stream.Readable,
 *   stdout: !module:stream.Writable,
 *   stderr: !module:stream.Writable
 * }} CommandOptions
 * @property {Object<string,string>=} env Environment variables.
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
export default async function hubCiStatusMain(args, options) {
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

  let errVersion;
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
    .description('Command description.')
    .addOption(
      new Option('--color [when]', 'Colorize verbose output')
        .choices(colorOptions),
    )
    .option('-q, --quiet', 'print less output', countOption)
    .option('-v, --verbose', 'print more output', countOption)
    // TODO [engine:node@>=17.5]: .version(packageJson.version) from JSON import
    // See https://github.com/nodejs/node/pull/41736
    .option('-V, --version', 'output the version number')
    // throw exception to stop option parsing early, as commander does
    // (e.g. to avoid failing due to missing required arguments)
    .on('option:version', () => {
      errVersion = new Error('version');
      throw errVersion;
    })
    .option(
      '-w, --wait [seconds]',
      'retry while combined status is pending (with optional max time in sec)',
      coerceWait,
    )
    .option(
      '-W, --wait-all',
      'retry while any status is pending (implies --wait)',
    );

  try {
    command.parse(args);
  } catch (errParse) {
    if (errVersion) {
      const packageJson = await getPackageJson();
      options.stdout.write(`${packageJson.version}\n`);
      return 0;
    }

    // If a non-Commander error was thrown, treat it as unhandled.
    // It probably represents a bug and has not been written to stdout/stderr.
    // throw commander.{CommanderError,InvalidArgumentError} to avoid.
    if (typeof errParse.code !== 'string'
      || !errParse.code.startsWith('commander.')) {
      throw errParse;
    }

    return errParse.exitCode !== undefined ? errParse.exitCode : 1;
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
  try {
    return await gcs(ref, {
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
    options.stderr.write(`${verbosity > 1 ? err.stack : err}\n`);
    return 1;
  }
}
