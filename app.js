const state = {
  rawRows: [],
  products: [],
  filtered: [],
  visibleCount: 24,
};

const REQUIRED_COLUMNS = ["product_group_id", "category", "subcategory", "brand", "name", "price", "currency", "product_url", "image_url", "status"];
const OPTIONAL_COLUMNS = ["variant_id", "color", "size", "qc_url", "quality"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const els = {
  grid: document.getElementById("productGrid"),
  status: document.getElementById("statusBox"),
  search: document.getElementById("searchInput"),
  category: document.getElementById("categoryFilter"),
  brand: document.getElementById("brandFilter"),
  price: document.getElementById("priceFilter"),
  sort: document.getElementById("sortSelect"),
  loadMore: document.getElementById("loadMoreBtn"),
  statProducts: document.getElementById("stat-products"),
  backToTop: document.getElementById("backToTop"),
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row, index) => {
    const obj = { _rowIndex: index + 2 };
    headers.forEach((header, i) => {
      obj[header] = row[i] || "";
    });
    return obj;
  });
}

function cleanUrl(url) {
  return String(url || "").trim();
}

function isValidUrl(url) {
  return /^https?:\/\//i.test(cleanUrl(url));
}

function parsePrice(value) {
  const match = String(value || "").replace(",", ".").match(/[0-9]+(\.[0-9]+)?/);
  return match ? Number(match[0]) : null;
}

function addInviteCode(url) {
  const invite = window.INVITE_CODE || "";
  if (!invite || !url.includes("lovegobuy.com") || url.includes("invite_code=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}invite_code=${encodeURIComponent(invite)}`;
}

function groupProducts(rows) {
  const validRows = rows.filter(row => {
    const status = String(row.status || "active").toLowerCase();
    return status !== "hidden" && status !== "draft" && row.name && isValidUrl(row.product_url) && isValidUrl(row.image_url);
  });

  const map = new Map();

  validRows.forEach((row, index) => {
    const groupId = row.product_group_id || `${row.name}-${row.brand}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const variant = {
      variantId: row.variant_id || String(index + 1),
      color: row.color || "Default",
      size: row.size || "",
      price: parsePrice(row.price),
      priceText: row.price ? `${row.currency || "USD"} ${row.price}` : "Price unavailable",
      productUrl: addInviteCode(cleanUrl(row.product_url)),
      imageUrl: cleanUrl(row.image_url),
      qcUrl: cleanUrl(row.qc_url),
      quality: row.quality || "",
    };

    if (!map.has(groupId)) {
      map.set(groupId, {
        id: groupId,
        category: row.category || "Other",
        subcategory: row.subcategory || "",
        brand: row.brand || "Unknown",
        name: row.name,
        currency: row.currency || "USD",
        createdOrder: index,
        variants: [],
      });
    }

    const product = map.get(groupId);
    product.variants.push(variant);
    product.minPrice = Math.min(...product.variants.map(v => v.price).filter(v => Number.isFinite(v)));
    product.defaultVariant = product.variants[0];
  });

  return Array.from(map.values());
}

function setStatus(message, type = "info") {
  els.status.textContent = message;
  els.status.dataset.type = type;
  els.status.hidden = !message;
}

function populateFilters() {
  const categories = ["All categories", ...new Set(state.products.map(p => p.category).filter(Boolean).sort())];
  const brands = ["All brands", ...new Set(state.products.map(p => p.brand).filter(Boolean).sort())];
  els.category.innerHTML = categories.map((c, i) => `<option value="${i === 0 ? "all" : escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  els.brand.innerHTML = brands.map((b, i) => `<option value="${i === 0 ? "all" : escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

function applyFilters() {
  const q = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const brand = els.brand.value;
  const priceFilter = els.price.value;
  const sort = els.sort.value;

  let list = state.products.filter(product => {
    const text = [product.name, product.brand, product.category, product.subcategory, product.variants.map(v => v.color).join(" ")].join(" ").toLowerCase();
    const matchesSearch = !q || text.includes(q);
    const matchesCategory = category === "all" || product.category === category;
    const matchesBrand = brand === "all" || product.brand === brand;
    const price = product.minPrice;
    const matchesPrice = priceFilter === "all" ||
      (priceFilter === "under20" && price !== undefined && price < 20) ||
      (priceFilter === "20to50" && price !== undefined && price >= 20 && price <= 50) ||
      (priceFilter === "over50" && price !== undefined && price > 50);
    return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
  });

  list.sort((a, b) => {
    if (sort === "priceAsc") return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    if (sort === "priceDesc") return (b.minPrice ?? -Infinity) - (a.minPrice ?? -Infinity);
    if (sort === "nameAsc") return a.name.localeCompare(b.name);
    return a.createdOrder - b.createdOrder;
  });

  state.filtered = list;
  state.visibleCount = 24;
  renderProducts();
}

function renderProducts() {
  const visible = state.filtered.slice(0, state.visibleCount);
  els.grid.innerHTML = visible.map(renderCard).join("");
  els.loadMore.hidden = state.filtered.length <= state.visibleCount;

  if (!state.filtered.length) {
    setStatus("No products match your filters.", "empty");
  } else {
    setStatus("");
  }

  document.querySelectorAll("[data-color-select]").forEach(select => {
    select.addEventListener("change", event => {
      const card = event.target.closest(".product-card");
      const productId = card.dataset.productId;
      const product = state.products.find(p => p.id === productId);
      const variant = product.variants.find(v => v.variantId === event.target.value);
      if (!variant) return;
      card.querySelector(".product-image").src = variant.imageUrl;
      card.querySelector(".price").textContent = variant.priceText;
      card.querySelector(".buy-link").href = variant.productUrl;
      const qcLink = card.querySelector(".qc-link");
      if (qcLink) {
        qcLink.href = variant.qcUrl || "#";
        qcLink.toggleAttribute("hidden", !variant.qcUrl);
      }
    });
  });
}

function renderCard(product) {
  const v = product.defaultVariant;
  const hasVariants = product.variants.length > 1;
  const colors = product.variants.map(variant => `<option value="${escapeHtml(variant.variantId)}">${escapeHtml(variant.color || "Default")}</option>`).join("");
  const qcButton = `<a class="card-btn qc-link" ${v.qcUrl ? `href="${escapeHtml(v.qcUrl)}" target="_blank" rel="noopener"` : "hidden"}>QC</a>`;

  return `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}">
      <div class="image-wrap">
        <img class="product-image" src="${escapeHtml(v.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.closest('.product-card').classList.add('image-error')" />
        <span class="badge">${escapeHtml(product.category)}</span>
      </div>
      <div class="card-body">
        <div class="meta-row">
          <span>${escapeHtml(product.brand)}</span>
          <span>${escapeHtml(product.subcategory || "Find")}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price">${escapeHtml(v.priceText)}</div>
        ${hasVariants ? `
          <label class="variant-select">
            <span>Color</span>
            <select data-color-select>${colors}</select>
          </label>` : `<div class="single-color">${escapeHtml(v.color || "Default")}</div>`}
        <div class="card-actions">
          <a class="card-btn buy-link primary-card" href="${escapeHtml(v.productUrl)}" target="_blank" rel="noopener">Buy</a>
          ${qcButton}
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProducts() {
  try {
    const url = window.SHEET_CSV_URL;
    if (!url || url === "PASTE_YOUR_PUBLISHED_CSV_URL_HERE") {
      setStatus("Paste your published Google Sheet CSV URL in config.js to load products.", "error");
      return;
    }

    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}cacheBust=${Date.now()}`);
    if (!response.ok) throw new Error(`Could not fetch spreadsheet: ${response.status}`);

    const csv = await response.text();
    const rows = parseCSV(csv);
    const objects = rowsToObjects(rows);
    const headers = rows[0]?.map(normalizeHeader) || [];
    const missing = REQUIRED_COLUMNS.filter(column => !headers.includes(column));
    if (missing.length) {
      setStatus(`Missing required columns: ${missing.join(", ")}.`, "error");
      return;
    }

    state.rawRows = objects;
    state.products = groupProducts(objects);
    state.filtered = [...state.products];
    els.statProducts.textContent = String(state.products.length);
    populateFilters();
    applyFilters();
    if (!state.products.length) setStatus("No active products found. Check status, image_url and product_url columns.", "empty");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not load products.", "error");
  }
}

[els.search, els.category, els.brand, els.price, els.sort].forEach(el => el.addEventListener("input", applyFilters));
els.loadMore.addEventListener("click", () => {
  state.visibleCount += 24;
  renderProducts();
});
els.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
window.addEventListener("scroll", () => els.backToTop.classList.toggle("visible", window.scrollY > 600));

loadProducts();
