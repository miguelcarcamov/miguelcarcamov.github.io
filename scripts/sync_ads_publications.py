#!/usr/bin/env python3
"""Sync publications from NASA ADS and compute publication statistics."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import statistics
import sys
from typing import Any

import requests
import yaml


ADS_API_URL = "https://api.adsabs.harvard.edu/v1/search/query"
DEFAULT_ORCID = "0000-0003-0564-8167"
DEFAULT_AUTHORS = ["Carcamo, Miguel", "Cárcamo, Miguel"]
OUTPUT_PATH = "_data/publications.yml"
STATS_OUTPUT_PATH = "_data/publication_stats.json"
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


def _is_target_author_name(author_value: str) -> bool:
    normalized = _normalize_text(author_value)
    accepted_prefixes = ("carcamo, miguel", "carcamo, m.", "carcamo, m ")
    excluded_prefixes = (
        "carcamo, mario",
        "carcamo, marcela",
        "carcamo, martin",
        "carcamo, maria",
        "carcamo, maria paz",
    )
    if normalized.startswith(excluded_prefixes):
        return False
    return normalized.startswith(accepted_prefixes)


def _is_first_author(author_value: str) -> bool:
    return _is_target_author_name(author_value)


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
    for author_name in authors:
        if _is_target_author_name(author_name):
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
        "fl": "author,title,pub,pubdate,year,doctype,identifier,doi,volume,issue,page,bibcode,citation_count,orcid_pub,orcid_user,orcid_other",
        "sort": "date desc",
        "rows": rows,
    }
    response = requests.get(ADS_API_URL, headers=headers, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    return payload.get("response", {}).get("docs", [])


def _target_author_position(doc: dict[str, Any], orcid: str) -> int | None:
    authors = doc.get("author", []) or []
    for index, author_name in enumerate(authors, start=1):
        if _is_target_author_name(author_name):
            return index

    # Fallback: try ORCID-bearing author arrays if available.
    for key in ("orcid_pub", "orcid_user", "orcid_other"):
        values = _as_list(doc.get(key, []))
        if not values:
            continue
        for index, value in enumerate(values, start=1):
            if value.strip() == orcid:
                return index

    return None


def build_publication_entry(doc: dict[str, Any], orcid: str) -> dict[str, Any]:
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
    author_position = _target_author_position(doc=doc, orcid=orcid)
    citation_count = doc.get("citation_count", 0)
    if citation_count is None:
        citation_count = 0
    citation_count = int(citation_count)
    is_conference = _is_conference(doc)

    return {
        "authors": ", ".join(authors),
        "authors_list": authors,
        "title": title,
        "publication": doc.get("pub", ""),
        "year": _as_int_or_str(year),
        "date_label": _format_date_label(pubdate, year),
        "volume": doc.get("volume", ""),
        "issue": doc.get("issue", ""),
        "pages": _format_pages(pages),
        "doi": doi or "",
        "url": f"https://doi.org/{doi}" if doi else (f"https://ui.adsabs.harvard.edu/abs/{bibcode}" if bibcode else ""),
        "citation_count": citation_count,
        "author_position": author_position,
        "publication_type": "conference" if is_conference else "journal",
        "bibcode": bibcode or "",
    }


def _is_excluded_entry(entry: dict[str, Any]) -> bool:
    doi = str(entry.get("doi", "")).strip().lower()
    return doi in EXCLUDED_DOIS


def split_publications(docs: list[dict[str, Any]], orcid: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
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
        entry = build_publication_entry(doc, orcid=orcid)
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

    selected_entries: list[dict[str, Any]] = []
    for _, author_group, bucket, entry in selected_by_key.values():
        entry["author_group"] = author_group
        entry["publication_bucket"] = bucket
        selected_entries.append(entry)

    selected_entries = _sort_entries(selected_entries)

    return grouped, selected_entries


def _safe_int(value: Any) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return 0


def _leadership_factor(position: int | None) -> float:
    if position in (1, 2):
        return 1.0
    if position == 3:
        return 0.9
    if position == 4:
        return 0.7
    if position == 5:
        return 0.5
    if position == 6:
        return 0.3
    return 0.2


def _h_index(citations: list[int]) -> int:
    sorted_citations = sorted(citations, reverse=True)
    h = 0
    for index, value in enumerate(sorted_citations, start=1):
        if value >= index:
            h = index
        else:
            break
    return h


def _citation_histogram(citations: list[int]) -> dict[str, int]:
    bins = {
        "0": 0,
        "1-4": 0,
        "5-9": 0,
        "10-19": 0,
        "20-49": 0,
        "50+": 0,
    }
    for value in citations:
        if value == 0:
            bins["0"] += 1
        elif value <= 4:
            bins["1-4"] += 1
        elif value <= 9:
            bins["5-9"] += 1
        elif value <= 19:
            bins["10-19"] += 1
        elif value <= 49:
            bins["20-49"] += 1
        else:
            bins["50+"] += 1
    return bins


def _author_position_distribution(entries: list[dict[str, Any]]) -> dict[str, int]:
    result = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7+": 0,
        "unknown": 0,
    }
    for entry in entries:
        position = entry.get("author_position")
        if position is None:
            result["unknown"] += 1
        elif position >= 7:
            result["7+"] += 1
        else:
            result[str(position)] += 1
    return result


def _yearly_series(entries: list[dict[str, Any]]) -> dict[str, Any]:
    yearly_papers: dict[int, int] = {}
    yearly_citations: dict[int, int] = {}
    for entry in entries:
        year = _safe_int(entry.get("year"))
        if year <= 0:
            continue
        yearly_papers[year] = yearly_papers.get(year, 0) + 1
        yearly_citations[year] = yearly_citations.get(year, 0) + int(entry.get("citation_count", 0))

    years = sorted(set(yearly_papers.keys()) | set(yearly_citations.keys()))
    cumulative: list[int] = []
    running = 0
    for year in years:
        running += yearly_citations.get(year, 0)
        cumulative.append(running)

    return {
        "years": years,
        "papers_per_year": [yearly_papers.get(year, 0) for year in years],
        "citations_per_year": [yearly_citations.get(year, 0) for year in years],
        "cumulative_citations": cumulative,
    }


def _top_cited(entries: list[dict[str, Any]], limit: int = 10) -> list[dict[str, Any]]:
    sorted_entries = sorted(entries, key=lambda item: int(item.get("citation_count", 0)), reverse=True)
    top = []
    for entry in sorted_entries[:limit]:
        top.append(
            {
                "title": entry.get("title", ""),
                "year": entry.get("year", ""),
                "publication": entry.get("publication", ""),
                "citation_count": int(entry.get("citation_count", 0)),
                "url": entry.get("url", ""),
                "doi": entry.get("doi", ""),
            }
        )
    return top


def _fondecyt_np(entries: list[dict[str, Any]], current_year: int) -> dict[str, Any]:
    min_year = current_year - 4
    candidates = []
    for entry in entries:
        if entry.get("publication_type") != "journal":
            continue
        year = _safe_int(entry.get("year"))
        if year < min_year:
            continue

        citations = int(entry.get("citation_count", 0))
        age = max(1, current_year - year)
        c_i = citations / age
        l_i = _leadership_factor(entry.get("author_position"))
        s_i = l_i * ((1.0 + c_i) ** 0.5)
        candidates.append(
            {
                "title": entry.get("title", ""),
                "year": year,
                "publication": entry.get("publication", ""),
                "citations": citations,
                "author_position": entry.get("author_position"),
                "leadership_factor": round(l_i, 4),
                "c_i": round(c_i, 4),
                "s_i": round(s_i, 4),
                "url": entry.get("url", ""),
            }
        )

    top = sorted(candidates, key=lambda item: item["s_i"], reverse=True)[:10]
    p_sum = sum(item["s_i"] for item in top)
    np_score = min(1.0 + 1.7 * (p_sum ** 0.25), 5.0) if top else 1.0
    return {
        "window_years": 5,
        "window_start_year": min_year,
        "window_end_year": current_year,
        "top_contributors": top,
        "p_sum": round(p_sum, 4),
        "np_score": round(np_score, 4),
    }


def build_publication_stats(entries: list[dict[str, Any]], generated_at_utc: str) -> dict[str, Any]:
    citations = [int(entry.get("citation_count", 0)) for entry in entries]
    citations_sorted_desc = sorted(citations, reverse=True)
    total_citations = sum(citations)
    average_citations = round(total_citations / len(citations), 2) if citations else 0.0
    median_citations = round(float(statistics.median(citations)), 2) if citations else 0.0
    h_index = _h_index(citations)
    i10_index = len([value for value in citations if value >= 10])
    h_paper_citations = citations_sorted_desc[h_index - 1] if h_index > 0 and len(citations_sorted_desc) >= h_index else 0
    next_after_h = citations_sorted_desc[h_index] if len(citations_sorted_desc) > h_index else 0

    years = [_safe_int(entry.get("year")) for entry in entries if _safe_int(entry.get("year")) > 0]
    current_year = dt.datetime.now(dt.UTC).year
    first_year = min(years) if years else current_year
    career_years = max(1, current_year - first_year + 1)
    m_index = round(h_index / career_years, 4)

    coauthors = set()
    for entry in entries:
        for author_name in entry.get("authors_list", []):
            if _is_target_author_name(str(author_name)):
                continue
            normalized = _normalize_text(str(author_name))
            if normalized:
                coauthors.add(normalized)

    journal_count = len([entry for entry in entries if entry.get("publication_type") == "journal"])
    conference_count = len([entry for entry in entries if entry.get("publication_type") == "conference"])
    first_author_count = len([entry for entry in entries if entry.get("author_group") == "first_author"])
    lead_author_count = len(
        [entry for entry in entries if entry.get("author_position") is not None and int(entry.get("author_position")) <= 2]
    )

    yearly = _yearly_series(entries)
    histogram = _citation_histogram(citations)
    position_distribution = _author_position_distribution(entries)
    fondecyt = _fondecyt_np(entries, current_year=current_year)

    chart_palette = {
        "primary": "#362cb1",
        "secondary": "#493fc8",
        "accent": "#6b5ce7",
        "muted": "#9ea0a5",
        "grid": "#e9e9ef",
        "text": "#4d4f57",
    }

    return {
        "generated_at_utc": generated_at_utc,
        "source": "NASA ADS API",
        "volume": {
            "total_publications": len(entries),
            "journal_publications": journal_count,
            "conference_publications": conference_count,
            "first_author_publications": first_author_count,
            "lead_author_publications": lead_author_count,
            "unique_coauthors": len(coauthors),
        },
        "citations": {
            "total_citations": total_citations,
            "average_citations_per_paper": average_citations,
            "median_citations_per_paper": median_citations,
            "h_index": h_index,
            "h_index_h_paper_citations": h_paper_citations,
            "h_index_next_paper_citations": next_after_h,
            "citations_sorted_desc": citations_sorted_desc,
            "i10_index": i10_index,
            "m_index": m_index,
            "first_publication_year": first_year,
            "career_years": career_years,
        },
        "yearly": yearly,
        "histogram": histogram,
        "author_position_distribution": position_distribution,
        "top_cited": _top_cited(entries, limit=10),
        "fondecyt": fondecyt,
        "chart_palette": chart_palette,
    }


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
    parser.add_argument("--stats-output", default=STATS_OUTPUT_PATH, help="Output stats JSON file path")
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

    grouped, selected_entries = split_publications(docs, orcid=args.orcid)
    _log_stats(docs, grouped)
    generated_at_utc = dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    data = {
        "generated_at_utc": generated_at_utc,
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

    stats = build_publication_stats(entries=selected_entries, generated_at_utc=generated_at_utc)
    with open(args.stats_output, "w", encoding="utf-8") as output_file:
        json.dump(stats, output_file, ensure_ascii=False, indent=2)

    print(f"Wrote {args.output} from NASA ADS ({len(docs)} records).")
    print(f"Wrote {args.stats_output} with publication metrics.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
