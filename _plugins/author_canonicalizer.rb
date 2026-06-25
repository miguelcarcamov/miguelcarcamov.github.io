# frozen_string_literal: true

module AuthorCanonicalizer
  module_function

  def normalize_name(name)
    name.to_s.gsub(/\s+/, " ").strip
  end

  def ascii_name(name)
    normalize_name(name).downcase.tr("áàäâéèëêíìïîóòöôúùüûñ", "aaaaeeeeiiiioooouuuun")
  end

  def canonical_author_key(name)
    parts = normalize_name(name).split(",", 2)
    last = ascii_name(parts[0]).gsub(/[^a-z0-9]+/, "")
    return ascii_name(name) if last.empty?

    first_part = parts.length > 1 ? parts[1].to_s.strip : ""
    first_token = first_part.split(/[\s.-]+/).reject(&:empty?).first.to_s
    first_initial = ascii_name(first_token).gsub(/[^a-z0-9]+/, "")[0].to_s
    "#{last}|#{first_initial}"
  end

  def display_name_score(name)
    parts = normalize_name(name).split(",", 2)
    return name.to_s.length if parts.length < 2

    first_part = parts[1].to_s.strip
    tokens = first_part.split(/[\s.-]+/).reject(&:empty?)
    score = first_part.length
    score += 20 if tokens.any? && tokens[0].length > 1
    score += 5 * [tokens.length - 1, 0].max
    score
  end

  def remember_display_name(store, key, name)
    current = store[key]
    store[key] = name if current.nil? || display_name_score(name) > display_name_score(current)
  end

  def build_author_display_map(author_names)
    store = {}
    author_names.each do |name|
      text = normalize_name(name)
      next if text.empty?

      remember_display_name(store, canonical_author_key(text), text)
    end
    store
  end

  def canonical_display_name(name, display_map)
    display_map[canonical_author_key(name)] || normalize_name(name)
  end

  def canonicalize_authors_list(authors, display_map)
    seen_keys = {}
    authors.filter_map do |author|
      text = normalize_name(author)
      next if text.empty?

      key = canonical_author_key(text)
      next if seen_keys[key]

      seen_keys[key] = true
      canonical_display_name(text, display_map)
    end
  end

  def miguel?(name)
    normalized = ascii_name(name)
    accepted = ["carcamo, miguel", "carcamo, m.", "carcamo, m "]
    excluded = ["carcamo, mario", "carcamo, marcela", "carcamo, martin", "carcamo, maria"]
    return false if excluded.any? { |prefix| normalized.start_with?(prefix) }

    accepted.any? { |prefix| normalized.start_with?(prefix) }
  end

  def slug_id(name)
    slug = ascii_name(name).gsub(/[^a-z0-9]+/, "-").gsub(/^-|-$/, "")
    slug.empty? ? "coauthor" : slug
  end
end
