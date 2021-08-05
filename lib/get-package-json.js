/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

// TODO: Replace this module with `import packageJson from 'package.json';`
// once JSON modules are supported non-experimentally:
// https://github.com/nodejs/node/issues/37141

'use strict';

const { readFile } = require('fs').promises;
const path = require('path');

let packageJsonP;

async function readJson(pathOrUrl, options) {
  const content = await readFile(pathOrUrl, { encoding: 'utf8', ...options });
  return JSON.parse(content);
}

/** Gets the parsed content of package.json for this module.
 *
 * @returns {!Promise<!object>} Parsed content of package.json.
 */
module.exports =
function getPackageJson() {
  if (!packageJsonP) {
    packageJsonP = readJson(path.join(__dirname, '..', 'package.json'));
  }

  return packageJsonP;
};
