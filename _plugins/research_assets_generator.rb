# frozen_string_literal: true

module Jekyll
  class ResearchAssetsGenerator < Generator
    safe true
    priority :high

    def generate(site)
      site.data["research_assets_index"] = build_index(site)
    end

    private

    def build_index(site)
      bibcode_map = {}

      Array(site.data.dig("research_assets", "links")).each do |link|
        bibcode = link["bibcode"]
        next if bibcode.nil? || bibcode.empty?

        bibcode_map[bibcode] = {
          "software" => Array(link["software"]).map(&:to_s),
          "data" => Array(link["data"]).map(&:to_s),
          "notes" => link["notes"].to_s
        }
      end

      Array(site.data.dig("software", "featured")).each do |tool|
        Array(tool["paper_bibcodes"]).each do |bibcode|
          next if bibcode.nil? || bibcode.empty?

          entry = bibcode_map[bibcode] || { "software" => [], "data" => [], "notes" => "" }
          ids = entry["software"]
          ids << tool["id"] unless ids.include?(tool["id"])
          bibcode_map[bibcode] = entry
        end
      end

      bibcode_map
    end
  end
end
