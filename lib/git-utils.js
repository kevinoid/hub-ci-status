/**
 * @copyright Copyright 2017, 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import { pathToFileURL } from 'url';
import execFileOut from './exec-file-out.js';

/** Is this process running on Windows?
 *
 * @constant
 * @type {boolean}
 * @private
 */
const isWindows = /^win/i.test(process.platform);

const configScopes = Object.freeze(Object.assign(Object.create(null), {
  global: 'global',
  local: 'local',
  system: 'system',
  worktree: 'worktree',
}));

function trim(str) {
  return String.prototype.trim.call(str);
}

/** Gets the name of the current branch.
 *
 * @param {module:child_process.ExecFileOptions=} options Options to pass to
 * {@link child_process.execFile}.
 * @returns {!Promise<string>} Name of current branch or Error if not on a
 * branch, not in a git repository, or another error occurs.
 * @private
 */
export function getBranch(options) {
  return execFileOut('git', ['symbolic-ref', '-q', '--short', 'HEAD'], options)
    .then(trim)
    .catch((err) => {
      throw new Error(`Unable to determine current branch: ${err.message}`);
    });
}

/** Parse output of `git config --null`.
 *
 * @param {!Buffer} configData Output from `git config --null`.
 * @returns {!Object<string, string>} Map of configuration keys to values.
 * @private
 */
function parseConfigOutput(configData) {
  const config = Object.create(null);
  let keyStart = 0;
  let valueEnd = configData.indexOf(0, keyStart);
  while (valueEnd > keyStart) {
    const keyEnd = configData.indexOf(0xA, keyStart);
    if (keyEnd < 0 || keyEnd >= valueEnd) {
      throw new Error(
        `Invalid config output: '\\n' Not found in '${
          configData.slice(keyStart, valueEnd)}' (byte offset ${
          keyStart} and ${valueEnd})`,
      );
    }

    const key = configData.toString('utf8', keyStart, keyEnd);
    const value = configData.toString('utf8', keyEnd + 1, valueEnd);
    config[key] = value;
    keyStart = valueEnd + 1;
    valueEnd = configData.indexOf(0, keyStart);
  }
  if (keyStart !== configData.length) {
    throw new Error(
      `Invalid config output: Data after last '\\0': '${
        configData.slice(keyStart)}'`,
    );
  }
  return config;
}

/** Gets config values.
 *
 * @param {?string} scope Configuration scope for which to get values.
 * @param {module:child_process.ExecFileOptions=} options Options to pass to
 * {@link child_process.execFile}.
 * @returns {!Promise<!Object<string, string>>} Promise for an object which maps
 * configuration names to values in the requested scope.
 * @throws RangeError If scope is not a recognized configuration scope.
 * @throws module:child_process.ExecException If an error occurs when
 * executing git.
 * @throws Error If an error occurs when parsing the git config output.
 * @private
 */
export async function getConfig(scope, options) {
  if (scope !== undefined && scope !== null && !configScopes[scope]) {
    throw new RangeError(`Invalid scope "${scope}"`);
  }

  const gitArgs = ['config', '--list', '--null'];
  if (scope) {
    gitArgs.push(`--${scope}`);
  }

  const configData = await execFileOut(
    'git',
    gitArgs,
    {
      ...options,
      encoding: 'buffer',
    },
  );
  return parseConfigOutput(configData);
}

/** Is git URL a local path?
 * From url_is_local_not_ssh in connect.c
 *
 * @param {string} gitUrl Git URL to check.
 * @returns {boolean} <code>true</code> if <code>gitUrl</code> represents a
 * local path.
 * @private
 */
export function gitUrlIsLocalNotSsh(gitUrl) {
  return !/^[^/]*:/.test(gitUrl)
    || (isWindows && /^[A-Za-z]:/.test(gitUrl));
}

/** Parses a git URL string into a URL object like {@link url.parse} with
 * support for git helpers, git's SCP-like URL syntax, and local file paths.
 *
 * @param {string} gitUrl Git URL to check.
 * @returns {URL} URL object with a <code>.helper</code> property if the URL
 * included a remote helper.
 * @throws {TypeError} If gitUrl can not be parsed as a URL.
 * @private
 */
export function parseGitUrl(gitUrl) {
  if (gitUrlIsLocalNotSsh(gitUrl)) {
    const fileUrlObj = pathToFileURL(gitUrl);
    fileUrlObj.helper = undefined;
    return fileUrlObj;
  }

  // Foreign URL for remote helper
  // See transport_get in transport.c and git-remote-helpers(1)
  const helperParts = /^([A-Za-z0-9][A-Za-z0-9+.-]*)::(.*)$/.exec(gitUrl);
  let helper;
  if (helperParts) {
    [, helper, gitUrl] = helperParts;
  }

  // SCP-like syntax.  Host can be wrapped in [] to disambiguate path.
  // See parse_connect_url and host_end in connect.c
  const scpParts = /^([^@/]+@(?:\[[^]\/]+\]|[^:/]+)):(.*)$/.exec(gitUrl);
  if (scpParts) {
    gitUrl = `ssh://${scpParts[1]}/${scpParts[2]}`;
  }

  const gitUrlObj = new URL(gitUrl);
  gitUrlObj.helper = helper;
  return gitUrlObj;
}

/** Resolve a named commit to its hash.
 *
 * @param {string} commitName Name of commit to resolve.
 * @param {module:child_process.ExecFileOptions=} options Options to pass to
 * {@link child_process.execFile}.
 * @returns {!Promise<string>} Commit hash for <code>commitName</code> or Error
 * if <code>commitName</code> can not be resolved.
 * @private
 */
export async function resolveCommit(commitName, options) {
  try {
    const sha = await execFileOut(
      'git',
      ['rev-parse', '--verify', commitName],
      options,
    );
    return sha.trim();
  } catch (err) {
    err.message =
      `Unable to resolve '${commitName}' to a commit hash: ${err.message}`;
    throw err;
  }
}
