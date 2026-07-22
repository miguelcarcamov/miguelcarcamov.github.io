#!/usr/bin/env python3
"""Fetch latest software releases from GitHub, GitLab, and PyPI into _data/software_releases.yml."""

from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path
from typing import Any

import requests
import yaml

OUTPUT_PATH = Path("_data/software_releases.yml")

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

PYPI_PACKAGES = [
    {"id": "pyralysis", "package": "pyralysis"},
]

HTTP_HEADERS = {"User-Agent": "miguelcarcamov-github-io/1.0"}


def _load_previous() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {}
    try:
        with OUTPUT_PATH.open(encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
        return data if isinstance(data, dict) else {}
    except Exception as exc:  # noqa: BLE001
        print(f"warning: could not load previous {OUTPUT_PATH}: {exc}", file=sys.stderr)
        return {}


def _gitlab_releases(project: str, limit: int = 4) -> list[dict[str, Any]]:
    url = f"https://gitlab.com/api/v4/projects/{project}/releases"
    response = requests.get(url, params={"per_page": limit}, timeout=30, headers=HTTP_HEADERS)
    if response.status_code == 404:
        return []
    response.raise_for_status()
    releases = []
    for item in response.json():
        tag = item.get("tag_name", "")
        self_link = item.get("_links", {}).get("self") or ""
        # Prefer canonical release page URL over API self link when missing.
        if not self_link and tag:
            project_path = project.replace("%2F", "/")
            self_link = f"https://gitlab.com/{project_path}/-/releases/{tag}"
        releases.append(
            {
                "name": item.get("name") or tag,
                "tag": tag,
                "published_at": item.get("released_at") or item.get("created_at", ""),
                "url": self_link,
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
        headers={"Accept": "application/vnd.github+json", **HTTP_HEADERS},
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


def _pypi_package(package: str) -> dict[str, Any] | None:
    url = f"https://pypi.org/pypi/{package}/json"
    response = requests.get(url, timeout=30, headers=HTTP_HEADERS)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    data = response.json()
    info = data.get("info") or {}
    version = info.get("version") or ""
    if not version:
        return None

    upload_time = ""
    files = (data.get("releases") or {}).get(version) or []
    if files:
        upload_time = files[0].get("upload_time_iso_8601") or files[0].get("upload_time") or ""

    return {
        "package": package,
        "version": version,
        "url": info.get("release_url") or f"https://pypi.org/project/{package}/{version}/",
        "project_url": info.get("package_url") or f"https://pypi.org/project/{package}/",
        "published_at": upload_time,
        "install": f"pip install {package}=={version}",
    }


def main() -> int:
    previous = _load_previous()
    previous_projects = previous.get("projects") if isinstance(previous.get("projects"), dict) else {}
    previous_pypi = previous.get("pypi") if isinstance(previous.get("pypi"), dict) else {}

    catalog: dict[str, Any] = {
        "fetched_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "projects": {},
        "pypi": {},
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
            releases = previous_projects.get(tool_id) or []
            if releases:
                print(f"  kept {len(releases)} previous release(s) for {tool_id}", file=sys.stderr)
        catalog["projects"][tool_id] = releases

    for source in PYPI_PACKAGES:
        tool_id = source["id"]
        package = source["package"]
        try:
            info = _pypi_package(package)
            if info is None:
                raise RuntimeError(f"package {package} not found on PyPI")
        except Exception as exc:  # noqa: BLE001
            print(f"PyPI sync skipped for {tool_id}: {exc}", file=sys.stderr)
            info = previous_pypi.get(tool_id)
            if info:
                print(f"  kept previous PyPI entry for {tool_id}", file=sys.stderr)
        if info:
            catalog["pypi"][tool_id] = info

    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(catalog, handle, sort_keys=False, allow_unicode=True)
    print(f"Wrote software releases to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
