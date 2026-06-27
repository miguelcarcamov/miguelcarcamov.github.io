#!/usr/bin/env python3
"""Fetch GitHub/GitLab repo stats into _data/software_stats.yml."""

from __future__ import annotations

import datetime as dt
import sys
from typing import Any

import requests
import yaml

OUTPUT_PATH = "_data/software_stats.yml"

REPOS = [
    {"id": "pyralysis", "platform": "gitlab", "project": "clirai%2Fpyralysis"},
    {"id": "csromer", "platform": "github", "repo": "miguelcarcamov/csromer"},
    {"id": "gpuvmem", "platform": "github", "repo": "miguelcarcamov/gpuvmem"},
    {"id": "snow", "platform": "github", "repo": "miguelcarcamov/snow"},
    {"id": "ocarina", "platform": "github", "repo": "miguelcarcamov/ocarina"},
    {"id": "simulate-interferometer", "platform": "github", "repo": "miguelcarcamov/simulate_interferometer"},
]


def _gitlab_stats(project: str) -> dict[str, Any]:
    url = f"https://gitlab.com/api/v4/projects/{project}"
    response = requests.get(url, timeout=30)
    if response.status_code == 404:
        return {}
    response.raise_for_status()
    data = response.json()
    return {
        "stars": data.get("star_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
    }


def _github_stats(repo: str) -> dict[str, Any]:
    url = f"https://api.github.com/repos/{repo}"
    response = requests.get(
        url,
        timeout=30,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "miguelcarcamov-github-io/1.0"},
    )
    if response.status_code == 404:
        return {}
    response.raise_for_status()
    data = response.json()
    return {
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
    }


def main() -> int:
    projects: dict[str, Any] = {}
    for item in REPOS:
        tool_id = item["id"]
        try:
            if item["platform"] == "gitlab":
                stats = _gitlab_stats(item["project"])
            else:
                stats = _github_stats(item["repo"])
        except requests.RequestException as exc:
            print(f"warning: {tool_id}: {exc}", file=sys.stderr)
            stats = {}
        if stats:
            projects[tool_id] = stats

    payload = {
        "fetched_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "projects": projects,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        yaml.safe_dump(payload, handle, sort_keys=False, allow_unicode=True)
    print(f"Wrote {OUTPUT_PATH} ({len(projects)} projects)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
