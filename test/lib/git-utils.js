/**
 * @copyright Copyright 2017-2019 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import assert from 'node:assert';
import path from 'node:path';
import { dir as makeTempDir } from 'tmp-promise';
import { pathToFileURL } from 'node:url';

import getPackageJson from '../../lib/get-package-json.js';
import gitInit from '../../test-lib/git-init.js';
import * as gitUtils from '../../lib/git-utils.js';
import execFileOut from '../../lib/exec-file-out.js';

const defaultBranch = 'main';
const isWindows = /^win/i.test(process.platform);

const BRANCH_REMOTES = {
  // Note:  must be origin so ls-remote default is origin for all git versions
  [defaultBranch]: `origin/${defaultBranch}`,
  branch1: 'remote1/rbranch5',
  branch2: 'remote2/rbranch6',
  branchnoremote: false,
  branchnourl: 'nourl/rbranch2',
  branchnotslug: 'notslug/rbranch3',
};
const REMOTES = {
  notslug: 'foo',
  origin: 'https://github.com/owner/repo',
  remote1: 'git@github.com:owner1/repo1.git',
  remote2: 'https://github.com/owner2/repo2.git',
};
const TAGS = ['tag1'];

function neverCalled() {
  throw new Error('should not be called');
}

/** Path to repository in which tests are run. */
let testRepoPath;
let gitOptions;
before('setup test repository', async function() {
  // Some git versions can run quite slowly on Windows
  this.timeout(isWindows ? 8000 : 4000);

  const packageJson = await getPackageJson();
  const tempDir = await makeTempDir({
    prefix: `${packageJson.name}-test`,
    unsafeCleanup: true,
  });
  testRepoPath = tempDir.path;
  gitOptions = { cwd: testRepoPath };
  after('remove test repository', () => tempDir.cleanup());

  await gitInit(testRepoPath, defaultBranch);
  await execFileOut(
    'git',
    ['commit', '-q', '-m', 'Initial Commit', '--allow-empty'],
    gitOptions,
  );
  await execFileOut('git', ['tag', TAGS[0]], gitOptions);
  await execFileOut(
    'git',
    ['commit', '-q', '-m', 'Second Commit', '--allow-empty'],
    gitOptions,
  );

  // Create remotes
  for (const [remoteName, remoteUrl] of Object.entries(REMOTES)) {
    // eslint-disable-next-line no-await-in-loop
    await execFileOut(
      'git',
      ['remote', 'add', remoteName, remoteUrl],
      gitOptions,
    );
  }

  // Create branches
  for (const branchName of Object.keys(BRANCH_REMOTES)) {
    if (branchName !== defaultBranch) {
      // eslint-disable-next-line no-await-in-loop
      await execFileOut(
        'git',
        ['branch', branchName],
        gitOptions,
      );
    }
  }

  // Configure remote for branch
  for (const [branchName, upstream] of Object.entries(BRANCH_REMOTES)) {
    if (upstream) {
      // Note:  Can't use 'git branch -u' without fetching remote
      const upstreamParts = upstream.split('/');
      assert.strictEqual(upstreamParts.length, 2);
      const remoteName = upstreamParts[0];
      const remoteBranch = upstreamParts[1];
      const remoteRef = `refs/heads/${remoteBranch}`;
      const configBranch = `branch.${branchName}`;
      const configMerge = `${configBranch}.merge`;
      const configRemote = `${configBranch}.remote`;
      // eslint-disable-next-line no-await-in-loop
      await execFileOut(
        'git',
        ['config', '--add', configRemote, remoteName],
        gitOptions,
      );
      // eslint-disable-next-line no-await-in-loop
      await execFileOut(
        'git',
        ['config', '--add', configMerge, remoteRef],
        gitOptions,
      );
    }
  }
});

function checkoutDefault() {
  return execFileOut('git', ['checkout', '-q', defaultBranch], gitOptions);
}

describe('gitUtils', function() {
  // Some git versions can run quite slowly on Windows CI
  this.timeout(isWindows ? 4000 : 2000);

  describe('.getBranch', () => {
    after(checkoutDefault);

    it(`resolves ${defaultBranch} on ${defaultBranch}`, () => {
      return gitUtils.getBranch(gitOptions)
        .then((branch) => {
          assert.strictEqual(branch, defaultBranch);
        });
    });

    it('resolves branch1 on branch1', () => {
      return execFileOut('git', ['checkout', '-q', 'branch1'], gitOptions)
        .then(() => gitUtils.getBranch(gitOptions))
        .then((branch) => {
          assert.strictEqual(branch, 'branch1');
        });
    });

    it('rejects with Error not on branch', () => {
      return execFileOut('git', ['checkout', '-q', 'HEAD^'], gitOptions)
        .then(() => gitUtils.getBranch(gitOptions))
        .then(
          neverCalled,
          (err) => {
            assert(err instanceof Error);
            assert.match(err.message, /branch/i);
          },
        );
    });
  });

  describe('.getConfig', () => {
    it('rejects with RangeError for invalid scope', () => {
      return assert.rejects(
        () => gitUtils.getConfig('invalid', gitOptions),
        RangeError,
      );
    });

    // Use branch remote configuration to test local config
    const localConfigKey = `branch.${defaultBranch}.remote`;
    const localConfigValue = BRANCH_REMOTES[defaultBranch].split('/')[0];

    it('resolves to object mapping all config keys to values', async () => {
      const config = await gitUtils.getConfig(undefined, gitOptions);
      assert.strictEqual(typeof config, 'object');
      assert(
        !(config instanceof Object),
        'does not inherit from Object to avoid proto key confusion',
      );
      assert.strictEqual(config[localConfigKey], localConfigValue);
    });

    it('resolves to local config', async () => {
      const config = await gitUtils.getConfig('local', gitOptions);
      assert.strictEqual(typeof config, 'object');
      assert(
        !(config instanceof Object),
        'does not inherit from Object to avoid proto key confusion',
      );
      assert.strictEqual(config[localConfigKey], localConfigValue);
    });

    // May fail with `fatal: unable to read config file '$HOME/.gitconfig': No
    // such file or directory`
    xit('resolves to global config', async () => {
      const config = await gitUtils.getConfig('global', gitOptions);
      assert.strictEqual(typeof config, 'object');
      assert(
        !(config instanceof Object),
        'does not inherit from Object to avoid proto key confusion',
      );
      // TODO: Set a global config to test?
      assert.strictEqual(config[localConfigKey], undefined);
    });

    // May fail with `fatal: unable to read config file '/etc/gitconfig': No
    // such file or directory`
    xit('resolves to system config', async () => {
      const config = await gitUtils.getConfig('system', gitOptions);
      assert.strictEqual(typeof config, 'object');
      assert(
        !(config instanceof Object),
        'does not inherit from Object to avoid proto key confusion',
      );
      // TODO: How to know what's in /etc/gitconfig?
      assert.strictEqual(config[localConfigKey], undefined);
    });
  });

  describe('.gitUrlIsLocalNotSsh', () => {
    for (const testCase of [
      { url: '.', result: true },
      { url: '/foo/bar', result: true },
      { url: 'http://example.com', result: false },
      { url: 'git://example.com', result: false },
      { url: 'git@example.com:foo', result: false },
      { url: 'file:///foo/bar', result: false },
      { url: '/foo:bar', result: true },
      { url: 'foo:bar', result: false },
    ]) {
      it(`${testCase.url} is ${testCase.result}`, () => {
        assert.strictEqual(
          gitUtils.gitUrlIsLocalNotSsh(testCase.url),
          testCase.result,
        );
      });
    }

    const drivePath = 'C:/foo';
    if (isWindows) {
      it(`${drivePath} is true on Windows`, () => {
        assert.strictEqual(
          gitUtils.gitUrlIsLocalNotSsh(drivePath),
          true,
        );
      });
    } else {
      it(`${drivePath} is false on non-Windows`, () => {
        assert.strictEqual(
          gitUtils.gitUrlIsLocalNotSsh(drivePath),
          false,
        );
      });
    }
  });

  describe('.parseGitUrl', () => {
    it('parses http: like url module', () => {
      const testUrl = 'http://user@example.com/foo/bar';
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testUrl),
        Object.assign(new URL(testUrl), { helper: undefined }),
      );
    });

    it('parses git: like url module', () => {
      const testUrl = 'git://user@example.com/foo/bar';
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testUrl),
        Object.assign(new URL(testUrl), { helper: undefined }),
      );
    });

    it('parses SCP-like URL like ssh: URL', () => {
      const testUrl = 'user@example.com:foo/bar.git';
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testUrl),
        Object.assign(
          new URL('ssh://user@example.com/foo/bar.git'),
          { helper: undefined },
        ),
      );
    });

    it('parses absolute path like file:// URL', () => {
      const testPath = path.resolve(path.join('foo', 'bar'));
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testPath),
        Object.assign(pathToFileURL(testPath), { helper: undefined }),
      );
    });

    it('parses relative path like file:// URL', () => {
      const testPath = path.join('foo', 'bar');
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testPath),
        Object.assign(pathToFileURL(testPath), { helper: undefined }),
      );
    });

    if (isWindows) {
      it('parses Windows path like file:// URL on Windows', () => {
        assert.deepStrictEqual(
          gitUtils.parseGitUrl('C:\\foo\\bar'),
          Object.assign(new URL('file:///C:/foo/bar'), { helper: undefined }),
        );
      });
    } else {
      it('parses Windows path like URL on non-Windows', () => {
        const testPath = 'C:\\foo\\bar';
        assert.deepStrictEqual(
          gitUtils.parseGitUrl(testPath),
          Object.assign(new URL(testPath), { helper: undefined }),
        );
      });
    }

    it('adds helper property for transport helper', () => {
      const testUrl = 'myhelper::user@example.com:foo/bar.git';
      assert.deepStrictEqual(
        gitUtils.parseGitUrl(testUrl),
        Object.assign(
          new URL('ssh://user@example.com/foo/bar.git'),
          { helper: 'myhelper' },
        ),
      );
    });
  });

  describe('.resolveCommit', () => {
    let headHash;
    it('can resolve the hash of HEAD', () => {
      return gitUtils.resolveCommit('HEAD', gitOptions).then((hash) => {
        assert.match(hash, /^[a-fA-F0-9]{40}$/);
        headHash = hash;
      });
    });

    it('can resolve a hash to itself', () => {
      return gitUtils.resolveCommit(headHash, gitOptions).then((hash) => {
        assert.strictEqual(hash, headHash);
      });
    });

    it('can resolve branch name to commit hash', () => {
      const branchName = Object.keys(BRANCH_REMOTES)[0];
      return gitUtils.resolveCommit(branchName, gitOptions).then((hash) => {
        assert.match(hash, /^[a-fA-F0-9]{40}$/);
      });
    });

    it('can resolve tag name to commit hash', () => {
      return gitUtils.resolveCommit(TAGS[0], gitOptions).then((hash) => {
        assert.match(hash, /^[a-fA-F0-9]{40}$/);
      });
    });

    it('rejects with Error for unresolvable name', () => {
      return gitUtils.resolveCommit('notabranch', gitOptions).then(
        neverCalled,
        (err) => {
          assert(err instanceof Error);
        },
      );
    });
  });
});
