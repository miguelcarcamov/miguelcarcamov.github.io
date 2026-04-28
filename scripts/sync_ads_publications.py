#!/usr/bin/env python3
"""Sync publications from NASA ADS into Jekyll data format."""

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
DEFAULT_AUTHORS = ["Carcamo, Miguel", "Cárcamo, Miguel"]
OUTPUT_PATH = "_data/publications.yml"
EXCLUDED_DOIS = {
    "10.1364/ao.392014",
}


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
    doctype_value = doc.get("doctype", [])
    if isinstance(doctype_value, str):
        doc_type = doctype_value
    else:
        doc_type = " ".join(doctype_value)
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


def _is_software_record(doc: dict[str, Any]) -> bool:
    doctype_value = doc.get("doctype", [])
    if isinstance(doctype_value, str):
        doc_type = doctype_value.lower()
    else:
        doc_type = " ".join(str(item) for item in doctype_value).lower()

    publication = str(doc.get("pub", "") or "").lower()
    bibcode = str(doc.get("bibcode", "") or "").lower()
    identifiers = " ".join(_as_list(doc.get("identifier", []))).lower()

    software_markers = [
        "software",
        "astrophysics source code library",
        "ascl",
        "ascl.soft",
    ]

    haystack = f"{doc_type} {publication} {bibcode} {identifiers}"
    return any(marker in haystack for marker in software_markers)


def _extract_doi(doi_values: list[str], identifiers: list[str]) -> str | None:
    candidates: list[str] = []
    for value in doi_values + identifiers:
        if isinstance(value, str) and value.lower().startswith("10."):
            candidates.append(value.strip())

    if not candidates:
        return None

    preferred = [value for value in candidates if not value.lower().startswith("10.48550/arxiv.")]
    if preferred:
        return preferred[0]

    return candidates[0]


def _format_pages(pages: list[str]) -> str:
    cleaned = [str(page).strip() for page in pages if str(page).strip()]
    if not cleaned:
        return ""
    if len(cleaned) >= 2 and cleaned[0] != cleaned[-1]:
        return f"{cleaned[0]}-{cleaned[-1]}"
    return cleaned[0]


def _is_target_author_present(authors: list[str]) -> bool:
    accepted_prefixes = ("carcamo, miguel", "carcamo, m.", "carcamo, m ")
    excluded_prefixes = (
        "carcamo, mario",
        "carcamo, marcela",
        "carcamo, martin",
        "carcamo, maria",
        "carcamo, maria paz",
    )
    for author_name in authors:
        normalized = _normalize_text(author_name)
        if normalized.startswith(excluded_prefixes):
            continue
        if normalized.startswith(accepted_prefixes):
            return True
    return False


def _publication_query(orcid: str, author_names: list[str]) -> str:
    quoted_author_clauses = [f'author:"{author_name}"' for author_name in author_names]
    clauses = [f'orcid:"{orcid}"'] + quoted_author_clauses
    return " OR ".join(f"({clause})" for clause in clauses)


def _entry_key(entry: dict[str, Any]) -> str:
    base = _normalize_text(entry.get("title", ""))
    year = str(entry.get("year", ""))
    return f"{base}|{year}"


def _entry_score(entry: dict[str, Any]) -> int:
    score = 0
    publication = _normalize_text(str(entry.get("publication", "")))
    doi = str(entry.get("doi", "")).lower()
    if doi and not doi.startswith("10.48550/arxiv."):
        score += 3
    if publication and "arxiv" not in publication:
        score += 2
    if "proceedings" in publication or "conference" in publication or "symposium" in publication or "meeting" in publication:
        score += 1
    if entry.get("volume"):
        score += 1
    if entry.get("pages"):
        score += 1
    return score


def _sort_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def _safe_year(item: dict[str, Any]) -> int:
        year = item.get("year")
        if isinstance(year, int):
            return year
        if isinstance(year, str) and year.isdigit():
            return int(year)
        return 0

    return sorted(entries, key=lambda item: (_safe_year(item), item.get("title", "")), reverse=True)


def _finalize_group(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return _sort_entries(entries)


def _collect_author_args(values: list[str]) -> list[str]:
    if values:
        return values
    return DEFAULT_AUTHORS


def _as_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


def _trim_doi_prefix(doi_value: str) -> str:
    value = doi_value.strip()
    if value.lower().startswith("doi:"):
        return value[4:].strip()
    return value


def _safe_title(doc: dict[str, Any]) -> str:
    title = doc.get("title", ["Untitled"])
    if isinstance(title, list):
        return title[0] if title else "Untitled"
    return str(title)


def _as_int_or_str(value: Any) -> int | str:
    value_str = str(value)
    if value_str.isdigit():
        return int(value_str)
    return value_str


def _log_stats(docs: list[dict[str, Any]], grouped: dict[str, Any]) -> None:
    print(f"Fetched {len(docs)} records from ADS query.")
    print(
        "Grouped records: "
        f"first/journal={len(grouped['first_author']['journal'])}, "
        f"first/conf={len(grouped['first_author']['conference'])}, "
        f"co/journal={len(grouped['coauthored']['journal'])}, "
        f"co/conf={len(grouped['coauthored']['conference'])}"
    )


def _format_date_label(pubdate: str, year: str | int | None) -> str:
    if pubdate:
        try:
            parsed = dt.datetime.strptime(pubdate[:10], "%Y-%m-%d")
            return parsed.strftime("%b. %Y")
        except ValueError:
            pass
    return str(year) if year else ""


def fetch_ads_documents(token: str, orcid: str, rows: int, author_names: list[str]) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": _publication_query(orcid=orcid, author_names=author_names),
        "fl": "author,title,pub,pubdate,year,doctype,identifier,doi,volume,issue,page,bibcode",
        "sort": "date desc",
        "rows": rows,
    }
    response = requests.get(ADS_API_URL, headers=headers, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    return payload.get("response", {}).get("docs", [])


def build_publication_entry(doc: dict[str, Any]) -> dict[str, Any]:
    authors = doc.get("author", []) or []
    title = _safe_title(doc)
    identifiers = _as_list(doc.get("identifier", []))
    doi_values = _as_list(doc.get("doi", []))
    doi = _extract_doi(doi_values=doi_values, identifiers=identifiers)
    doi = _trim_doi_prefix(doi) if doi else ""
    bibcode = doc.get("bibcode")
    year = doc.get("year")
    pubdate = doc.get("pubdate", "")
    pages = _as_list(doc.get("page", []))

    return {
        "authors": ", ".join(authors),
        "title": title,
        "publication": doc.get("pub", ""),
        "year": _as_int_or_str(year),
        "date_label": _format_date_label(pubdate, year),
        "volume": doc.get("volume", ""),
        "issue": doc.get("issue", ""),
        "pages": _format_pages(pages),
        "doi": doi or "",
        "url": f"https://doi.org/{doi}" if doi else (f"https://ui.adsabs.harvard.edu/abs/{bibcode}" if bibcode else ""),
    }


def _is_excluded_entry(entry: dict[str, Any]) -> bool:
    doi = str(entry.get("doi", "")).strip().lower()
    return doi in EXCLUDED_DOIS


def split_publications(docs: list[dict[str, Any]]) -> dict[str, Any]:
    selected_by_key: dict[str, tuple[int, str, str, dict[str, Any]]] = {}

    # First pass: global deduplication and quality selection.
    for doc in docs:
        authors = doc.get("author", []) or []
        if not authors:
            continue
        if not _is_target_author_present(authors):
            continue
        if _is_software_record(doc):
            continue

        bucket = "conference" if _is_conference(doc) else "journal"
        author_group = "first_author" if _is_first_author(authors[0]) else "coauthored"
        entry = build_publication_entry(doc)
        if _is_excluded_entry(entry):
            continue
        key = _entry_key(entry)
        score = _entry_score(entry)

        current = selected_by_key.get(key)
        if current is None or score > current[0]:
            selected_by_key[key] = (score, author_group, bucket, entry)

    grouped = {
        "first_author": {"journal": [], "conference": []},
        "coauthored": {"journal": [], "conference": []},
    }

    # Second pass: assign winning entries to their selected buckets.
    for _, author_group, bucket, entry in selected_by_key.values():
        grouped[author_group][bucket].append(entry)

    grouped["first_author"]["journal"] = _finalize_group(grouped["first_author"]["journal"])
    grouped["first_author"]["conference"] = _finalize_group(grouped["first_author"]["conference"])
    grouped["coauthored"]["journal"] = _finalize_group(grouped["coauthored"]["journal"])
    grouped["coauthored"]["conference"] = _finalize_group(grouped["coauthored"]["conference"])

    return grouped


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync NASA ADS publications to Jekyll data.")
    parser.add_argument("--orcid", default=DEFAULT_ORCID, help="ORCID to query in NASA ADS")
    parser.add_argument(
        "--author",
        action="append",
        default=[],
        help="Author query term to include (can be repeated).",
    )
    parser.add_argument("--rows", default=200, type=int, help="Maximum ADS rows to fetch")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Output YAML file path")
    args = parser.parse_args()

    token = os.environ.get("ADS_API_TOKEN", "").strip()
    if not token:
        print("Error: ADS_API_TOKEN is not set.", file=sys.stderr)
        return 1

    author_names = _collect_author_args(args.author)

    try:
        docs = fetch_ads_documents(token=token, orcid=args.orcid, rows=args.rows, author_names=author_names)
    except requests.RequestException as exc:
        print(f"Error while calling NASA ADS API: {exc}", file=sys.stderr)
        return 1

    grouped = split_publications(docs)
    _log_stats(docs, grouped)
    data = {
        "generated_at_utc": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "NASA ADS API",
        "orcid": args.orcid,
        "query_authors": author_names,
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
