source "https://rubygems.org"

# 2.239.0 fixes deliver re-uploading screenshots while App Store Connect is
# still assigning their checksums, which left every iOS listing image doubled.
gem "fastlane", ">= 2.239.0"

plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)
