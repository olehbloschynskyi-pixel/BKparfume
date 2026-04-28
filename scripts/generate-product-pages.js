const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "data", "products.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "products");

const SITE_URL = "https://bkparfume.site";
const CATEGORY_META = {
  women: {
    label: "жіночі парфуми",
    titleLabel: "жіночі парфуми",
    catalogUrl: "index.html?category=women#catalog",
    categoryUrl: "zhinochi-parfumy.html",
    relatedUrl: "uniseks-parfumy.html",
    relatedLabel: "унісекс ароматами",
    audience: "для жінок, які шукають аромат на кожен день, побачення або особливу подію",
    usage: "Для денного використання краще працюють більш свіжі та квіткові композиції, а для вечора варто дивитися на солодші й глибші акорди.",
  },
  men: {
    label: "чоловічі парфуми",
    titleLabel: "чоловічі парфуми",
    catalogUrl: "index.html?category=men#catalog",
    categoryUrl: "cholovichi-parfumy.html",
    relatedUrl: "uniseks-parfumy.html",
    relatedLabel: "унісекс ароматами",
    audience: "для чоловіків, яким потрібен аромат на роботу, щодень або вечірній вихід",
    usage: "На щодень краще підходять свіжі, цитрусові та деревні композиції, а для вечора можна обирати щільніші пряні та амброві варіанти.",
  },
  unisex: {
    label: "унісекс аромати",
    titleLabel: "унісекс парфуми",
    catalogUrl: "index.html?category=unisex#catalog",
    categoryUrl: "uniseks-parfumy.html",
    relatedUrl: "zhinochi-parfumy.html",
    relatedLabel: "жіночими ароматами",
    audience: "для тих, хто шукає універсальне звучання без жорсткої прив'язки до класичної жіночої або чоловічої групи",
    usage: "Унісекс-композиції зручно обирати, якщо вам подобаються чисті деревні, мускусні, нішеві або фруктово-амброві профілі.",
  },
};

const FAQ_ITEMS = [
  (product, categoryMeta) => ({
    question: `Кому підійде ${product.name.replace(/^BK parfume\s+/i, "")}?`,
    answer: `${product.name} від ${product.brand} підійде ${categoryMeta.audience}. ${categoryMeta.usage}`,
  }),
  (product) => ({
    question: `Який об'єм і ціна у ${product.name.replace(/^BK parfume\s+/i, "")}?`,
    answer: `На BK Parfume цей аромат доступний у форматі ${product.volume} за ${product.price} грн. При замовленні кількох позицій діють вигідніші ціни за кількість.`,
  }),
  (product) => ({
    question: `Чи можна замовити ${product.name.replace(/^BK parfume\s+/i, "")} з доставкою по Україні?`,
    answer: `Так, ${product.name} можна замовити з доставкою по Україні Новою поштою. Детальні умови дивіться на сторінці доставки та оплати.`,
  }),
];

function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitNotes(notes) {
  return String(notes || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanName(name) {
  return String(name || "").replace(/^BK parfume\s+/i, "").trim();
}

function buildMetaTitle(product, categoryMeta) {
  return `${cleanName(product.name)} купити в Україні, ${categoryMeta.titleLabel} | BK Parfume`;
}

function buildMetaDescription(product, categoryMeta) {
  return `${cleanName(product.name)} від ${product.brand} у BK Parfume: ${categoryMeta.label}, об'єм ${product.volume}, ціна ${product.price} грн та доставка по Україні.`;
}

function buildFaq(product, categoryMeta) {
  return FAQ_ITEMS.map((factory) => factory(product, categoryMeta));
}

function buildSchema(product, categoryMeta, canonicalUrl, faqItems) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: cleanName(product.name),
        brand: {
          "@type": "Brand",
          name: product.brand,
        },
        image: `${SITE_URL}/${product.image}`,
        description: product.description,
        category: categoryMeta.label,
        sku: String(product.id),
        offers: {
          "@type": "Offer",
          price: String(product.price),
          priceCurrency: "UAH",
          availability: "https://schema.org/InStock",
          url: canonicalUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Головна",
            item: `${SITE_URL}/index.html`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryMeta.titleLabel,
            item: `${SITE_URL}/${categoryMeta.categoryUrl}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: cleanName(product.name),
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}

function buildRelatedProducts(product, products) {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
    .slice(0, 3);
}

function renderProductPage(product, products) {
  const categoryMeta = CATEGORY_META[product.category] || CATEGORY_META.unisex;
  const productName = cleanName(product.name);
  const title = buildMetaTitle(product, categoryMeta);
  const description = buildMetaDescription(product, categoryMeta);
  const canonicalPath = `products/${product.slug}.html`;
  const canonicalUrl = `${SITE_URL}/${canonicalPath}`;
  const notes = splitNotes(product.notes);
  const relatedProducts = buildRelatedProducts(product, products);
  const faqItems = buildFaq(product, categoryMeta);
  const schema = buildSchema(product, categoryMeta, canonicalUrl, faqItems);

  const notesMarkup = notes
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("\n");

  const relatedMarkup = relatedProducts
    .map(
      (item) => `
            <li>
              <a href="${escapeHtml(item.slug)}.html">${escapeHtml(cleanName(item.name))}</a>
            </li>`,
    )
    .join("");

  const faqMarkup = faqItems
    .map(
      (item) => `
          <details class="article-featured__faq-item">
            <summary>${escapeHtml(item.question)}</summary>
            <p>${escapeHtml(item.answer)}</p>
          </details>`,
    )
    .join("");

  return `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:locale" content="uk_UA" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="BK Parfume" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${SITE_URL}/${escapeHtml(product.image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE_URL}/${escapeHtml(product.image)}" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="32x32" href="/images/products/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/products/favicon-32.png" />
    <link rel="stylesheet" href="../css/style.min.css?v=20260424" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>
  <body>
    <header class="header" id="header">
      <div class="header__inner">
        <a href="../index.html" class="logo">
          <span class="logo__bk">BK</span><span class="logo__store">PARFUME</span><span class="logo__sub">Наливна парфумерія</span>
        </a>
        <nav class="nav" id="nav">
          <ul class="nav__list">
            <li class="nav__item"><a href="../index.html#catalog" class="nav__link">Всі аромати</a></li>
            <li class="nav__item"><a href="../articles.html" class="nav__link">Статті</a></li>
            <li class="nav__item"><a href="../about.html" class="nav__link">Про нас</a></li>
            <li class="nav__item"><a href="../contacts.html" class="nav__link">Контакти</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <section class="articles-hero">
      <p class="articles-hero__label">Картка аромату BK Parfume</p>
      <h1 class="articles-hero__title">${escapeHtml(productName)} купити в Україні</h1>
      <p class="articles-hero__desc">${escapeHtml(description)}</p>
    </section>

    <section class="articles-section">
      <div class="articles-section__inner">
        <article class="article-featured">
          <div class="article-featured__media">
            <img src="../${escapeHtml(product.image)}" alt="${escapeHtml(productName)}" />
          </div>
          <div class="article-featured__content">
            <p class="article-featured__excerpt"><strong>Бренд:</strong> ${escapeHtml(product.brand)}</p>
            <p class="article-featured__excerpt"><strong>Категорія:</strong> ${escapeHtml(categoryMeta.label)}</p>
            <p class="article-featured__excerpt"><strong>Об'єм:</strong> ${escapeHtml(product.volume)}</p>
            <p class="article-featured__excerpt"><strong>Ціна:</strong> ${escapeHtml(String(product.price))} грн</p>
            <p class="article-featured__excerpt">${escapeHtml(product.description)}</p>
            <p class="article-featured__excerpt">${escapeHtml(productName)} від ${escapeHtml(product.brand)} добре працює ${escapeHtml(categoryMeta.audience)}. Завдяки формату ${escapeHtml(product.volume)} цей аромат зручно брати як основний варіант на сезон або додавати до особистої колекції для окремих ситуацій.</p>
            <p class="article-featured__excerpt">${escapeHtml(categoryMeta.usage)} Якщо ви підбираєте схожі композиції, перегляньте також сторінку з ${escapeHtml(categoryMeta.relatedLabel)} та повний каталог BK Parfume.</p>
            <h2 class="article-featured__title">Ноти аромату</h2>
            <ul class="article-featured__excerpt">
${notesMarkup}
            </ul>
            <h2 class="article-featured__title">Як замовити</h2>
            <p class="article-featured__excerpt">Ви можете перейти у каталог з уже відкритим релевантним фільтром, додати аромат у кошик та оформити замовлення з доставкою по Україні. Для оптових або комбінованих замовлень також діють вигідніші ціни за кількість.</p>
            <p class="article-featured__excerpt">
              <a class="btn btn--primary" href="../${escapeHtml(categoryMeta.catalogUrl)}">Перейти в каталог</a>
            </p>
          </div>
        </article>

        <article class="article-featured">
          <div class="article-featured__content">
            <h2 class="article-featured__title">FAQ</h2>
${faqMarkup}
          </div>
        </article>

        <article class="article-featured">
          <div class="article-featured__content">
            <h2 class="article-featured__title">Схожі аромати</h2>
            <ul class="article-featured__excerpt">${relatedMarkup}</ul>
            <p class="article-featured__excerpt">Також подивіться <a href="../${escapeHtml(categoryMeta.categoryUrl)}">сторінку категорії</a>, <a href="../${escapeHtml(categoryMeta.relatedUrl)}">суміжну підбірку</a> та <a href="../dostavka-i-oplata.html">умови доставки й оплати</a>.</p>
          </div>
        </article>
      </div>
    </section>
  </body>
</html>
`;
}

function main() {
  const products = readProducts();
  const pageProducts = products.filter((product) => product.seoPage);

  if (!pageProducts.length) {
    throw new Error("No products marked with seoPage=true in data/products.json");
  }

  ensureDir(OUTPUT_DIR);

  for (const product of pageProducts) {
    const outputFile = path.join(OUTPUT_DIR, `${product.slug}.html`);
    fs.writeFileSync(outputFile, renderProductPage(product, products));
  }

  console.log(`Generated ${pageProducts.length} product pages in ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
}

main();