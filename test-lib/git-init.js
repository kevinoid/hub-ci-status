/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import execFileOut from '../lib/exec-file-out.js';

export default async function gitInit(repoPath, defaultBranch) {
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

  // The user name and email must be configured for the later git commands
  // to work.  On Travis CI (and probably others) there is no global config
  await execFileOut(
    'git',
    ['-C', repoPath, 'config', 'user.name', 'Test User'],
  );

  await execFileOut(
    'git',
    ['-C', repoPath, 'config', 'user.email', 'test@example.com'],
  );
}
