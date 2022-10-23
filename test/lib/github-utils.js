/**
 * Tests for github-utils module.
 *
 * WARNING: Tests in this file require sequential execution and must all be
 * executed for the git repository to be in the expected state.  Using mocha's
 * test filtering is likely to cause tests to misbehave.
 *
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import assert from 'node:assert';
import { dir as makeTempDir } from 'tmp-promise';

import execFileOut from '../../lib/exec-file-out.js';
import getPackageJson from '../../lib/get-package-json.js';
import gitInit from '../../test-lib/git-init.js';
import { getProjectName } from '../../lib/github-utils.js';
import { resolveCommit } from '../../lib/git-utils.js';

const defaultBranch = 'main';
const isWindows = /^win/i.test(process.platform);
// Since git is often slow in shared CI systems, especially on Windows,
// increase the timeout to avoid failures.
const timeoutMs = isWindows ? 8000 : 4000;

/** Path to repository in which tests are run. */
let testRepoPath;
let gitOptions;
before('setup test repository', async function() {
  this.timeout(timeoutMs);

  const packageJson = await getPackageJson();
  const tempDir = await makeTempDir({
    prefix: `${packageJson.name}-test`,
    unsafeCleanup: true,
  });
  testRepoPath = tempDir.path;
  gitOptions = { cwd: testRepoPath };
  after('remove test repository', () => tempDir.cleanup());

  await gitInit(testRepoPath, defaultBranch);
});

describe('githubUtils', function() {
  this.timeout(timeoutMs);

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
      const testProject = ['kevinoid', 'hub-ci-status'];
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

    describe('with invalid remote', () => {
      before(() => execFileOut(
        'git',
        ['remote', 'set-url', 'remote1', 'bad_:invalid'],
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
      const testProject = ['kevinoid', 'hub-ci-status'];
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

    describe('with https://github.com remote without .git extension', () => {
      const testProject = ['kevinoid', 'hub-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'set-url',
          'remote1',
          `https://github.com/${testProject.join('/')}`,
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

    describe('with github.com remote with 1 path part', () => {
      before(() => execFileOut(
        'git',
        ['remote', 'set-url', 'remote1', 'https://github.com/foo.git'],
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

    describe('with github.com remote with 3 path parts', () => {
      before(() => execFileOut(
        'git',
        ['remote', 'set-url', 'remote1', 'https://github.com/foo/bar/baz.git'],
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

    describe('with github.com remote with an empty name', () => {
      before(() => execFileOut(
        'git',
        ['remote', 'set-url', 'remote1', 'https://github.com/foo/.git'],
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

    describe('with git@github.com remote', () => {
      const testProject = ['kevinoid', 'hub-ci-status'];
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
      const testProject = ['kevinoid', 'hub-ci-status'];
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

    describe('with two GitHub remotes', () => {
      const testProject = ['zzz', 'hub-ci-status'];
      before(() => execFileOut(
        'git',
        [
          'remote',
          'add',
          'aremote',
          `https://github.com/${testProject.join('/')}.git`,
        ],
        gitOptions,
      ));

      // Note: For stability.  Lexicographic by remote name is arbitrary.
      it('prefers lexicograpic ordering by remote name', async () => {
        assert.deepStrictEqual(
          await getProjectName(gitOptions),
          testProject,
        );
      });
    });

    describe('with origin remote', () => {
      const testProject = ['origin', 'hub-ci-status'];
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
      const testProject = ['github', 'hub-ci-status'];
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
      const testProject = ['upstream', 'hub-ci-status'];
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
      const testProject = ['branch', 'hub-ci-status'];
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
      const testProject = ['branchpush', 'hub-ci-status'];
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
