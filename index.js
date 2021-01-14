/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { Octokit } = require('@octokit/rest');
const packageJson = require('./package.json');
const retryAsync = require('./lib/retry-async.js');

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

  return !options.wait ? getStatus() : retryAsync(getStatus, {
    maxWaitMs: options.wait,
    shouldRetry,
  });
};
