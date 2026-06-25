# frozen_string_literal: true

module Jekyll
  class CollaborationNetworkGenerator < Generator
    safe true
    priority :low

    MAX_NODES = 24

    def generate(site)
      data = build_network(site.data.fetch("publications", {}))
      site.data["collaboration_network"] = data
      GeneratedDataWriter.write_json(site, "collaboration_network.json", data)
    end

    private

    def build_network(pubs)
      coauthor_counts = Hash.new(0)
      display_names = {}
      links = []
      years = []

      each_entry(pubs) do |item|
        authors = Array(item["authors_list"]).map(&:to_s).reject(&:empty?)
        next if authors.empty?

        year = safe_year(item["year"])
        years << year if year.positive?
        first_author = item["author_group"].to_s == "first_author"

        coauthor_keys = authors
          .reject { |name| AuthorCanonicalizer.miguel?(name) }
          .map { |name| AuthorCanonicalizer.canonical_author_key(name) }
          .uniq

        coauthor_keys.each { |key| coauthor_counts[key] += 1 }

        authors.reject { |name| AuthorCanonicalizer.miguel?(name) }.each do |name|
          key = AuthorCanonicalizer.canonical_author_key(name)
          AuthorCanonicalizer.remember_display_name(display_names, key, name)
        end

        coauthor_keys.each do |key|
          links << {
            "coauthor_key" => key,
            "year" => year,
            "first_author" => first_author,
            "title" => item["title"].to_s,
            "url" => item["url"].to_s,
            "bibcode" => item["bibcode"].to_s
          }
        end
      end

      top_keys = coauthor_counts.sort_by { |_, count| -count }.first(MAX_NODES).map(&:first)

      paper_count = 0
      each_entry(pubs) { paper_count += 1 }

      nodes = [
        {
          "id" => "miguel-carcamo",
          "key" => "miguel-carcamo",
          "label" => "Miguel Cárcamo",
          "papers" => paper_count,
          "is_self" => true
        }
      ]

      top_keys.each do |key|
        label = display_names.fetch(key)
        nodes << {
          "id" => AuthorCanonicalizer.slug_id(label),
          "key" => key,
          "label" => label,
          "papers" => coauthor_counts[key],
          "is_self" => false
        }
      end

      {
        "year_min" => years.min,
        "year_max" => years.max,
        "node_count" => nodes.length,
        "link_count" => links.length,
        "nodes" => nodes,
        "links" => links
      }
    end

    def each_entry(pubs)
      %w[first_author coauthored].each do |group|
        %w[journal conference].each do |bucket|
          Array(pubs.dig(group, bucket)).each do |item|
            yield item
          end
        end
      end
    end

    def safe_year(value)
      Integer(value)
    rescue ArgumentError, TypeError
      0
    end
  end
end
