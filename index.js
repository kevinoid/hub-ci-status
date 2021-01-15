/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { Octokit } = require('@octokit/rest');
const timers = require('timers');
const { promisify } = require('util');

const packageJson = require('./package.json');
const retryAsync = require('./lib/retry-async.js');

// TODO [engine:node@>=15]: import { setTimeout } from 'timers/promises';
const setTimeoutP = promisify(timers.setTimeout);

function shouldRetry({ state }) {
  return state === 'pending';
}

module.exports =
function githubCiStatus(owner, repo, ref, options) {
  const octokit = new Octokit({
    userAgent: `${packageJson.name}/${packageJson.version}`,
    ...options,
  });

  async function getStatus() {
    const response = await octokit.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref,
    });
    return response.data;
  }

  const retryOptions = {
    maxWaitMs: options.wait,
    shouldRetry,
  };
  if (options.debug) {
    retryOptions.setTimeout = (delay, value, opts) => {
      options.debug(
        'GitHub CI status pending.  '
        + `Waiting ${delay / 1000} seconds before retrying...`,
      );
      return setTimeoutP(delay, value, opts);
    };
  }
  return !options.wait ? getStatus() : retryAsync(getStatus, retryOptions);
};
