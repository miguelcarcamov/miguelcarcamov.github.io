#!/usr/bin/env python3
"""Shared Substack RSS parsing utilities."""

from __future__ import annotations

import datetime as dt
import html
import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

import requests

DEFAULT_FEED_URL = "https://thefaintsignal.substack.com/feed"
CONTENT_NS = "{http://purl.org/rss/1.0/modules/content/}"


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def format_published(pub_date: str) -> str:
    try:
        return parsedate_to_datetime(pub_date).strftime("%B %d, %Y")
    except (TypeError, ValueError, OverflowError):
        return pub_date


def published_iso(pub_date: str) -> str:
    try:
        return parsedate_to_datetime(pub_date).date().isoformat()
    except (TypeError, ValueError, OverflowError):
        return dt.date.today().isoformat()


def slug_from_link(link: str) -> str:
    slug = link.rstrip("/").split("/")[-1].strip()
    slug = re.sub(r"[^a-zA-Z0-9\-]+", "-", slug).strip("-").lower()
    return slug or "substack-post"


def first_image(item: ET.Element) -> str:
    enclosure = item.find("enclosure")
    if enclosure is not None:
        url = (enclosure.get("url") or "").strip()
        enc_type = (enclosure.get("type") or "").strip()
        if url and enc_type.startswith("image/"):
            return url

    encoded = item.find(f"{CONTENT_NS}encoded")
    if encoded is not None and encoded.text:
        match = re.search(r"""<img[^>]+src=["']([^"']+)["']""", encoded.text)
        if match:
            return html.unescape(match.group(1).strip())
    return ""


def html_to_markdown(body_html: str) -> str:
    text = body_html or ""
    text = re.sub(r"(?is)<\s*br\s*/?\s*>", "\n", text)
    for level in range(3, 0, -1):
        text = re.sub(
            rf"(?is)<h{level}[^>]*>(.*?)</h{level}>",
            lambda match, lvl=level: f"\n{'#' * lvl} {strip_html(match.group(1))}\n\n",
            text,
        )
    text = re.sub(r"(?is)<\s*p[^>]*>(.*?)</\s*p\s*>", lambda match: f"{strip_html(match.group(1))}\n\n", text)
    text = re.sub(r"(?is)<li[^>]*>(.*?)</li>", lambda match: f"- {strip_html(match.group(1))}\n", text)
    text = re.sub(r"(?is)<blockquote[^>]*>(.*?)</blockquote>", lambda match: f"> {strip_html(match.group(1))}\n\n", text)
    text = re.sub(r"(?is)<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", r"[\2](\1)", text)
    text = strip_html(text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def fetch_feed(feed_url: str, *, max_posts: int | None = 8) -> list[dict[str, str]]:
    response = requests.get(feed_url, timeout=30, headers={"User-Agent": "miguelcarcamov-github-io/1.0"})
    response.raise_for_status()
    root = ET.fromstring(response.content)
    channel = root.find("channel")
    if channel is None:
        return []

    posts: list[dict[str, str]] = []
    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        encoded = item.find(f"{CONTENT_NS}encoded")
        raw_body = encoded.text if encoded is not None and encoded.text else item.findtext("description") or ""
        description = strip_html(raw_body)
        image = first_image(item)
        if not title or not link:
            continue

        post: dict[str, str] = {
            "title": title,
            "url": link,
            "slug": slug_from_link(link),
            "published": pub_date,
            "published_display": format_published(pub_date),
            "published_iso": published_iso(pub_date),
            "excerpt": description[:280],
            "body_html": raw_body,
            "body_markdown": html_to_markdown(raw_body),
        }
        if image:
            post["image"] = image
        posts.append(post)
        if max_posts is not None and len(posts) >= max_posts:
            break
    return posts
