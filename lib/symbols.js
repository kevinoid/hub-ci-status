/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 *
 * Package-private symbols.
 * This file is intentionally excluded from package.json#exports.
 */

/** Symbol of mock function used in place of http.Agent for testing.
 *
 * @private
 */
export const HttpAgentMockSymbol = Symbol('HttpAgent');

/** Symbol of mock function used in place of https.Agent for testing.
 *
 * @private
 */
export const HttpsAgentMockSymbol = Symbol('HttpsAgent');

/** Symbol of mock function used in place of Octokit for testing.
 *
 * @private
 */
export const OctokitMockSymbol = Symbol('Octokit');

/** Symbol of mock function used in place of fetchCiStatus for testing.
 *
 * @private
 */
export const fetchCiStatusMockSymbol = Symbol('fetchCiStatus');

/** Symbol of mock function used in place of getProjectName for testing.
 *
 * @private
 */
export const getProjectNameMockSymbol = Symbol('getProjectName');

/** Symbol of mock function used in place of resolveCommit for testing.
 *
 * @private
 */
export const resolveCommitMockSymbol = Symbol('resolveCommit');
