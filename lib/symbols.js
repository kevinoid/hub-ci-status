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
exports.HttpAgentMockSymbol = Symbol('HttpAgent');

/** Symbol of mock function used in place of https.Agent for testing.
 *
 * @private
 */
exports.HttpsAgentMockSymbol = Symbol('HttpsAgent');

/** Symbol of mock function used in place of Octokit for testing.
 *
 * @private
 */
exports.OctokitMockSymbol = Symbol('Octokit');

/** Symbol of mock function used in place of fetchCiStatus for testing.
 *
 * @private
 */
exports.fetchCiStatusMockSymbol = Symbol('fetchCiStatus');

/** Symbol of mock function used in place of getProjectName for testing.
 *
 * @private
 */
exports.getProjectNameMockSymbol = Symbol('getProjectName');

/** Symbol of mock function used in place of resolveCommit for testing.
 *
 * @private
 */
exports.resolveCommitMockSymbol = Symbol('resolveCommit');
