#!/usr/bin/env python3
import os
import re

# PWA links to add
PWA_LINKS = '''    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="BK Parfume" />
    <meta name="application-name" content="BK Parfume" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="32x32" href="/images/products/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/products/favicon-32.png" />'''

# GA4 script to add
GA4_SCRIPT = '''    <!-- Google Analytics 4 -->
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
    </script>'''

# Process articles 5-13
for i in range(5, 14):
    filename = f'article-{i}.html'
    filepath = os.path.join('/Users/blosinskijoleg/Downloads/bkparfume', filename)

    if os.path.exists(filepath):
        print(f'Processing {filename}')

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add PWA links after alternate link
        content = re.sub(
            r'(\s*<link\s+rel="alternate".*?>\s*\n)\s*(<link rel="humans")',
            r'\1' + PWA_LINKS + '\n    \2',
            content,
            flags=re.MULTILINE | re.DOTALL
        )

        # Add GA4 script after JSON-LD script
        content = re.sub(
            r'(\s*</script>\s*\n)\s*(<link)',
            r'\1' + GA4_SCRIPT + '\n\n    \2',
            content,
            flags=re.MULTILINE | re.DOTALL
        )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f'Completed {filename}')

print('All articles processed')