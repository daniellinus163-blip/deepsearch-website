/**
 * Phase 4 — Fiverr observable page extractor.
 * Reads only publicly visible DOM / meta / JSON-LD.
 */
(function (global) {
  function textOf(el) {
    return el?.textContent?.replace(/\s+/g, " ").trim() || null;
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const value = textOf(el);
      if (value) return value;
    }
    return null;
  }

  function uniqueStrings(values) {
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  }

  function parsePrice(priceText) {
    if (!priceText) {
      return { priceText: null, priceAmount: null, currency: null };
    }
    const cleaned = priceText.replace(/\s+/g, " ").trim();
    const match = cleaned.match(
      /([€£$])\s?([\d,.]+)|([\d,.]+)\s?(USD|EUR|GBP)/i
    );
    if (!match) {
      return { priceText: cleaned, priceAmount: null, currency: null };
    }
    const symbol = match[1];
    const amountRaw = match[2] || match[3];
    const code = match[4];
    const amount = Number(String(amountRaw).replace(/,/g, ""));
    const currency =
      code?.toUpperCase() ||
      ({ $: "USD", "€": "EUR", "£": "GBP" }[symbol] ?? null);
    return {
      priceText: cleaned,
      priceAmount: Number.isFinite(amount) ? amount : null,
      currency,
    };
  }

  function detectPageType(url) {
    if (
      /\/categories\//i.test(url) ||
      /\/search\//i.test(url) ||
      /[?&]query=/i.test(url)
    ) {
      return "search";
    }
    if (/\/users?\//i.test(url) || /\/sellers?\//i.test(url)) {
      return "seller";
    }
    if (
      /fiverr\.com\/[^/]+\/[^/?#]+/i.test(url) &&
      !/fiverr\.com\/categories\//i.test(url)
    ) {
      return "gig";
    }
    return "other";
  }

  function readJsonLd() {
    const scripts = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ];
    const items = [];
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || "null");
        if (Array.isArray(parsed)) items.push(...parsed);
        else if (parsed) items.push(parsed);
      } catch {
        // ignore
      }
    }
    return items;
  }

  function extractTags() {
    const tagEls = [
      ...document.querySelectorAll(
        'a[href*="/tags/"], a[href*="tag="], [class*="tag"] a, [data-testid*="tag"]'
      ),
    ];
    const fromDom = tagEls.map((el) => textOf(el)).filter(Boolean);
    const metaKeywords = document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute("content");
    const fromMeta = metaKeywords
      ? metaKeywords.split(",").map((t) => t.trim())
      : [];
    return uniqueStrings([...fromDom, ...fromMeta]).slice(0, 30);
  }

  function extractPackages() {
    const packages = [];
    const packageRoots = document.querySelectorAll(
      '[class*="package"], [data-testid*="package"], .package-selector li, .packages-table tr'
    );
    packageRoots.forEach((root, index) => {
      if (index > 12) return;
      const title =
        textOf(root.querySelector("h3, h4, [class*='title'], th, strong")) ||
        null;
      const price = textOf(
        root.querySelector('[class*="price"], [data-testid*="price"]')
      );
      const delivery = textOf(
        root.querySelector('[class*="delivery"], [class*="days"]')
      );
      const body = textOf(root);
      if (!title && !price && !body) return;
      packages.push({
        title,
        priceText: price,
        deliveryTime: delivery,
        summary: body ? body.slice(0, 280) : null,
      });
    });
    return packages.slice(0, 6);
  }

  function extractFaq() {
    const faq = [];
    const items = document.querySelectorAll(
      '[class*="faq"] details, [class*="FAQ"] details, [data-testid*="faq"] li, .accordion-item'
    );
    items.forEach((item, index) => {
      if (index > 20) return;
      const question = textOf(
        item.querySelector("summary, h3, h4, [class*='question'], button")
      );
      const answer = textOf(
        item.querySelector("[class*='answer'], p, .content")
      );
      if (question) faq.push({ question, answer });
    });
    return faq;
  }

  function extractFromJsonLd(items) {
    const product =
      items.find((i) => i["@type"] === "Product" || i["@type"] === "Service") ||
      items.find((i) => i.name);
    if (!product) return {};
    const offer = Array.isArray(product.offers)
      ? product.offers[0]
      : product.offers;
    const rating = product.aggregateRating;
    return {
      title: product.name || null,
      description: product.description || null,
      priceAmount: offer?.price ? Number(offer.price) : null,
      currency: offer?.priceCurrency || null,
      priceText:
        offer?.price != null
          ? `${offer.priceCurrency || ""} ${offer.price}`.trim()
          : null,
      rating: rating?.ratingValue ? Number(rating.ratingValue) : null,
      reviewsCount: rating?.reviewCount ? Number(rating.reviewCount) : null,
      sellerName: product.brand?.name || product.provider?.name || null,
    };
  }

  function extractFiverrPage() {
    const sourceUrl = window.location.href;
    const pageType = detectPageType(sourceUrl);
    const jsonLd = readJsonLd();
    const fromLd = extractFromJsonLd(jsonLd);

    const title =
      fromLd.title ||
      firstText([
        "h1",
        '[data-testid="gig-title"]',
        '[class*="gig-title"]',
      ]) ||
      document.title.replace(/\s*\|\s*Fiverr.*/i, "").trim();

    const category =
      firstText([
        'nav[aria-label="breadcrumbs"] a:last-of-type',
        '[data-testid="breadcrumbs"] a:last-of-type',
        ".breadcrumbs a:last-of-type",
      ]) || null;

    const description =
      fromLd.description ||
      firstText([
        '[data-testid="gig-description"]',
        '[class*="description-content"]',
        "#description",
      ]) ||
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ||
      null;

    const priceCandidate =
      fromLd.priceText ||
      firstText([
        '[data-testid*="price"]',
        '[class*="price-wrapper"]',
        '[class*="package-price"]',
      ]);
    const price = parsePrice(priceCandidate);
    if (fromLd.priceAmount != null && price.priceAmount == null) {
      price.priceAmount = fromLd.priceAmount;
      price.currency = fromLd.currency || price.currency;
    }

    const sellerName =
      fromLd.sellerName ||
      firstText([
        '[data-testid*="seller-name"]',
        '[class*="seller-name"]',
        ".per-seller a",
      ]);

    const sellerLevel = firstText([
      '[class*="seller-level"]',
      '[data-testid*="seller-level"]',
    ]);

    const deliveryTime = firstText([
      '[data-testid*="delivery"]',
      '[class*="delivery-time"]',
      '[class*="delivery"]',
    ]);

    const rating =
      fromLd.rating ??
      (() => {
        const ratingText = firstText([
          '[class*="rating-score"]',
          '[data-testid*="rating"]',
          'meta[itemprop="ratingValue"]',
        ]);
        return ratingText
          ? Number(String(ratingText).replace(/[^\d.]/g, ""))
          : null;
      })();

    const reviewsCount =
      fromLd.reviewsCount ??
      (() => {
        const reviewsText = firstText([
          '[class*="reviews-count"]',
          '[data-testid*="reviews"]',
          'meta[itemprop="reviewCount"]',
        ]);
        return reviewsText
          ? Number(String(reviewsText).replace(/[^\d]/g, "")) || null
          : null;
      })();

    return {
      marketplace: "Fiverr",
      pageType,
      sourceUrl,
      title: title || null,
      category,
      tags: extractTags(),
      description: description ? String(description).slice(0, 8000) : null,
      priceText: price.priceText,
      priceAmount: price.priceAmount,
      currency: price.currency || fromLd.currency || null,
      reviewsCount: Number.isFinite(reviewsCount) ? reviewsCount : null,
      rating: Number.isFinite(rating) ? rating : null,
      sellerName,
      sellerLevel,
      deliveryTime,
      packages: extractPackages(),
      faq: extractFaq(),
      rawObservable: {
        documentTitle: document.title,
        jsonLdCount: jsonLd.length,
        extractedVia: "dom+meta+jsonld",
        note: "Observable public page data only — not private ranking or search APIs.",
      },
    };
  }

  global.DeepSearchExtractors = global.DeepSearchExtractors || {};
  global.DeepSearchExtractors.fiverr = extractFiverrPage;
})(typeof window !== "undefined" ? window : self);
