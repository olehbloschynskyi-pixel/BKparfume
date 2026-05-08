const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_FILE = path.join(ROOT_DIR, "data", "products.json");
const FRAGRANCES_FILE = path.join(ROOT_DIR, "data", "fragrance-profiles.json");
const CONTENT_FILE = path.join(ROOT_DIR, "data", "product-content.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const fileIndex = argv.indexOf("--file");
  if (fileIndex === -1 || !argv[fileIndex + 1]) {
    throw new Error(
      "Usage: node scripts/import-product.js --file path/to/product.json",
    );
  }

  return {
    filePath: path.resolve(process.cwd(), argv[fileIndex + 1]),
  };
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertRequired(product, fieldName) {
  if (
    product[fieldName] === undefined ||
    product[fieldName] === null ||
    product[fieldName] === ""
  ) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
}

function buildRawNotes(input) {
  if (input.rawNotes) {
    return String(input.rawNotes).trim();
  }

  const groups = [
    ["Верхні", input.topNotes],
    ["Серцеві", input.heartNotes],
    ["Базові", input.baseNotes],
  ]
    .filter(([, values]) => Array.isArray(values) && values.length)
    .map(([label, values]) => `${label}: ${values.join(", ")}`);

  return groups.join(" | ");
}

function sortById(list) {
  return [...list].sort((left, right) => Number(left.id) - Number(right.id));
}

function main() {
  const { filePath } = parseArgs(process.argv.slice(2));
  const input = readJson(filePath);

  [
    "id",
    "name",
    "brand",
    "category",
    "volume",
    "price",
    "image",
    "shortDescription",
  ].forEach((fieldName) => assertRequired(input, fieldName));

  const products = readJson(PRODUCTS_FILE);
  const fragrances = readJson(FRAGRANCES_FILE);
  const contentEntries = readJson(CONTENT_FILE);
  const slug = normalizeSlug(input.slug || input.name);

  if (!slug) {
    throw new Error("Unable to build slug for new product");
  }

  if (products.some((product) => Number(product.id) === Number(input.id))) {
    throw new Error(`Product with id ${input.id} already exists`);
  }

  if (products.some((product) => product.slug === slug)) {
    throw new Error(`Product with slug ${slug} already exists`);
  }

  const fragranceId = `${slug}-profile`;
  const contentId = `${slug}-content`;
  const topNotes = Array.isArray(input.topNotes) ? input.topNotes : [];
  const heartNotes = Array.isArray(input.heartNotes) ? input.heartNotes : [];
  const baseNotes = Array.isArray(input.baseNotes) ? input.baseNotes : [];
  const rawNotes = buildRawNotes(input);

  products.push({
    id: Number(input.id),
    name: input.name,
    brand: input.brand,
    category: input.category,
    volume: input.volume,
    price: Number(input.price),
    image: input.image,
    badge: input.badge || "",
    slug,
    seoPage: Boolean(input.seoPage),
    fragranceId,
    contentId,
  });

  fragrances.push({
    id: fragranceId,
    rawNotes,
    topNotes,
    heartNotes,
    baseNotes,
  });

  contentEntries.push({
    id: contentId,
    shortDescription: String(input.shortDescription).trim(),
    longDescription: String(
      input.longDescription || input.shortDescription,
    ).trim(),
    metaDescription: String(input.metaDescription || "").trim(),
  });

  writeJson(PRODUCTS_FILE, sortById(products));
  writeJson(FRAGRANCES_FILE, fragrances);
  writeJson(CONTENT_FILE, contentEntries);

  console.log(`Imported product ${input.name} (${slug})`);
}

main();
