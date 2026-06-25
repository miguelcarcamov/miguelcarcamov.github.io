# frozen_string_literal: true

require "json"

module GeneratedDataWriter
  module_function

  def write_json(site, filename, data)
    path = File.join(site.source, "_data", filename)
    payload = "#{JSON.generate(data)}\n"
    return if File.exist?(path) && File.read(path) == payload

    File.write(path, payload)
  end
end
