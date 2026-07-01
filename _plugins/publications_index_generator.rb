# frozen_string_literal: true

module Jekyll
  class PublicationsIndexGenerator < Generator
    safe true
    priority :low

    def generate(site)
      data = build_index(site)
      site.data["publications_index"] = data
      GeneratedDataWriter.write_json(site, "publications_index.json", data)
    end

    private

    def build_index(site)
      pubs = site.data.fetch("publications", {})
      assets = site.data.fetch("research_assets_index", {})
      software_catalog = build_software_catalog(site)

      publications = []
      %w[first_author coauthored].each do |group|
        %w[journal conference].each do |bucket|
          Array(pubs.dig(group, bucket)).each do |item|
            bibcode = item["bibcode"].to_s
            next if bibcode.empty?

            position = item["author_position"]
            asset = assets[bibcode] || { "software" => [], "data" => [], "notes" => "" }
            software_ids = Array(asset["software"])
            software = software_ids.filter_map { |id| software_catalog[id] }

            publications << {
              "bibcode" => bibcode,
              "title" => item["title"].to_s,
              "authors" => item["authors"].to_s,
              "publication" => item["publication"].to_s,
              "year" => item["year"],
              "date_label" => item["date_label"].to_s,
              "volume" => item["volume"].to_s,
              "issue" => item["issue"].to_s,
              "pages" => item["pages"].to_s,
              "doi" => item["doi"].to_s,
              "url" => item["url"].to_s,
              "citation_count" => item["citation_count"].to_i,
              "author_position" => position,
              "author_group" => group,
              "publication_bucket" => bucket,
              "publication_type" => item["publication_type"].to_s,
              "is_open_access" => !!item["is_open_access"],
              "is_first_author" => position == 1,
              "is_lead_author" => position == 1 || position == 2,
              "software" => software,
              "data" => Array(asset["data"]),
              "repro_notes" => asset["notes"].to_s,
              "has_assets" => !software.empty? || Array(asset["data"]).any?
            }
          end
        end
      end

      recent_publications = publications
        .sort_by { |p| [-p["year"].to_i, p["author_position"].to_i] }
        .first(3)

      {
        "generated_at_utc" => pubs["generated_at_utc"],
        "software_catalog" => software_catalog,
        "publications" => publications,
        "recent_publications" => recent_publications
      }
    end

    def build_software_catalog(site)
      catalog = {}
      software = site.data.fetch("software", {})
      %w[featured secondary].each do |tier|
        Array(software[tier]).each do |tool|
          id = tool["id"]
          next if id.nil? || id.empty?

          catalog[id] = {
            "id" => id,
            "name" => tool["name"].to_s,
            "repo" => tool["repo"].to_s,
            "url" => "/software/#software-#{id}"
          }
        end
      end
      catalog
    end
  end
end
