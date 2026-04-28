#!/usr/bin/env python3
"""
Sync publications from NASA ADS into Jekyll data format.

Usage:
  ADS_API_TOKEN=... python scripts/sync_ads_publications.py --orcid 0000-0003-0564-8167
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
from typing import Any

import requests
import yaml


ADS_API_URL = "https://api.adsabs.harvard.edu/v1/search/query"
DEFAULT_ORCID = "0000-0003-0564-8167"
OUTPUT_PATH = "_data/publications.yml"


def _normalize_text(value: str) -> str:
    replacements = {
        "á": "a",
        "à": "a",
        "ä": "a",
        "â": "a",
        "é": "e",
        "è": "e",
        "ë": "e",
        "ê": "e",
        "í": "i",
        "ì": "i",
        "ï": "i",
        "î": "i",
        "ó": "o",
        "ò": "o",
        "ö": "o",
        "ô": "o",
        "ú": "u",
        "ù": "u",
        "ü": "u",
        "û": "u",
        "ñ": "n",
    }
    normalized = value.lower().strip()
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _is_first_author(author_value: str) -> bool:
    author_normalized = _normalize_text(author_value)
    return "carcamo" in author_normalized


def _is_conference(doc: dict[str, Any]) -> bool:
    doc_type = " ".join(doc.get("doctype", []))
    pub = doc.get("pub", "") or ""
    haystack = f"{doc_type} {pub}".lower()
    conference_markers = [
        "inproceedings",
        "proceedings",
        "conference",
        "workshop",
        "symposium",
        "meeting",
    ]
    return any(marker in haystack for marker in conference_markers)


def _extract_doi(identifiers: list[str]) -> str | None:
    for identifier in identifiers:
        if identifier.lower().startswith("10."):
            return identifier
    return None


def _format_date_label(pubdate: str, year: str | int | None) -> str:
    if pubdate:
        try:
            parsed = dt.datetime.strptime(pubdate[:10], "%Y-%m-%d")
            return parsed.strftime("%b. %Y")
        except ValueError:
            pass
    return str(year) if year else ""


def fetch_ads_documents(token: str, orcid: str, rows: int) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": f'orcid:"{orcid}"',
        "fl": "author,title,pub,pubdate,year,doctype,identifier,volume,issue,page,bibcode",
        "sort": "date desc",
        "rows": rows,
    }
    response = requests.get(ADS_API_URL, headers=headers, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    return payload.get("response", {}).get("docs", [])


def build_publication_entry(doc: dict[str, Any]) -> dict[str, Any]:
    authors = doc.get("author", []) or []
    title = doc.get("title", ["Untitled"])
    identifiers = doc.get("identifier", []) or []
    doi = _extract_doi(identifiers)
    bibcode = doc.get("bibcode")
    year = doc.get("year")
    pubdate = doc.get("pubdate", "")
    pages = doc.get("page", []) or []

    return {
        "authors": ", ".join(authors),
        "title": title[0],
        "publication": doc.get("pub", ""),
        "year": int(year) if str(year).isdigit() else year,
        "date_label": _format_date_label(pubdate, year),
        "volume": doc.get("volume", ""),
        "issue": doc.get("issue", ""),
        "pages": pages[0] if pages else "",
        "doi": doi or "",
        "url": f"https://doi.org/{doi}" if doi else (f"https://ui.adsabs.harvard.edu/abs/{bibcode}" if bibcode else ""),
    }


def split_publications(docs: list[dict[str, Any]]) -> dict[str, Any]:
    grouped = {
        "first_author": {"journal": [], "conference": []},
        "coauthored": {"journal": [], "conference": []},
    }

    for doc in docs:
        authors = doc.get("author", []) or []
        if not authors:
            continue

        bucket = "conference" if _is_conference(doc) else "journal"
        author_group = "first_author" if _is_first_author(authors[0]) else "coauthored"
        grouped[author_group][bucket].append(build_publication_entry(doc))

    return grouped


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync NASA ADS publications to Jekyll data.")
    parser.add_argument("--orcid", default=DEFAULT_ORCID, help="ORCID to query in NASA ADS")
    parser.add_argument("--rows", default=200, type=int, help="Maximum ADS rows to fetch")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Output YAML file path")
    args = parser.parse_args()

    token = os.environ.get("ADS_API_TOKEN", "").strip()
    if not token:
        print("Error: ADS_API_TOKEN is not set.", file=sys.stderr)
        return 1

    try:
        docs = fetch_ads_documents(token=token, orcid=args.orcid, rows=args.rows)
    except requests.RequestException as exc:
        print(f"Error while calling NASA ADS API: {exc}", file=sys.stderr)
        return 1

    grouped = split_publications(docs)
    data = {
        "generated_at_utc": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "NASA ADS API",
        "orcid": args.orcid,
        "counts": {
            "first_author_journal": len(grouped["first_author"]["journal"]),
            "first_author_conference": len(grouped["first_author"]["conference"]),
            "coauthored_journal": len(grouped["coauthored"]["journal"]),
            "coauthored_conference": len(grouped["coauthored"]["conference"]),
        },
        "first_author": grouped["first_author"],
        "coauthored": grouped["coauthored"],
    }

    with open(args.output, "w", encoding="utf-8") as output_file:
        yaml.safe_dump(data, output_file, sort_keys=False, allow_unicode=True, width=120)

    print(f"Wrote {args.output} from NASA ADS ({len(docs)} records).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
