#!/usr/bin/env python3
"""Fetch latest software releases from GitHub and GitLab into _data/software_releases.yml."""

from __future__ import annotations

import datetime as dt
import sys
from typing import Any

import requests
import yaml

OUTPUT_PATH = "_data/software_releases.yml"

RELEASE_SOURCES = [
    {
        "id": "pyralysis",
        "platform": "gitlab",
        "project": "clirai%2Fpyralysis",
    },
    {
        "id": "csromer",
        "platform": "github",
        "repo": "miguelcarcamov/csromer",
    },
    {
        "id": "gpuvmem",
        "platform": "github",
        "repo": "miguelcarcamov/gpuvmem",
    },
]


def _gitlab_releases(project: str, limit: int = 4) -> list[dict[str, Any]]:
    url = f"https://gitlab.com/api/v4/projects/{project}/releases"
    response = requests.get(url, params={"per_page": limit}, timeout=30)
    if response.status_code == 404:
        return []
    response.raise_for_status()
    releases = []
    for item in response.json():
        releases.append(
            {
                "name": item.get("name") or item.get("tag_name", ""),
                "tag": item.get("tag_name", ""),
                "published_at": item.get("released_at") or item.get("created_at", ""),
                "url": item.get("_links", {}).get("self", item.get("commit_path", "")),
                "description": (item.get("description") or "")[:400],
            }
        )
    return releases


def _github_releases(repo: str, limit: int = 4) -> list[dict[str, Any]]:
    url = f"https://api.github.com/repos/{repo}/releases"
    response = requests.get(
        url,
        params={"per_page": limit},
        timeout=30,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "miguelcarcamov-github-io/1.0"},
    )
    if response.status_code == 404:
        return []
    response.raise_for_status()
    releases = []
    for item in response.json():
        releases.append(
            {
                "name": item.get("name") or item.get("tag_name", ""),
                "tag": item.get("tag_name", ""),
                "published_at": item.get("published_at", ""),
                "url": item.get("html_url", ""),
                "description": (item.get("body") or "")[:400],
            }
        )
    return releases


def main() -> int:
    catalog: dict[str, Any] = {
        "fetched_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "projects": {},
    }

    for source in RELEASE_SOURCES:
        tool_id = source["id"]
        try:
            if source["platform"] == "gitlab":
                releases = _gitlab_releases(source["project"])
            else:
                releases = _github_releases(source["repo"])
        except Exception as exc:  # noqa: BLE001
            print(f"Release sync skipped for {tool_id}: {exc}", file=sys.stderr)
            releases = []
        catalog["projects"][tool_id] = releases

    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        yaml.safe_dump(catalog, handle, sort_keys=False, allow_unicode=True)
    print(f"Wrote software releases to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
