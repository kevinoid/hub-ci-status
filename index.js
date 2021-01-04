/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { Octokit } = require('@octokit/rest');
const packageJson = require('./package.json');

module.exports =
async function githubCiStatus(owner, repo, ref, options) {
  const octokit = new Octokit({
    userAgent: `${packageJson.name}/${packageJson.version}`,
    ...options,
  });
  const response = await octokit.repos.getCombinedStatusForRef({
    owner,
    repo,
    ref,
  });
  return response.data;
};
