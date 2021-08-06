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
