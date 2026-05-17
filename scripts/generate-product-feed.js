const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_FILE = path.join(ROOT_DIR, "data", "products.json");
const FRAGRANCES_FILE = path.join(ROOT_DIR, "data", "fragrance-profiles.json");
const CONTENT_FILE = path.join(ROOT_DIR, "data", "product-content.json");
const OUTPUT_FILE = path.join(ROOT_DIR, "product-feed.xml");

const SITE_URL = "https://bkparfume.site";
const STORE_NAME = "BK Parfume";
const STORE_CURRENCY = "UAH";
const GOOGLE_PRODUCT_CATEGORY =
  "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function indexCatalogEntries(entries) {
  return new Map(
    entries
      .filter((entry) => entry && entry.id)
      .map((entry) => [entry.id, entry]),
  );
}

function readProducts() {
  const baseProducts = readJson(PRODUCTS_FILE);
  const fragranceProfiles = readJson(FRAGRANCES_FILE);
  const productContent = readJson(CONTENT_FILE);
  const fragranceById = indexCatalogEntries(fragranceProfiles);
  const contentById = indexCatalogEntries(productContent);

  return baseProducts.map((product) => {
    const fragrance = fragranceById.get(product.fragranceId) || {};
    const content = contentById.get(product.contentId) || {};

    return {
      ...product,
      description: content.shortDescription || content.longDescription || "",
      longDescription:
        content.longDescription || content.shortDescription || "",
      metaDescription: content.metaDescription || "",
      notes: fragrance.rawNotes || "",
    };
  });
}

function normalizeProductName(name) {
  const normalized = String(name || "")
    .replace(/^BK\s*parfume\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? `BKparfume ${normalized}` : "BKparfume";
}

function displayName(name) {
  return normalizeProductName(name);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(relativePath) {
  const normalizedPath = String(relativePath || "").replace(/^\/+/, "");
  return `${SITE_URL}/${normalizedPath}`;
}

function productUrl(product) {
  return `${SITE_URL}/products/${product.slug}.html`;
}

function productCategory(product) {
  const categories = {
    women: "Жіночі парфуми на розлив",
    men: "Чоловічі парфуми на розлив",
    unisex: "Унісекс парфуми BK Parfume",
  };

  return categories[product.category] || "Парфуми BK Parfume";
}

function productBrand(product) {
  return normalizeWhitespace(product.brand) || STORE_NAME;
}

function feedDescription(product) {
  const description =
    product.metaDescription || product.description || product.longDescription;
  return normalizeWhitespace(description);
}

function renderItem(product) {
  const title = `${displayName(product.name)} ${product.volume}`;
  const description = feedDescription(product);

  return [
    "  <item>",
    `    <g:id>${escapeXml(product.id)}</g:id>`,
    `    <g:title>${escapeXml(title)}</g:title>`,
    `    <g:description>${escapeXml(description)}</g:description>`,
    `    <g:link>${escapeXml(productUrl(product))}</g:link>`,
    `    <g:image_link>${escapeXml(absoluteUrl(product.image))}</g:image_link>`,
    `    <g:availability>in stock</g:availability>`,
    `    <g:condition>new</g:condition>`,
    `    <g:price>${escapeXml(`${product.price} ${STORE_CURRENCY}`)}</g:price>`,
    `    <g:brand>${escapeXml(productBrand(product))}</g:brand>`,
    `    <g:product_type>${escapeXml(productCategory(product))}</g:product_type>`,
    `    <g:google_product_category>${escapeXml(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>`,
    `    <g:identifier_exists>false</g:identifier_exists>`,
    "  </item>",
  ].join("\n");
}

function renderFeed(products) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `  <title>${escapeXml(STORE_NAME)}</title>`,
    `  <link>${SITE_URL}/</link>`,
    `  <description>${escapeXml("Товарний XML-фід BK Parfume для Google Merchant Center")}</description>`,
  ];

  for (const product of products) {
    lines.push(renderItem(product));
  }

  lines.push("</channel>");
  lines.push("</rss>");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const products = readProducts().filter((product) => product.seoPage);
  fs.writeFileSync(OUTPUT_FILE, renderFeed(products), "utf8");
  console.log(`Generated product feed with ${products.length} items`);
}

main();
