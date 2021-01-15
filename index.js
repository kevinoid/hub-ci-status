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

module.exports =
function githubCiStatus(owner, repo, ref, options = {}) {
  const octokit = new Octokit({
    userAgent: `${packageJson.name}/${packageJson.version}`,
    ...options,
  });

  const apiArgs = {
    owner,
    repo,
    ref,
  };

  async function getStatus() {
    const response = await octokit.repos.getCombinedStatusForRef(apiArgs);
    return response.data;
  }

  async function listForRef() {
    const response = await octokit.checks.listForRef(apiArgs);
    return response.data;
  }

  function getBoth() {
    return Promise.all([
      getStatus(),
      listForRef(),
    ]);
  }

  let statusCount = 0;
  let statusWaitCount = 0;
  let checkCount = 0;
  let checkWaitCount = 0;
  function shouldRetry([combinedStatus, checksList]) {
    const { statuses } = combinedStatus;
    const checkRuns = checksList.check_runs;

    statusCount = statuses.length;
    statusWaitCount = 0;
    for (const status of statuses) {
      if (status.state === 'pending') {
        statusWaitCount += 1;
      }
    }

    checkCount = checkRuns.length;
    checkWaitCount = 0;
    for (const checkRun of checkRuns) {
      if (checkRun.status === 'queued' || checkRun.status === 'in_progress') {
        checkWaitCount += 1;
      }
    }

    return statusWaitCount > 0
      || checkWaitCount > 0
      || (statusCount === 0 && checkCount === 0);
  }

  const retryOptions = {
    maxWaitMs: options.wait,
    shouldRetry,
  };

  if (options.debug) {
    retryOptions.setTimeout = (delay, value, opts) => {
      let waitingFor;
      if (statusCount === 0 && checkCount === 0) {
        waitingFor = 'any CI status or check';
      } else {
        if (statusWaitCount > 0) {
          waitingFor += `${statusWaitCount}/${statusCount} CI statuses`;
        }
        if (checkWaitCount > 0) {
          if (waitingFor) {
            waitingFor += ' and ';
          }
          waitingFor += `${checkWaitCount}/${checkCount} checks`;
        }
      }

      options.debug(
        `Waiting for ${waitingFor}.  Retry in ${delay / 1000} seconds...`,
      );
      return setTimeoutP(delay, value, opts);
    };
  }

  return !options.wait ? getBoth() : retryAsync(getBoth, retryOptions);
};
