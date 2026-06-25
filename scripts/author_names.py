"""Canonical author identity helpers for ADS name variants."""

from __future__ import annotations

import re
from typing import Any

_ACCENT_REPLACEMENTS = {
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


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", str(name or "").strip())


def ascii_name(name: str) -> str:
    normalized = normalize_name(name).lower()
    for source, target in _ACCENT_REPLACEMENTS.items():
        normalized = normalized.replace(source, target)
    return re.sub(r"\s+", " ", normalized)


def canonical_author_key(name: str) -> str:
    parts = normalize_name(name).split(",", 1)
    last = re.sub(r"[^a-z0-9]+", "", ascii_name(parts[0]))
    if not last:
        return ascii_name(name)

    first_part = parts[1].strip() if len(parts) > 1 else ""
    tokens = [token for token in re.split(r"[\s.\-]+", first_part) if token]
    first_initial = re.sub(r"[^a-z0-9]+", "", ascii_name(tokens[0]))[:1] if tokens else ""
    return f"{last}|{first_initial}"


def display_name_score(name: str) -> int:
    parts = normalize_name(name).split(",", 1)
    if len(parts) < 2:
        return len(name)

    first_part = parts[1].strip()
    tokens = [token for token in re.split(r"[\s.\-]+", first_part) if token]
    score = len(first_part)
    if tokens and len(tokens[0]) > 1:
        score += 20
    score += 5 * max(0, len(tokens) - 1)
    return score


def remember_display_name(store: dict[str, str], key: str, name: str) -> None:
    current = store.get(key)
    if current is None or display_name_score(name) > display_name_score(current):
        store[key] = name


def build_author_display_map(author_names: list[str]) -> dict[str, str]:
    store: dict[str, str] = {}
    for name in author_names:
        text = normalize_name(name)
        if text:
            remember_display_name(store, canonical_author_key(text), text)
    return store


def canonical_display_name(name: str, display_map: dict[str, str]) -> str:
    return display_map.get(canonical_author_key(name), normalize_name(name))


def canonicalize_authors_list(authors: list[str], display_map: dict[str, str]) -> list[str]:
    seen_keys: set[str] = set()
    result: list[str] = []
    for author in authors:
        text = normalize_name(author)
        if not text:
            continue
        key = canonical_author_key(text)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        result.append(canonical_display_name(text, display_map))
    return result


def apply_canonical_author_names(entries: list[dict[str, Any]]) -> None:
    all_names: list[str] = []
    for entry in entries:
        all_names.extend(str(name) for name in entry.get("authors_list", []) if str(name).strip())

    display_map = build_author_display_map(all_names)
    for entry in entries:
        authors_list = [str(name) for name in entry.get("authors_list", []) if str(name).strip()]
        canonical_list = canonicalize_authors_list(authors_list, display_map)
        entry["authors_list"] = canonical_list
        entry["authors"] = ", ".join(canonical_list)
