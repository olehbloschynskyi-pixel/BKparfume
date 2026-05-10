const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT_DIR, "products");
const SITEMAP_FILE = path.join(ROOT_DIR, "sitemap.xml");
const SITE_URL = "https://bkparfume.site";

const STATIC_PAGES = [
  "about.html",
  "articles.html",
  "contacts.html",
  "zhinochi-parfumy.html",
  "cholovichi-parfumy.html",
  "uniseks-parfumy.html",
  "optova-parfumeriya.html",
  "dostavka-i-oplata.html",
];

function toIsoDate(filePath) {
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function makeUrlEntry(loc, filePath, changefreq = "weekly") {
  return {
    loc,
    lastmod: toIsoDate(filePath),
    changefreq,
  };
}

function sortArticlePages(a, b) {
  const aMatch = a.match(/article-(\d+)\.html$/);
  const bMatch = b.match(/article-(\d+)\.html$/);

  return Number(aMatch?.[1] || 0) - Number(bMatch?.[1] || 0);
}

function listRootFiles(pattern) {
  return fs
    .readdirSync(ROOT_DIR)
    .filter((fileName) => pattern.test(fileName))
    .sort();
}

function listProductFiles() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PRODUCTS_DIR)
    .filter((fileName) => fileName.endsWith(".html"))
    .sort();
}

function buildEntries() {
  const entries = [];
  const indexPath = path.join(ROOT_DIR, "index.html");

  entries.push(makeUrlEntry(`${SITE_URL}/`, indexPath));

  for (const fileName of STATIC_PAGES) {
    const filePath = path.join(ROOT_DIR, fileName);

    if (fs.existsSync(filePath)) {
      entries.push(makeUrlEntry(`${SITE_URL}/${fileName}`, filePath));
    }
  }

  const articlePages =
    listRootFiles(/^article-\d+\.html$/).sort(sortArticlePages);

  for (const fileName of articlePages) {
    entries.push(
      makeUrlEntry(`${SITE_URL}/${fileName}`, path.join(ROOT_DIR, fileName)),
    );
  }

  for (const fileName of listProductFiles()) {
    entries.push(
      makeUrlEntry(
        `${SITE_URL}/products/${fileName}`,
        path.join(PRODUCTS_DIR, fileName),
      ),
    );
  }

  return entries;
}

function renderSitemap(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${entry.loc}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const entries = buildEntries();
  fs.writeFileSync(SITEMAP_FILE, renderSitemap(entries));
  console.log(`Generated sitemap with ${entries.length} URLs`);
}

main();
