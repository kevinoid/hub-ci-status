/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { Octokit } = require('@octokit/rest');
const { Agent: HttpAgent } = require('http');
const { Agent: HttpsAgent } = require('https');
const timers = require('timers');
const { promisify } = require('util');

const getPackageJson = require('./get-package-json.js');
const retryAsync = require('./retry-async.js');
const {
  HttpAgentMockSymbol,
  HttpsAgentMockSymbol,
  OctokitMockSymbol,
} = require('./symbols.js');

// TODO [engine:node@>=15]: import { setTimeout } from 'timers/promises';
const setTimeoutP = promisify(timers.setTimeout);

module.exports =
async function fetchCiStatus(apiArgs, options = {}) {
  let agent;
  let { octokit } = options;
  if (octokit === undefined) {
    const {
      [HttpAgentMockSymbol]: HttpAgentMock,
      [HttpsAgentMockSymbol]: HttpsAgentMock,
      [OctokitMockSymbol]: OctokitMock,
    } = options;

    const packageJson = await getPackageJson();
    const octokitOptions = {
      userAgent: `${packageJson.name}/${packageJson.version}`,
      ...options.octokitOptions,
    };

    // If the caller did not provide an http.Agent, create one with keepAlive
    // so retries can reuse the same connections.
    if (options.retry
      && (!octokitOptions.request
        || octokitOptions.request.agent === undefined)) {
      const protocol =
        octokitOptions.baseUrl ? new URL(octokitOptions.baseUrl).protocol
          : 'https:';
      const Agent = protocol === 'https:' ? HttpsAgentMock || HttpsAgent
        : protocol === 'http:' ? HttpAgentMock || HttpAgent
          : undefined;
      if (Agent) {
        agent = new Agent({ keepAlive: true });
        octokitOptions.request = {
          ...octokitOptions.request,
          agent,
        };
      }
    }

    const OctokitOrMock = OctokitMock || Octokit;
    octokit = new OctokitOrMock(octokitOptions);
  }

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

  const { debug, retry, waitAll } = options;

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
      } else if (!waitAll && status.state !== 'success') {
        // Combined status is not pending and user didn't request wait all.
        return false;
      }
    }

    checkCount = checkRuns.length;
    checkWaitCount = 0;
    for (const checkRun of checkRuns) {
      if (checkRun.status === 'queued' || checkRun.status === 'in_progress') {
        checkWaitCount += 1;
      } else if (!waitAll
        && checkRun.conclusion !== 'success'
        && checkRun.conclusion !== 'neutral') {
        // Combined status is not pending and user didn't request wait all.
        return false;
      }
    }

    return statusWaitCount > 0
      || checkWaitCount > 0
      || (statusCount === 0 && checkCount === 0);
  }

  const retryOptions = {
    ...retry,
    shouldRetry,
  };

  if (debug) {
    const origSetTimeout = retryOptions.setTimeout || setTimeoutP;
    retryOptions.setTimeout = (delay, value, opts) => {
      let waitingFor;
      if (statusCount === 0 && checkCount === 0) {
        waitingFor = 'any CI status or check';
      } else {
        waitingFor = '';
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
      return origSetTimeout(delay, value, opts);
    };
  }

  try {
    return await (retry ? retryAsync(getBoth, retryOptions) : getBoth());
  } finally {
    if (agent) {
      agent.destroy();
    }
  }
};
