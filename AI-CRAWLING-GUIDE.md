# BK Parfume — AI Crawling & Indexing Guide

## Overview

BK Parfume website is fully optimized for AI crawling and indexing by Large Language Models (LLMs) and AI services.

## AI Permissions

### ✅ Allowed AI Services

- **OpenAI**: ChatGPT, GPT-4, GPT-4o, and related models
- **Anthropic**: Claude and all Claude models
- **Google**: Bard, Gemini, and related AI services
- **Microsoft**: Copilot, Bing AI, and related services
- **Meta**: LLaMA-based models
- **All other reputable AI services**

### 📄 Key Configuration Files

#### 1. **robots.txt**

Located at: `https://bkparfume.site/robots.txt`

- Explicit permissions for GPTBot, Claude-Web, CCBot, and other AI agents
- Full crawl access to all public pages

#### 2. **humans.txt**

Located at: `https://bkparfume.site/humans.txt`

- Team and organization information
- Technology stack details
- Contact information for inquiries

#### 3. **openai-policy.txt**

Located at: `https://bkparfume.site/openai-policy.txt`

- Explicit policy for OpenAI crawling
- Confirmation of AI training permissions

#### 4. **ai-index.conf**

Located at: `https://bkparfume.site/ai-index.conf`

- Comprehensive AI indexing configuration
- Permissions for all major AI services
- Content type specifications

## Content Available for AI Indexing

### Main Content

1. **Product Catalog**: https://bkparfume.site/
   - 155+ perfume products with detailed descriptions
   - Price information in UAH
   - Brand and category information
   - Fragrance notes

2. **Blog/Articles**: https://bkparfume.site/articles.html
   - Detailed articles about perfumes
   - Selection guides
   - Industry trends
   - Usage tips

3. **Company Information**: https://bkparfume.site/about.html
   - Company mission and values
   - Quality approach
   - Shipping information

4. **Contact Information**: https://bkparfume.site/contacts.html
   - Customer support details
   - Contact form
   - Social media links

## Structured Data (Schema.org)

The website implements comprehensive structured data:

- **Organization** schema with business information
- **Store** schema for e-commerce
- **BreadcrumbList** for site navigation
- **SearchAction** for search functionality
- **ContactPoint** for customer support

## Sitemap

The website sitemap is available at:
`https://bkparfume.site/sitemap.xml`

All pages are included with lastmod and changefreq information.

## Metadata

### Meta Tags for AI Recognition

All pages include:

- `meta name="robots"` with "index, follow, max-image-preview:large"
- `meta name="AdsBot-Google"` for bot compatibility
- `meta name="language"` set to "uk" (Ukrainian)
- `meta name="classification"` with page category

### Open Graph Tags

- Full og:type, og:title, og:description for social sharing
- og:image for rich previews
- og:locale set to "uk_UA"

### Geographic Information

- `meta name="geo.region"` set to "UA"
- `meta name="geo.placename"` for location targeting
- `meta name="ICBM"` with coordinates (48.3794, 31.1656)

## Language

The website is available in **Ukrainian (uk-UA)**. All content is in Ukrainian with proper language meta tags.

## Rate Limiting & Politeness

Please crawl responsibly:

- Respect the `Crawl-delay` values in robots.txt if specified
- Use a descriptive User-Agent
- Cache responses when appropriate
- Contact us for large-scale crawling operations

## Contact Information

For questions about AI crawling, indexing permissions, or bulk data access:

- **Email**: info@bkparfume.site
- **Website**: https://bkparfume.site/
- **Contact Form**: https://bkparfume.site/contacts.html

## Disclaimer

This guide provides general information about AI crawling permissions. Specific terms may apply depending on the AI service's terms of service. Always ensure compliance with:

- The website's terms of service
- Applicable local and international laws
- Copyright and intellectual property regulations
- Your AI service provider's policies

---

**Last Updated**: April 18, 2026
**Language**: Ukrainian & English
**Maintained by**: BK Parfume
