# frozen_string_literal: true

require "json"

module Jekyll
  class SearchIndexGenerator < Generator
    safe true
    priority :lowest

    def generate(site)
      page = PageWithoutAFile.new(site, site.source, "", "search-index.json")
      page.content = JSON.generate(build_index(site))
      page.data["layout"] = nil
      page.data["permalink"] = "/search-index.json"
      page.data["sitemap"] = false
      site.pages << page
    end

    private

    def build_index(site)
      docs = []
      append_publications(docs, site.data.fetch("publications", {}))
      append_software(docs, site.data.fetch("software", {}))
      append_syllabi(docs, site.collections["syllabi"]&.docs || [])
      docs << {
        "id" => "join-page",
        "title" => "Join the research group",
        "url" => "/join/",
        "section" => "Join",
        "body" => "student research opportunities USACH PhD doctoral master undergraduate thesis recruitment",
        "meta" => "Recruitment"
      }
      docs << {
        "id" => "writing-page",
        "title" => "The Faint Signal — Writing",
        "url" => "/writing/",
        "section" => "Writing",
        "body" => "Substack essays newsletter radio astronomy computing The Faint Signal",
        "meta" => "Substack"
      }
      docs
    end

    def append_publications(docs, pubs)
      %w[first_author coauthored].each do |group|
        %w[journal conference].each do |bucket|
          Array(pubs.dig(group, bucket)).each do |item|
            bibcode = item["bibcode"]
            next if bibcode.nil? || bibcode.empty?

            docs << {
              "id" => "pub-#{bibcode}",
              "title" => item["title"].to_s,
              "url" => "/publications/",
              "section" => "Publications",
              "body" => [
                item["authors"],
                item["publication"],
                item["year"].to_s,
                item["doi"]
              ].compact.join(" "),
              "meta" => "#{item['year']} · #{item['publication']}"
            }
          end
        end
      end
    end

    def append_software(docs, software)
      %w[featured secondary].each do |tier|
        Array(software[tier]).each do |item|
          id = item["id"]
          next if id.nil? || id.empty?

          docs << {
            "id" => "software-#{id}",
            "title" => item["name"].to_s,
            "url" => "/software/",
            "section" => "Software",
            "body" => [
              item["tagline"],
              item["description"],
              Array(item["areas"]).join(" ")
            ].compact.join(" "),
            "meta" => item["tagline"].to_s
          }
        end
      end
    end

    def append_syllabi(docs, syllabi)
      syllabi.each do |doc|
        title = doc.data["syllabus_title"] || doc.data["title"]
        next if title.nil? || title.empty?

        docs << {
          "id" => "syllabus-#{doc.basename_without_ext}",
          "title" => title.to_s,
          "url" => doc.url.to_s,
          "section" => "Courses",
          "body" => [
            doc.data["semester"],
            doc.data["role"],
            doc.data["description"]
          ].compact.join(" "),
          "meta" => doc.data["semester"].to_s
        }
      end
    end
  end
end
