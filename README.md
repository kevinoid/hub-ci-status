GitHub CI Status
================

[![Build Status](https://img.shields.io/github/workflow/status/kevinoid/github-ci-status/Node.js%20CI/main.svg?style=flat&label=build)](https://github.com/kevinoid/github-ci-status/actions?query=branch%3Amain)
[![Coverage](https://img.shields.io/codecov/c/github/kevinoid/github-ci-status.svg?style=flat)](https://codecov.io/github/kevinoid/github-ci-status?branch=main)
[![Dependency Status](https://img.shields.io/david/kevinoid/github-ci-status.svg?style=flat)](https://david-dm.org/kevinoid/github-ci-status)
[![Supported Node Version](https://img.shields.io/node/v/github-ci-status.svg?style=flat)](https://www.npmjs.com/package/github-ci-status)
[![Version on NPM](https://img.shields.io/npm/v/github-ci-status.svg?style=flat)](https://www.npmjs.com/package/github-ci-status)

A Node.js-based executable for checking the [combined CI status of a
commit](https://docs.github.com/rest/reference/repos#get-the-combined-status-for-a-specific-reference)
like [`hub ci-status`](https://hub.github.com/hub-ci-status.1.html).

## Introductory Example

<pre><samp>$ <kbd>github-ci-status</kbd>
success</samp></pre>

## Features

* Non-zero exit status for unsuccessful status makes scripting easier.
* `--wait` flag allows waiting until the status is not `pending`, with a
  configurable timeout.
* `--wait-all` flag allows waiting until all statuses and checks are not
  `pending` (rather than exiting after first failure).

## Installation

[This package](https://www.npmjs.com/package/github-ci-status) can be
installed using [npm](https://www.npmjs.com/), either globally or locally, by
running:

```sh
npm install github-ci-status
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
