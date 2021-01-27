/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

// TODO [engine:node@>=12.10]: Use fs.rmdir({recursive: true})
const rimraf = require('rimraf');
const { promisify } = require('util');

const execFileOut = require('../lib/exec-file-out.js');

const rimrafP = promisify(rimraf);

module.exports = function gitInit(repoPath, defaultBranch) {
  return rimrafP(repoPath)
    .then(async () => {
      try {
        await execFileOut(
          'git',
          // git-init(1) in 2.30.0 warns that default branch subject to change.
          // It may also have non-default global- or user-configuration.
          // Specify --initial-branch to avoid depending on default
          ['init', '-q', `--initial-branch=${defaultBranch}`, repoPath],
        );
      } catch {
        // git < 2.28.0 doesn't understand --initial-branch, default is master
        await execFileOut('git', ['init', '-q', repoPath]);
        if (defaultBranch !== 'master') {
          await execFileOut(
            'git',
            ['symbolic-ref', 'HEAD', `refs/heads/${defaultBranch}`],
            { cwd: repoPath },
          );
        }
      }
    })
    // The user name and email must be configured for the later git commands
    // to work.  On Travis CI (and probably others) there is no global config
    .then(() => execFileOut(
      'git',
      ['-C', repoPath, 'config', 'user.name', 'Test User'],
    ))
    .then(() => execFileOut(
      'git',
      ['-C', repoPath, 'config', 'user.email', 'test@example.com'],
    ));
};
