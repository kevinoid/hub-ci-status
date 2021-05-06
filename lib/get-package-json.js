/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

// TODO: Replace this module with `import packageJson from 'package.json';`
// once JSON modules are supported non-experimentally:
// https://github.com/nodejs/node/issues/37141

// TODO [engine:node@>=14]: import { readFile } from 'fs/promises'
import { promises as fsPromises } from 'fs';

const { readFile } = fsPromises;
let packageJsonP;

async function readJson(pathOrUrl, options) {
  const content = await readFile(pathOrUrl, { encoding: 'utf8', ...options });
  return JSON.parse(content);
}

/** Gets the parsed content of package.json for this module.
 *
 * @returns {!Promise<!object>} Parsed content of package.json.
 */
export default function getPackageJson() {
  if (!packageJsonP) {
    packageJsonP = readJson(new URL('../package.json', import.meta.url));
  }

  return packageJsonP;
}
