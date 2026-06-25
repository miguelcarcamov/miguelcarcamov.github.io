#!/usr/bin/env python3
"""Mirror Substack RSS entries into _posts/ for Jekyll SEO (Substack remains canonical)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

from substack_common import DEFAULT_FEED_URL, fetch_feed

POSTS_DIR = Path("_posts")
MANIFEST_PATH = POSTS_DIR / ".substack-mirrored.yml"


def yaml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def render_post(post: dict[str, str]) -> str:
    date_iso = post["published_iso"]
    slug = post["slug"]
    title = post["title"]
    excerpt = post.get("excerpt", "")
    image = post.get("image", "")
    url = post["url"]
    body = post.get("body_markdown") or excerpt

    lines = [
        "---",
        "layout: post",
        f"title: {yaml_quote(title)}",
        f"date: {date_iso}",
        'author: "Miguel Cárcamo"',
        'category: "Writing"',
        "source: substack",
        f"canonical_url: {yaml_quote(url)}",
        f"substack_url: {yaml_quote(url)}",
    ]
    if image:
        lines.append(f"image: {yaml_quote(image)}")
    if excerpt:
        lines.append(f"excerpt: {yaml_quote(excerpt)}")
    lines.extend(
        [
            "---",
            "",
            body,
            "",
            f"*Read the full post on [Substack]({url}).*",
            "",
        ]
    )
    return "\n".join(lines)


def read_manifest() -> dict[str, str]:
    if not MANIFEST_PATH.exists():
        return {}
    with MANIFEST_PATH.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return dict(data.get("files") or {})


def write_manifest(files: dict[str, str]) -> None:
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"files": dict(sorted(files.items()))}
    with MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(payload, handle, sort_keys=False, allow_unicode=True)


def filename_for(post: dict[str, str]) -> str:
    date_iso = post["published_iso"]
    slug = re.sub(r"[^a-z0-9\-]+", "-", post["slug"].lower()).strip("-") or "substack-post"
    return f"{date_iso}-{slug}.md"


def main() -> int:
    feed_url = DEFAULT_FEED_URL
    if len(sys.argv) > 1:
        feed_url = sys.argv[1]

    try:
        posts = fetch_feed(feed_url, max_posts=None)
    except Exception as exc:  # noqa: BLE001
        print(f"Substack mirror skipped: {exc}", file=sys.stderr)
        return 0

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = read_manifest()
    seen_paths: set[str] = set()
    written = 0

    for post in posts:
        path = POSTS_DIR / filename_for(post)
        rel = str(path)
        seen_paths.add(rel)
        content = render_post(post)
        if path.exists():
            if path.read_text(encoding="utf-8") == content:
                manifest[rel] = post["url"]
                continue
        path.write_text(content, encoding="utf-8")
        manifest[rel] = post["url"]
        written += 1
        print(f"Wrote {path}")

    stale = [rel for rel in manifest if rel not in seen_paths]
    for rel in stale:
        stale_path = Path(rel)
        if stale_path.exists():
            stale_path.unlink()
            print(f"Removed stale mirror {rel}")
        manifest.pop(rel, None)

    write_manifest(manifest)
    print(f"Mirrored {len(posts)} Substack posts ({written} updated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
