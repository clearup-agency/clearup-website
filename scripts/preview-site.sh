#!/usr/bin/env bash
# Builds the light static preview (the one published at clearup-concept.sites.tab.bot) into site/.
# Static export (homepage only, no admin), Instagram links instead of mp4 files, RSC payload files removed.
# Content: from the database when DATABASE_URL is set (.env.local), else seed/content.json.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .next out site
npm run build:preview
cp -r out site
find site -name '*.txt' -delete
rm -f site/media/*.mp4 site/media/founder.jpg
# drop media the pages don't reference (uploaded images come from Cloudinary / the database)
for f in site/media/* site/brand/og.jpg; do
  [ -e "$f" ] || continue
  grep -q "/${f#site/}" site/ar/index.html site/en/index.html || rm -f "$f"
done
du -sb site
