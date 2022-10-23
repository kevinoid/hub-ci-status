/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

// TODO [engine:node@>=17.5]: Replace this module with `import packageJson
// from 'package.json';`

import { readFile } from 'node:fs/promises';

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
