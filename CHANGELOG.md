# [2.0.0](https://github.com/kevinoid/hub-ci-status/compare/v1.0.0...v2.0.0) (2026-05-30)

### BREAKING CHANGES

* Require Node.js >=20 ([3fb3a6b](https://github.com/kevinoid/hub-ci-status/commit/3fb3a6bf206967708bcf2bdc44000f3dd4fb8753))

### Bug Fixes

* use `InvalidArgumentError` for commander errors ([aa7e251](https://github.com/kevinoid/hub-ci-status/commit/aa7e251517a13f11f4dc4dec962f932acc7e8610))

### Features

* bump commander from 8.0.0 to 15.0.0 ([a733f64](https://github.com/kevinoid/hub-ci-status/commit/a733f6419b91553ff6dfcb9fe455b0222a9e8d31))
* bump @octokit/rest from 18.0.12 to 22.0.0 ([90ebc89](https://github.com/kevinoid/hub-ci-status/commit/90ebc89c42f2811a1dde0f6e2a2d34d633a19ba0))
* **package:** use git+https for repository.url ([99b1907](https://github.com/kevinoid/hub-ci-status/commit/99b1907c15340115097910d2249b43e60190aafe))
* implement trusted publishing from GitHub ([1d75856](https://github.com/kevinoid/hub-ci-status/commit/1d7585615b741ca4df50f28b9cf8c971fda36248))


# [1.0.0](https://github.com/kevinoid/hub-ci-status/compare/v0.1.0...v1.0.0) (2021-08-06)

### BREAKING CHANGES

* Converted to [ECMAScript modules](https://nodejs.org/api/esm.html).
* Require Node.js ^12.20 || >=14.13.1.
* Various minor changes in command-line options and output as a result of
  switching from [Yargs](https://github.com/yargs/yargs) to
  [Commander.js](https://github.com/tj/commander.js).

### Features

* Export `cli.js` as `hub-ci-status/cli.js` to allow calling cli entry point.
  ([25f3e00](https://github.com/kevinoid/hub-ci-status/commit/25f3e0006884604b0b82cdba5aaa69770b0fea62))
* Switch from nyc to c8 for coverage
  ([d72a313](https://github.com/kevinoid/hub-ci-status/commit/d72a3136254166eda40fb56c550283758c25ac1f))
* Update dev dependency versions.


# 0.1.0 (2021-02-01)

* Initial release.
