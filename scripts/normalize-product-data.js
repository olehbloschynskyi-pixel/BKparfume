const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_FILE = path.join(ROOT_DIR, "data", "products.json");
const FRAGRANCES_FILE = path.join(ROOT_DIR, "data", "fragrance-profiles.json");
const CONTENT_FILE = path.join(ROOT_DIR, "data", "product-content.json");
const CATEGORY_LABELS = {
  women: "жіночих парфумів",
  men: "чоловічих парфумів",
  unisex: "унісекс ароматів",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return readJson(filePath);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function buildRelationId(product, suffix) {
  const baseSlug = String(product.slug || "")
    .trim()
    .toLowerCase();

  if (!baseSlug) {
    throw new Error(`Product ${product.id} is missing slug`);
  }

  return `${baseSlug}-${suffix}`;
}

function splitNoteGroups(notes) {
  const groups = String(notes || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const profile = {
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    raw: String(notes || "").trim(),
  };

  groups.forEach((group) => {
    const [label, value] = group.split(":");
    const normalizedLabel = String(label || "").trim().toLowerCase();
    const values = String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalizedLabel.startsWith("верх")) {
      profile.topNotes = values;
      return;
    }

    if (normalizedLabel.startsWith("серц")) {
      profile.heartNotes = values;
      return;
    }

    if (normalizedLabel.startsWith("баз")) {
      profile.baseNotes = values;
    }
  });

  return profile;
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || "парфумів";
}

function getDisplayName(product) {
  return String(product.name || "")
    .replace(/^BK\s*parfume\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getNoteSummary(noteProfile) {
  const noteGroups = [
    ...(Array.isArray(noteProfile.topNotes) ? noteProfile.topNotes : []),
    ...(Array.isArray(noteProfile.heartNotes) ? noteProfile.heartNotes : []),
    ...(Array.isArray(noteProfile.baseNotes) ? noteProfile.baseNotes : []),
  ].filter(Boolean);

  return noteGroups.slice(0, 3).join(", ");
}

function buildLongDescription(product, shortDescription, noteProfile) {
  const displayName = getDisplayName(product);
  const categoryLabel = getCategoryLabel(product.category);
  const noteSummary = getNoteSummary(noteProfile);
  const details = [
    `${displayName} у форматі ${product.volume} добре підходить для каталогу ${categoryLabel} BK Parfume і зберігає збалансоване звучання протягом дня.`,
  ];

  if (noteSummary) {
    details.push(
      `У композиції добре відчуваються ноти ${noteSummary}, що допомагає швидко зрозуміти характер аромату перед замовленням.`,
    );
  }

  details.push(
    `Формат ${product.volume} зручний для щоденного використання, а ціна ${product.price} грн дозволяє легко додати цей аромат до особистої колекції або оформити замовлення на подарунок.`,
  );

  return [shortDescription, ...details].filter(Boolean).join(" ");
}

function buildMetaDescription(product, shortDescription, noteProfile) {
  const displayName = getDisplayName(product);
  const categoryLabel = getCategoryLabel(product.category);
  const noteSummary = getNoteSummary(noteProfile);
  const summaryPart = noteSummary ? ` Ноти: ${noteSummary}.` : "";
  const metaDescription = `${displayName} купити в BK Parfume: ${categoryLabel}, ${product.volume}, ${product.price} грн.${summaryPart}`;

  return metaDescription.slice(0, 158).trim();
}

function normalizeProducts(products) {
  const existingFragrances = new Map(
    readJsonIfExists(FRAGRANCES_FILE)
      .filter((entry) => entry && entry.id)
      .map((entry) => [entry.id, entry]),
  );
  const existingContent = new Map(
    readJsonIfExists(CONTENT_FILE)
      .filter((entry) => entry && entry.id)
      .map((entry) => [entry.id, entry]),
  );
  const normalizedProducts = [];
  const fragranceProfiles = [];
  const productContent = [];

  products.forEach((product) => {
    const fragranceId = product.fragranceId || buildRelationId(product, "profile");
    const contentId = product.contentId || buildRelationId(product, "content");
    const existingFragrance = existingFragrances.get(fragranceId) || {};
    const existingProductContent = existingContent.get(contentId) || {};
    const noteProfile = splitNoteGroups(
      product.notes || existingFragrance.rawNotes || "",
    );
    const shortDescription = String(
      product.description ||
        existingProductContent.shortDescription ||
        existingProductContent.longDescription ||
        "",
    ).trim();
    const longDescription = String(
      product.longDescription ||
        existingProductContent.longDescription ||
        buildLongDescription(product, shortDescription, noteProfile),
    ).trim();
    const metaDescription = String(
      product.metaDescription ||
        existingProductContent.metaDescription ||
        buildMetaDescription(product, shortDescription, noteProfile),
    ).trim();

    normalizedProducts.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      volume: product.volume,
      price: product.price,
      image: product.image,
      badge: product.badge || "",
      slug: product.slug,
      seoPage: Boolean(product.seoPage),
      fragranceId,
      contentId,
    });

    fragranceProfiles.push({
      id: fragranceId,
      rawNotes: noteProfile.raw,
      topNotes: noteProfile.topNotes,
      heartNotes: noteProfile.heartNotes,
      baseNotes: noteProfile.baseNotes,
    });

    productContent.push({
      id: contentId,
      shortDescription,
      longDescription,
      metaDescription,
    });
  });

  return {
    normalizedProducts,
    fragranceProfiles,
    productContent,
  };
}

function main() {
  const sourceProducts = readJson(PRODUCTS_FILE);
  const { normalizedProducts, fragranceProfiles, productContent } =
    normalizeProducts(sourceProducts);

  writeJson(PRODUCTS_FILE, normalizedProducts);
  writeJson(FRAGRANCES_FILE, fragranceProfiles);
  writeJson(CONTENT_FILE, productContent);

  console.log(
    `Normalized ${normalizedProducts.length} products into products.json, fragrance-profiles.json, and product-content.json`,
  );
}

main();
