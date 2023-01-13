Hub CI Status
=============

[![Build Status](https://img.shields.io/github/actions/workflow/status/kevinoid/hub-ci-status/node.js.yml?branch=main&style=flat&label=build)](https://github.com/kevinoid/hub-ci-status/actions?query=branch%3Amain)
[![Coverage](https://img.shields.io/codecov/c/github/kevinoid/hub-ci-status/main.svg?style=flat)](https://app.codecov.io/gh/kevinoid/hub-ci-status/branch/main)
[![Dependency Status](https://img.shields.io/librariesio/release/npm/hub-ci-status.svg?style=flat)](https://libraries.io/npm/hub-ci-status)
[![Supported Node Version](https://img.shields.io/node/v/hub-ci-status.svg?style=flat)](https://www.npmjs.com/package/hub-ci-status)
[![Version on NPM](https://img.shields.io/npm/v/hub-ci-status.svg?style=flat)](https://www.npmjs.com/package/hub-ci-status)

A reimplementation of the [ci-status
subcommand](https://hub.github.com/hub-ci-status.1.html) of
[hub](https://hub.github.com/) in JavaScript for querying the GitHub [CI
status](https://docs.github.com/rest/reference/repos#get-the-combined-status-for-a-specific-reference)
and [checks
status](https://docs.github.com/rest/reference/checks#list-check-runs-for-a-git-reference)
of a commit using Node.

## Introductory Examples

To get the combined CI and checks status of the checked out commit, invoke
`hub-ci-status` in a git repository with a GitHub remote:

<pre><samp>$ hub-ci-status
pending
$ echo $?
2</samp></pre>


### Status of Branch/Tag/Commit

To get the status of a particular commit, pass the name (any name suitable for
[`git rev-parse`](https://git-scm.com/docs/git-rev-parse)) as an argument:

<pre><samp>$ hub-ci-status mybranch
failure
$ echo $?
1</samp></pre>


### Wait for Pending

If the CI status or checks may not have completed, the `-w`/`--wait` option
can be passed (with an optional timeout in seconds) to wait until the status
is not pending:

<pre><samp>$ hub-ci-status --wait 60
success
$ echo $?
0</samp></pre>

By default, the process will exit as soon as any CI status or check fails.  To
wait until all statuses/checks have finished, add `-W`/`--wait-all`.


### Verbose Output

For more verbose output, including the status context and target URL, pass the
`-v`/`--verbose` option:

<pre><samp>$ hub-ci-status -v
●	Test on Node.js * x64 on windows-latest        	https://github.com/kevinoid/hub-ci-status/runs/1808395138
●	Test on Node.js 10 x64 on windows-latest       	https://github.com/kevinoid/hub-ci-status/runs/1808395109
●	Test on Node.js 10 x64 on ubuntu-latest        	https://github.com/kevinoid/hub-ci-status/runs/1808395075
✔︎	Lint and Test on Node.js * x64 on ubuntu-latest	https://github.com/kevinoid/hub-ci-status/runs/1808388960
success</samp></pre>

Note: This option can be passed twice to print progress messages for `--wait`
to `stderr`.


## Additional Features

This module supports a few features which are not supported by [`hub
ci-status`](https://hub.github.com/hub-ci-status.1.html):

* `--wait` flag allows waiting until the status is not `pending`, with a
  configurable timeout.
  ([github/hub#1809](https://github.com/github/hub/issues/1809))
* `--wait-all` flag allows waiting until all statuses and checks are not
  `pending` (rather than exiting after first failure).


## Installation

[This package](https://www.npmjs.com/package/hub-ci-status) can be
installed using [npm](https://www.npmjs.com/), either globally or locally, by
running:

```sh
npm install hub-ci-status
```


## Contributing

Contributions are appreciated.  Contributors agree to abide by the [Contributor
Covenant Code of
Conduct](https://www.contributor-covenant.org/version/1/4/code-of-conduct.html).
If this is your first time contributing to a Free and Open Source Software
project, consider reading [How to Contribute to Open
Source](https://opensource.guide/how-to-contribute/)
in the Open Source Guides.

If the desired change is large, complex, backwards-incompatible, can have
significantly differing implementations, or may not be in scope for this
project, opening an issue before writing the code can avoid frustration and
save a lot of time and effort.


## License

This project is available under the terms of the [MIT License](LICENSE.txt).
See the [summary at TLDRLegal](https://tldrlegal.com/license/mit-license).
