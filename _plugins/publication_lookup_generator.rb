# frozen_string_literal: true

module Jekyll
  class PublicationLookupGenerator < Generator
    safe true
    priority :high

    def generate(site)
      data = build_lookup(site.data.fetch("publications", {}))
      site.data["publication_lookup"] = data
      GeneratedDataWriter.write_json(site, "publication_lookup.json", data)
    end

    private

    def build_lookup(pubs)
      lookup = {}
      %w[first_author coauthored].each do |group|
        %w[journal conference].each do |bucket|
          Array(pubs.dig(group, bucket)).each do |item|
            bibcode = item["bibcode"]
            next if bibcode.nil? || bibcode.empty?

            lookup[bibcode] = item
          end
        end
      end
      lookup
    end
  end
end
