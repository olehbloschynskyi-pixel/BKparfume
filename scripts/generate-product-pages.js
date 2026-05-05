const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "data", "products.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "products");

const SITE_URL = "https://bkparfume.site";
const STORE_BRAND = "BKparfume";
const STORE_NAME = "BK Parfume";
const STORE_CURRENCY = "UAH";
const OFFER_AVAILABILITY = "https://schema.org/InStock";
const ITEM_CONDITION = "https://schema.org/NewCondition";
const PRICE_VALID_UNTIL = "2026-12-31";
const CATEGORY_META = {
  women: {
    label: "жіночі парфуми",
    titleLabel: "жіночі парфуми",
    catalogUrl: "index.html?category=women#catalog",
    categoryUrl: "zhinochi-parfumy.html",
    relatedUrl: "uniseks-parfumy.html",
    relatedLabel: "унісекс ароматами",
    audience:
      "для жінок, які шукають аромат на кожен день, побачення або особливу подію",
    usage:
      "Для денного використання краще працюють більш свіжі та квіткові композиції, а для вечора варто дивитися на солодші й глибші акорди.",
  },
  men: {
    label: "чоловічі парфуми",
    titleLabel: "чоловічі парфуми",
    catalogUrl: "index.html?category=men#catalog",
    categoryUrl: "cholovichi-parfumy.html",
    relatedUrl: "uniseks-parfumy.html",
    relatedLabel: "унісекс ароматами",
    audience:
      "для чоловіків, яким потрібен аромат на роботу, щодень або вечірній вихід",
    usage:
      "На щодень краще підходять свіжі, цитрусові та деревні композиції, а для вечора можна обирати щільніші пряні та амброві варіанти.",
  },
  unisex: {
    label: "унісекс аромати",
    titleLabel: "унісекс парфуми",
    catalogUrl: "index.html?category=unisex#catalog",
    categoryUrl: "uniseks-parfumy.html",
    relatedUrl: "zhinochi-parfumy.html",
    relatedLabel: "жіночими ароматами",
    audience:
      "для тих, хто шукає універсальне звучання без жорсткої прив'язки до класичної жіночої або чоловічої групи",
    usage:
      "Унісекс-композиції зручно обирати, якщо вам подобаються чисті деревні, мускусні, нішеві або фруктово-амброві профілі.",
  },
};

const FAQ_ITEMS = [
  (product, categoryMeta) => ({
    question: `Кому підійде ${shortName(product.name)}?`,
    answer: `${displayName(product.name)} від ${product.brand} підійде ${categoryMeta.audience}. ${categoryMeta.usage}`,
  }),
  (product) => ({
    question: `Який об'єм і ціна у ${shortName(product.name)}?`,
    answer: `На BK Parfume цей аромат доступний у форматі ${product.volume} за ${product.price} грн. При замовленні кількох позицій діють вигідніші ціни за кількість.`,
  }),
  (product) => ({
    question: `Чи можна замовити ${shortName(product.name)} з доставкою по Україні?`,
    answer: `Так, ${displayName(product.name)} можна замовити з доставкою по Україні Новою поштою. Детальні умови дивіться на сторінці доставки та оплати.`,
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

function normalizeProductName(name) {
  const normalized = String(name || "")
    .replace(/^BK\s*parfume\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? `BKparfume ${normalized}` : "BKparfume";
}

function shortName(name) {
  return normalizeProductName(name)
    .replace(/^BKparfume\s+/i, "")
    .trim();
}

function displayName(name) {
  return normalizeProductName(name);
}

function buildMetaTitle(product, categoryMeta) {
  return `${displayName(product.name)} купити в Україні, ${categoryMeta.titleLabel} | BK Parfume`;
}

function buildMetaDescription(product, categoryMeta) {
  return `${displayName(product.name)} у BK Parfume: ${categoryMeta.label}, об'єм ${product.volume}, ціна ${product.price} грн та доставка по Україні.`;
}

function buildFaq(product, categoryMeta) {
  return FAQ_ITEMS.map((factory) => factory(product, categoryMeta));
}

function buildSchema(product, categoryMeta, canonicalUrl, faqItems) {
  const productImageUrl = `${SITE_URL}/${product.image}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        name: displayName(product.name),
        url: canonicalUrl,
        brand: {
          "@type": "Brand",
          name: STORE_NAME,
        },
        image: [productImageUrl],
        description: product.description,
        category: categoryMeta.label,
        sku: String(product.id),
        mpn: product.slug,
        offers: {
          "@type": "Offer",
          url: canonicalUrl,
          price: String(product.price),
          priceCurrency: STORE_CURRENCY,
          priceValidUntil: PRICE_VALID_UNTIL,
          availability: OFFER_AVAILABILITY,
          itemCondition: ITEM_CONDITION,
          seller: {
            "@type": "Organization",
            name: STORE_NAME,
            url: SITE_URL,
          },
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
            name: displayName(product.name),
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
    .filter(
      (candidate) =>
        candidate.category === product.category && candidate.id !== product.id,
    )
    .slice(0, 3);
}

function renderProductPage(product, products) {
  const categoryMeta = CATEGORY_META[product.category] || CATEGORY_META.unisex;
  const productName = displayName(product.name);
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
              <a href="${escapeHtml(item.slug)}.html">${escapeHtml(displayName(item.name))}</a>
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
    <link rel="stylesheet" href="../css/style.min.css?v=20260501-3" />
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
            <p class="article-featured__excerpt"><strong>Бренд:</strong> ${STORE_BRAND}</p>
            <p class="article-featured__excerpt"><strong>Категорія:</strong> ${escapeHtml(categoryMeta.label)}</p>
            <p class="article-featured__excerpt"><strong>Об'єм:</strong> ${escapeHtml(product.volume)}</p>
            <p class="article-featured__excerpt"><strong>Ціна:</strong> ${escapeHtml(String(product.price))} грн</p>
            <p class="article-featured__excerpt">${escapeHtml(product.description)}</p>
            <p class="article-featured__excerpt">${escapeHtml(productName)} добре працює ${escapeHtml(categoryMeta.audience)}. Завдяки формату ${escapeHtml(product.volume)} цей аромат зручно брати як основний варіант на сезон або додавати до особистої колекції для окремих ситуацій.</p>
            <p class="article-featured__excerpt">${escapeHtml(categoryMeta.usage)} Якщо ви підбираєте схожі композиції, перегляньте також сторінку з ${escapeHtml(categoryMeta.relatedLabel)} та повний каталог BK Parfume.</p>
            <div class="article-featured__catalog-actions">
              <a class="btn btn--primary" href="../${escapeHtml(categoryMeta.catalogUrl)}">Перейти в каталог</a>
              <button
                type="button"
                class="article-featured__quick-add"
                id="productAddToCart"
                aria-label="Додати ${escapeHtml(productName)} до кошика"
                title="Додати до кошика"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="19" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </button>
            </div>
            <h2 class="article-featured__title">Ноти аромату</h2>
            <ul class="article-featured__excerpt">
${notesMarkup}
            </ul>
            <h2 class="article-featured__title">Як замовити</h2>
            <p class="article-featured__excerpt">Ви можете перейти у каталог з уже відкритим релевантним фільтром, додати аромат у кошик та оформити замовлення з доставкою по Україні. Для оптових або комбінованих замовлень також діють вигідніші ціни за кількість.</p>
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
    <script>
      (() => {
        const button = document.getElementById("productAddToCart");
        const productId = ${product.id};
        const cartRedirectUrl = "../${escapeHtml(categoryMeta.catalogUrl)}";

        function readCart() {
          try {
            const parsed = JSON.parse(localStorage.getItem("bk_cart") || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }

        function writeCart(nextCart) {
          localStorage.setItem("bk_cart", JSON.stringify(nextCart));
        }

        function markAdded() {
          if (!button) return;
          button.classList.add("is-added");
          button.setAttribute("aria-label", "Товар додано до кошика");
          button.setAttribute("title", "Товар додано до кошика");
          window.setTimeout(() => {
            button.classList.remove("is-added");
            button.setAttribute("aria-label", "Додати товар до кошика");
            button.setAttribute("title", "Додати до кошика");
          }, 1400);
        }

        button?.addEventListener("click", () => {
          const cart = readCart();
          const existing = cart.find((item) => item.id === productId);

          if (existing) {
            existing.qty += 1;
          } else {
            cart.push({ id: productId, qty: 1 });
          }

          writeCart(cart);
          markAdded();

          try {
            sessionStorage.setItem("bk_open_cart", "1");
          } catch {
            // Ignore sessionStorage access issues and continue with redirect.
          }

          window.setTimeout(() => {
            window.location.href = cartRedirectUrl;
          }, 180);
        });
      })();
    </script>
  </body>
</html>
`;
}

function main() {
  const products = readProducts();
  const pageProducts = products.filter((product) => product.seoPage);

  if (!pageProducts.length) {
    throw new Error(
      "No products marked with seoPage=true in data/products.json",
    );
  }

  ensureDir(OUTPUT_DIR);

  for (const product of pageProducts) {
    const outputFile = path.join(OUTPUT_DIR, `${product.slug}.html`);
    fs.writeFileSync(outputFile, renderProductPage(product, products));
  }

  console.log(
    `Generated ${pageProducts.length} product pages in ${path.relative(ROOT_DIR, OUTPUT_DIR)}`,
  );
}

main();
