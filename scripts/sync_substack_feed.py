#!/usr/bin/env python3
"""Fetch recent posts from Substack RSS feed into _data/substack_feed.yml."""

from __future__ import annotations

import datetime as dt
import sys

import yaml

from substack_common import DEFAULT_FEED_URL, fetch_feed

OUTPUT_PATH = "_data/substack_feed.yml"
MAX_POSTS = 8


def main() -> int:
    feed_url = DEFAULT_FEED_URL
    if len(sys.argv) > 1:
        feed_url = sys.argv[1]

    try:
        posts = fetch_feed(feed_url, max_posts=MAX_POSTS)
    except Exception as exc:  # noqa: BLE001
        print(f"Substack sync skipped: {exc}", file=sys.stderr)
        return 0

    feed_posts = []
    for post in posts:
        entry = {
            "title": post["title"],
            "url": post["url"],
            "published": post["published"],
            "published_display": post["published_display"],
            "excerpt": post["excerpt"],
        }
        if post.get("image"):
            entry["image"] = post["image"]
        feed_posts.append(entry)

    payload = {
        "feed_url": feed_url,
        "fetched_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "posts": feed_posts,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        yaml.safe_dump(payload, handle, sort_keys=False, allow_unicode=True)
    print(f"Wrote {len(feed_posts)} Substack posts to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
