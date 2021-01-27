/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { dir: makeTempDir } = require('tmp-promise');

const assert = require('../../test-lib/assert-backports');
const execFileOut = require('../../lib/exec-file-out.js');
const gitInit = require('../../test-lib/git-init.js');
const { getProjectName } = require('../../lib/github-utils.js');
const packageJson = require('../../package.json');
const { resolveCommit } = require('../../lib/git-utils.js');

const defaultBranch = 'main';
const isWindows = /^win/i.test(process.platform);

/** Path to repository in which tests are run. */
let testRepoPath;
let gitOptions;
before('setup test repository', async function() {
  // Some git versions can run quite slowly on Windows
  this.timeout(isWindows ? 8000 : 4000);

  const tempDir = await makeTempDir({
    prefix: `${packageJson.name}-test`,
    unsafeCleanup: true,
  });
  testRepoPath = tempDir.path;
  gitOptions = { cwd: testRepoPath };
  after('remove test repository', () => tempDir.cleanup());

  await gitInit(testRepoPath, defaultBranch);
});

// Prefer consistent formatting of arrow functions passed to it()
/* eslint-disable arrow-body-style */

describe('githubUtils', () => {
  describe('.getProjectName', () => {
    describe('with init repo', () => {
      it('throws UnknownProjectError', () => {
        return assert.rejects(
          () => getProjectName(gitOptions),
          (err) => {
            assert(err instanceof Error);
            assert.strictEqual(err.name, 'UnknownProjectError');
            return true;
          },
        );
      });
    });

    describe('on branch w/o remote', () => {
      before(() => execFileOut(
        'git',
        ['commit', '-q', '-m', 'Initial Commit', '--allow-empty'],
        gitOptions,
      ));

      it('throws UnknownProjectError', () => {
        return assert.rejects(
          () => getProjectName(gitOptions),
          (err) => {
            assert(err instanceof Error);
            assert.strictEqual(err.name, 'UnknownProjectError');
            return true;
          },
        );
      });
    });

    describe('not on branch', () => {
      before(async () => {
        const ref = await resolveCommit('HEAD', gitOptions);
        await execFileOut('git', ['checkout', '-q', ref], gitOptions);
      });

      after(() => execFileOut(
        'git',
        ['checkout', '-q', defaultBranch],
        gitOptions,
      ));

      it('throws UnknownProjectError', () => {
        return assert.rejects(
          () => getProjectName(gitOptions),
          (err) => {
            assert(err instanceof Error);
            assert.strictEqual(err.name, 'UnknownProjectError');
            return true;
          },
        );
      });
    });

    describe('with non-GitHub remote', () => {
      const testProject = ['kevinoid', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'add',
          'remote1',
          `https://github.com.example.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('throws UnknownProjectError', () => {
        return assert.rejects(
          () => getProjectName(gitOptions),
          (err) => {
            assert(err instanceof Error);
            assert.strictEqual(err.name, 'UnknownProjectError');
            return true;
          },
        );
      });
    });

    describe('with https://github.com remote', () => {
      const testProject = ['kevinoid', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'set-url',
          'remote1',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('returns project', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with git@github.com remote', () => {
      const testProject = ['kevinoid', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'set-url',
          'remote1',
          `git@github.com:${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('returns project', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with github.com sub-domain', () => {
      const testProject = ['kevinoid', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'set-url',
          'remote1',
          `https://example.github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('returns project', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with origin remote', () => {
      const testProject = ['origin', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'add',
          'origin',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('prefers origin to others', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with github remote', () => {
      const testProject = ['github', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'add',
          'github',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('prefers github to origin', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with upstream remote', () => {
      const testProject = ['upstream', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'add',
          'upstream',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('prefers upstream to github', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with remote for current branch', () => {
      const testProject = ['branch', 'github-ci-status'];
      before(async () => {
        await execFileOut(
          'git',
          [
            'remote',
            'add',
            'remote2',
            `https://github.com/${testProject.join('/')}.git`,
          ],
          gitOptions,
        );
        // Note: Can't use `git branch -u` if remote branch doesn't exist
        await execFileOut(
          'git',
          ['config', `branch.${defaultBranch}.remote`, 'remote2'],
          gitOptions,
        );
        await execFileOut(
          'git',
          [
            'config',
            `branch.${defaultBranch}.merge`,
            `refs/heads/${defaultBranch}`,
          ],
          gitOptions,
        );
      });

      it('prefers remote for current branch to github', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with different pushurl', () => {
      const testProject = ['branchpush', 'github-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'set-url',
          '--push',
          'remote2',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      it('prefers project for pushurl', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });
  });
});