/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * Sample JSON copied from documentation may be:
 * @copyright Copyright 2021 GitHub, Inc.
 * @license MIT
 */

"use strict";

const octokitResult = {
  "status": 200,
  "url": "https://api.github.com/repos/github/hello-world/commits/master",
  "headers": {
    "accept-ranges": "bytes",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, Deprecation, Sunset",
    "cache-control": "public, max-age=60, s-maxage=60",
    "connection": "close",
    "content-encoding": "gzip",
    "content-length": "1539",
    "content-security-policy": "default-src \"none\"",
    "content-type": "application/json; charset=utf-8",
    "date": "Sat, 30 Jan 2021 17:19:07 GMT",
    "etag": "W/\"26e98ac36364b4054a272a54d7f53b6dbe08e4eb3745b385c16095ab4e528fcc\"",
    "referrer-policy": "origin-when-cross-origin, strict-origin-when-cross-origin",
    "server": "GitHub.com",
    "status": "200 OK",
    "strict-transport-security": "max-age=31536000; includeSubdomains; preload",
    "vary": "Accept, Accept-Encoding, Accept, X-Requested-With",
    "x-content-type-options": "nosniff",
    "x-frame-options": "deny",
    "x-github-media-type": "github.v3; format=json",
    "x-github-request-id": "C424:1D21:12BE6B8:1FACF76:6015950B",
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": "57",
    "x-ratelimit-reset": "1612030411",
    "x-ratelimit-used": "3",
    "x-xss-protection": "1; mode=block"
  }
};

/** Creates an Octokit result object for "List check runs for a Git reference".
 *
 * @param {!Array<string>} runConclusions Value of each check_runs.conclusion.
 * ("success", "cancelled", "timed_out", "action_required", "failure", "error")
 * "queued" and "in_progress" are treated check_runs.status value with
 * check_runs.conclusion "neutral".
 * @returns {!object} Mock API response with given conclusion values.
 */
exports.makeCheckRuns =
function makeCheckRuns(...runConclusions) {
  // https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
  const checkRun = {
    "id": 4,
    "head_sha": "ce587453ced02b1526dfb4cb910479d431683101",
    "node_id": "MDg6Q2hlY2tSdW40",
    "external_id": "",
    "url": "https://api.github.com/repos/github/hello-world/check-runs/4",
    "html_url": "https://github.com/github/hello-world/runs/4",
    "details_url": "https://example.com",
    "status": "completed",
    "conclusion": "neutral",
    "started_at": "2018-05-04T01:14:52Z",
    "completed_at": "2018-05-04T01:14:52Z",
    "output": {
      "title": "Mighty Readme report",
      "summary": "There are 0 failures, 2 warnings, and 1 notice.",
      "text": "You may have some misspelled words on lines 2 and 4. You also may want to add a section in your README about how to install your app.",
      "annotations_count": 2,
      "annotations_url": "https://api.github.com/repos/github/hello-world/check-runs/4/annotations"
    },
    "name": "mighty_readme",
    "check_suite": {
      "id": 5
    },
    "app": {
      "id": 1,
      "slug": "octoapp",
      "node_id": "MDExOkludGVncmF0aW9uMQ==",
      "owner": {
        "login": "github",
        "id": 1,
        "node_id": "MDEyOk9yZ2FuaXphdGlvbjE=",
        "url": "https://api.github.com/orgs/github",
        "repos_url": "https://api.github.com/orgs/github/repos",
        "events_url": "https://api.github.com/orgs/github/events",
        "avatar_url": "https://github.com/images/error/octocat_happy.gif",
        "gravatar_id": "",
        "html_url": "https://github.com/octocat",
        "followers_url": "https://api.github.com/users/octocat/followers",
        "following_url": "https://api.github.com/users/octocat/following{/other_user}",
        "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
        "organizations_url": "https://api.github.com/users/octocat/orgs",
        "received_events_url": "https://api.github.com/users/octocat/received_events",
        "type": "User",
        "site_admin": true
      },
      "name": "Octocat App",
      "description": "",
      "external_url": "https://example.com",
      "html_url": "https://github.com/apps/octoapp",
      "created_at": "2017-07-08T16:18:44-04:00",
      "updated_at": "2017-07-08T16:18:44-04:00",
      "permissions": {
        "metadata": "read",
        "contents": "read",
        "issues": "write",
        "single_file": "write"
      },
      "events": [
        "push",
        "pull_request"
      ]
    },
    "pull_requests": [
      {
        "url": "https://api.github.com/repos/github/hello-world/pulls/1",
        "id": 1934,
        "number": 3956,
        "head": {
          "ref": "say-hello",
          "sha": "3dca65fa3e8d4b3da3f3d056c59aee1c50f41390",
          "repo": {
            "id": 526,
            "url": "https://api.github.com/repos/github/hello-world",
            "name": "hello-world"
          }
        },
        "base": {
          "ref": "master",
          "sha": "e7fdf7640066d71ad16a86fbcbb9c6a10a18af4f",
          "repo": {
            "id": 526,
            "url": "https://api.github.com/repos/github/hello-world",
            "name": "hello-world"
          }
        }
      }
    ]
  };
  return {
    ...octokitResult,
    "url": `${octokitResult}/check-runs`,
    "data": {
      "total_count": runConclusions.length,
      "check_runs": runConclusions.map((conclusionOrStatus) => {
        const isStatus = conclusionOrStatus === "in_progress"
          || conclusionOrStatus === "queued";
        return {
          ...checkRun,
          "status": isStatus ? conclusionOrStatus : "completed",
          "conclusion": isStatus ? "neutral" : conclusionOrStatus
        };
      })
    }
  };
};

/** Creates an Octokit result object for "Get the combined status for a
 * specific reference".
 *
 * @param {!Array<string>} statusStates Value of each .statuses.state property.
 * ("success", "pending", "failure")
 * @returns {!object} Mock API response with given state values.
 */
exports.makeCombinedStatus =
function makeCombinedStatus(...statusStates) {
  // https://docs.github.com/rest/reference/repos#get-the-combined-status-for-a-specific-reference
  const statuses = [
    {
      "url": "https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e",
      "avatar_url": "https://github.com/images/error/hubot_happy.gif",
      "id": 1,
      "node_id": "MDY6U3RhdHVzMQ==",
      "state": "success",
      "description": "Build has completed successfully",
      "target_url": "https://ci.example.com/1000/output",
      "context": "continuous-integration/jenkins",
      "created_at": "2012-07-20T01:19:13Z",
      "updated_at": "2012-07-20T01:19:13Z"
    },
    {
      "url": "https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e",
      "avatar_url": "https://github.com/images/error/other_user_happy.gif",
      "id": 2,
      "node_id": "MDY6U3RhdHVzMg==",
      "state": "success",
      "description": "Testing has completed successfully",
      "target_url": "https://ci.example.com/2000/output",
      "context": "security/brakeman",
      "created_at": "2012-08-20T01:19:13Z",
      "updated_at": "2012-08-20T01:19:13Z"
    }
  ];

  const statusForState = statusStates
    .map((state, i) => ({
      ...statuses[i % statuses.length],
      state
    }));

  const combinedState = statusStates.length === 0 ? "pending"
    : statusStates.some((s) => s !== "success" && s !== "pending") ? "failure"
      : statusStates.includes("pending") ? "pending"
        : "success";

  return {
    ...octokitResult,
    "url": `${octokitResult}/status`,
    "data": {
      "state": combinedState,
      "statuses": statusForState,
      "sha": "6dcb09b5b57875f334f61aebed695e2e4193db5e",
      "total_count": statusForState.length,
      "repository": {
        "id": 1296269,
        "node_id": "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
        "name": "Hello-World",
        "full_name": "octocat/Hello-World",
        "owner": {
          "login": "octocat",
          "id": 1,
          "node_id": "MDQ6VXNlcjE=",
          "avatar_url": "https://github.com/images/error/octocat_happy.gif",
          "gravatar_id": "",
          "url": "https://api.github.com/users/octocat",
          "html_url": "https://github.com/octocat",
          "followers_url": "https://api.github.com/users/octocat/followers",
          "following_url": "https://api.github.com/users/octocat/following{/other_user}",
          "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
          "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
          "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
          "organizations_url": "https://api.github.com/users/octocat/orgs",
          "repos_url": "https://api.github.com/users/octocat/repos",
          "events_url": "https://api.github.com/users/octocat/events{/privacy}",
          "received_events_url": "https://api.github.com/users/octocat/received_events",
          "type": "User",
          "site_admin": false
        },
        "private": false,
        "html_url": "https://github.com/octocat/Hello-World",
        "description": "This your first repo!",
        "fork": false,
        "url": "https://api.github.com/repos/octocat/Hello-World",
        "archive_url": "https://api.github.com/repos/octocat/Hello-World/{archive_format}{/ref}",
        "assignees_url": "https://api.github.com/repos/octocat/Hello-World/assignees{/user}",
        "blobs_url": "https://api.github.com/repos/octocat/Hello-World/git/blobs{/sha}",
        "branches_url": "https://api.github.com/repos/octocat/Hello-World/branches{/branch}",
        "collaborators_url": "https://api.github.com/repos/octocat/Hello-World/collaborators{/collaborator}",
        "comments_url": "https://api.github.com/repos/octocat/Hello-World/comments{/number}",
        "commits_url": "https://api.github.com/repos/octocat/Hello-World/commits{/sha}",
        "compare_url": "https://api.github.com/repos/octocat/Hello-World/compare/{base}...{head}",
        "contents_url": "https://api.github.com/repos/octocat/Hello-World/contents/{+path}",
        "contributors_url": "https://api.github.com/repos/octocat/Hello-World/contributors",
        "deployments_url": "https://api.github.com/repos/octocat/Hello-World/deployments",
        "downloads_url": "https://api.github.com/repos/octocat/Hello-World/downloads",
        "events_url": "https://api.github.com/repos/octocat/Hello-World/events",
        "forks_url": "https://api.github.com/repos/octocat/Hello-World/forks",
        "git_commits_url": "https://api.github.com/repos/octocat/Hello-World/git/commits{/sha}",
        "git_refs_url": "https://api.github.com/repos/octocat/Hello-World/git/refs{/sha}",
        "git_tags_url": "https://api.github.com/repos/octocat/Hello-World/git/tags{/sha}",
        "git_url": "git:github.com/octocat/Hello-World.git",
        "issue_comment_url": "https://api.github.com/repos/octocat/Hello-World/issues/comments{/number}",
        "issue_events_url": "https://api.github.com/repos/octocat/Hello-World/issues/events{/number}",
        "issues_url": "https://api.github.com/repos/octocat/Hello-World/issues{/number}",
        "keys_url": "https://api.github.com/repos/octocat/Hello-World/keys{/key_id}",
        "labels_url": "https://api.github.com/repos/octocat/Hello-World/labels{/name}",
        "languages_url": "https://api.github.com/repos/octocat/Hello-World/languages",
        "merges_url": "https://api.github.com/repos/octocat/Hello-World/merges",
        "milestones_url": "https://api.github.com/repos/octocat/Hello-World/milestones{/number}",
        "notifications_url": "https://api.github.com/repos/octocat/Hello-World/notifications{?since,all,participating}",
        "pulls_url": "https://api.github.com/repos/octocat/Hello-World/pulls{/number}",
        "releases_url": "https://api.github.com/repos/octocat/Hello-World/releases{/id}",
        "ssh_url": "git@github.com:octocat/Hello-World.git",
        "stargazers_url": "https://api.github.com/repos/octocat/Hello-World/stargazers",
        "statuses_url": "https://api.github.com/repos/octocat/Hello-World/statuses/{sha}",
        "subscribers_url": "https://api.github.com/repos/octocat/Hello-World/subscribers",
        "subscription_url": "https://api.github.com/repos/octocat/Hello-World/subscription",
        "tags_url": "https://api.github.com/repos/octocat/Hello-World/tags",
        "teams_url": "https://api.github.com/repos/octocat/Hello-World/teams",
        "trees_url": "https://api.github.com/repos/octocat/Hello-World/git/trees{/sha}",
        "hooks_url": "http://api.github.com/repos/octocat/Hello-World/hooks"
      },
      "commit_url": "https://api.github.com/repos/octocat/Hello-World/6dcb09b5b57875f334f61aebed695e2e4193db5e",
      "url": "https://api.github.com/repos/octocat/Hello-World/6dcb09b5b57875f334f61aebed695e2e4193db5e/status"
    }
  };
};
