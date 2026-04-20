#!/bin/bash

# Script to add PWA and GA4 to all article files

PWA_LINKS='<meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="BK Parfume" />
    <meta name="application-name" content="BK Parfume" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="32x32" href="/images/products/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/products/favicon-32.png" />'

GA4_SCRIPT='    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID', {
        'custom_map': {'dimension1': 'page_location'},
        'send_page_view': true,
        'allow_google_signals': true,
        'allow_ad_personalization_signals': true,
        'anonymize_ip': true
      });
    </script>'

for i in {3..13}; do
    file="article-$i.html"
    if [ -f "$file" ]; then
        echo "Processing $file"

        # Add PWA links after alternate link but before humans link
        sed -i '' '/link rel="alternate"/a\
'"$PWA_LINKS"'
' "$file"

        # Remove duplicate humans link if created
        sed -i '' '/link rel="humans"/{N;s/link rel="humans".*link rel="humans"/link rel="humans"/;}' "$file"

        # Add GA4 script after JSON-LD script but before icon link
        sed -i '' '/<\/script>/a\
'"$GA4_SCRIPT"'
' "$file"

        echo "Completed $file"
    fi
done

echo "All articles processed"