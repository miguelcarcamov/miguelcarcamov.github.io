"""Shared FONDECYT scoring helpers used across ADS scripts."""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Any


LEADERSHIP_FACTOR = {1: 1.00, 2: 1.00, 3: 0.90, 4: 0.70, 5: 0.50, 6: 0.30}
LEADERSHIP_DEFAULT = 0.20


@dataclass
class AyaContributor:
    """Single paper contribution for AYA-style FONDECYT score."""

    title: str
    year: int
    publication: str
    citations: int
    author_position: int | None
    leadership_factor: float
    c_i: float
    s_i: float
    url: str


def leadership_factor(position: int | None) -> float:
    return LEADERSHIP_FACTOR.get(position, LEADERSHIP_DEFAULT)


def compute_aya_np_from_entries(
    entries: list[dict[str, Any]],
    current_year: int,
    window_years: int = 5,
) -> dict[str, Any]:
    """Compute FONDECYT AYA P and NP from publication entries.

    Expected entry keys include:
    - publication_type, year, citation_count, author_position, title, publication, url
    """
    min_year = current_year - window_years
    contributors: list[AyaContributor] = []

    for entry in entries:
        if entry.get("publication_type") != "journal":
            continue

        year = int(entry.get("year", 0) or 0)
        if year < min_year:
            continue

        citations = int(entry.get("citation_count", 0) or 0)
        age = max(1, current_year - year)
        c_i = citations / age
        l_i = leadership_factor(entry.get("author_position"))
        s_i = l_i * sqrt(1.0 + c_i)

        contributors.append(
            AyaContributor(
                title=str(entry.get("title", "") or ""),
                year=year,
                publication=str(entry.get("publication", "") or ""),
                citations=citations,
                author_position=entry.get("author_position"),
                leadership_factor=round(l_i, 4),
                c_i=round(c_i, 4),
                s_i=round(s_i, 4),
                url=str(entry.get("url", "") or ""),
            )
        )

    top = sorted(contributors, key=lambda item: item.s_i, reverse=True)[:10]
    p_sum = sum(item.s_i for item in top)
    np_score = min(1.0 + 1.7 * (p_sum ** 0.25), 5.0) if top else 1.0

    return {
        "window_years": current_year - min_year + 1,
        "window_start_year": min_year,
        "window_end_year": current_year,
        "top_contributors": [item.__dict__ for item in top],
        "p_sum": round(p_sum, 4),
        "np_score": round(np_score, 4),
    }
