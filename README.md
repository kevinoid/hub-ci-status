Hub CI Status
=============

[![Build Status](https://img.shields.io/github/workflow/status/kevinoid/hub-ci-status/Node.js%20CI/main.svg?style=flat&label=build)](https://github.com/kevinoid/hub-ci-status/actions?query=branch%3Amain)
[![Coverage](https://img.shields.io/codecov/c/github/kevinoid/hub-ci-status.svg?style=flat)](https://codecov.io/github/kevinoid/hub-ci-status?branch=main)
[![Dependency Status](https://img.shields.io/david/kevinoid/hub-ci-status.svg?style=flat)](https://david-dm.org/kevinoid/hub-ci-status)
[![Supported Node Version](https://img.shields.io/node/v/hub-ci-status.svg?style=flat)](https://www.npmjs.com/package/hub-ci-status)
[![Version on NPM](https://img.shields.io/npm/v/hub-ci-status.svg?style=flat)](https://www.npmjs.com/package/hub-ci-status)

A reimplementation of the [ci-status
subcommand](https://hub.github.com/hub-ci-status.1.html) of
[hub](https://hub.github.com/) in JavaScript for querying the GitHub [CI
status](https://docs.github.com/rest/reference/repos#get-the-combined-status-for-a-specific-reference)
and [checks
status](https://docs.github.com/rest/reference/checks#list-check-runs-for-a-git-reference)
of a commit using Node.

## Introductory Example

<pre><samp>$ <kbd>hub-ci-status</kbd>
success</samp></pre>

## Features

* Non-zero exit status for unsuccessful status makes scripting easier.
* `--wait` flag allows waiting until the status is not `pending`, with a
  configurable timeout.
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
