/* Mountain Race Shop™ — simple site logic (menu + products + logo loader) */

const PRODUCTS = [
  {
    title: "Fork service & refresh",
    tag: "workshop",
    desc: "Oil, seals, bushings inspection, bleed, set oil height, baseline settings.",
    badges: ["Forks", "Maintenance"]
  },
  {
    title: "Shock service & refresh",
    tag: "workshop",
    desc: "Oil service, seal head inspection, nitrogen setup guidance, baseline tuning notes.",
    badges: ["Shocks", "Maintenance"]
  },
  {
    title: "Revalve — MX / Enduro",
    tag: "tuning",
    desc: "Traction and compliance focus while keeping hold-up and bottoming control.",
    badges: ["Revalve", "Off-road"]
  },
  {
    title: "Revalve — Road / Track",
    tag: "tuning",
    desc: "Support under braking, stability, and edge grip with controlled compliance.",
    badges: ["Revalve", "Road race"]
  },
  {
    title: "Spring selection & sag setup",
    tag: "tuning",
    desc: "Correct spring rates + sag targets matched to rider weight and terrain.",
    badges: ["Setup", "Springs"]
  },
  {
    title: "Shim-stack review (remote)",
    tag: "data",
    desc: "Send your stacks and goals; receive clear recommendations and next steps.",
    badges: ["Remote", "Report"]
  },
  {
    title: "Force/velocity interpretation",
    tag: "data",
    desc: "Understand dyno curves and what to change for harshness, traction, or bottoming.",
    badges: ["Dyno", "Strategy"]
  },
  {
    title: "Shim Calculator access",
    tag: "digital",
    desc: "Use the online calculator to compare your stack to recommended options.",
    badges: ["Tool", "Online"],
    link: "https://shimcalculator.com"
  },
  {
    title: "Engineering resources",
    tag: "digital",
    desc: "Technical notes and deeper engineering content.",
    badges: ["Reference", "Online"],
    link: "https://suspensionengineering.com.au"
  }
];

// Supplier logos: drop files into /assets/logos/ with these names (png or svg).
// You can change this list any time.
const SUPPLIER_LOGOS = [
  "kyb.svg",
  "showa.svg",
  "wp.svg",
  "ohlins.svg",
  "ktech.svg",
  "racetech.svg",
  "skf.svg",
  "motorex.svg"
];

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function renderProducts(filter = "all", query = "") {
  const grid = $("#productGrid");
  if(!grid) return;

  const q = (query || "").trim().toLowerCase();

  const items = PRODUCTS.filter(p => {
    const matchFilter = (filter === "all") ? true : p.tag === filter;
    const text = (p.title + " " + p.desc + " " + (p.badges || []).join(" ")).toLowerCase();
    const matchQuery = q ? text.includes(q) : true;
    return matchFilter && matchQuery;
  });

  grid.innerHTML = items.map(p => {
    const tagLabel = ({
      workshop: "Workshop",
      tuning: "Tuning",
      data: "Data",
      digital: "Digital"
    }[p.tag]) || p.tag;

    const maybeLink = p.link
      ? `<a class="btn btn--ghost" href="${p.link}" target="_blank" rel="noopener">Open ↗</a>`
      : `<a class="btn btn--ghost" href="#contact">Enquire</a>`;

    return `
      <article class="product" data-tag="${p.tag}">
        <div class="product__top">
          <div class="product__title">${escapeHtml(p.title)}</div>
          <div class="product__tag">${escapeHtml(tagLabel)}</div>
        </div>
        <p class="product__desc">${escapeHtml(p.desc)}</p>
        <div class="product__meta">
          ${(p.badges || []).map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
        </div>
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          ${maybeLink}
          <a class="btn" href="tel:+61420947505">Call</a>
        </div>
      </article>
    `;
  }).join("");

  if(items.length === 0){
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1;">
        <h3>No matches</h3>
        <p class="muted">Try a different filter or search term.</p>
      </div>
    `;
  }
}

function setupFilters(){
  const chips = $all(".chip");
  const searchInput = $("#searchInput");

  let currentFilter = "all";
  let currentQuery = "";

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentFilter = chip.dataset.filter || "all";
      renderProducts(currentFilter, currentQuery);
    });
  });

  if(searchInput){
    searchInput.addEventListener("input", (e) => {
      currentQuery = e.target.value || "";
      renderProducts(currentFilter, currentQuery);
    });
  }

  renderProducts(currentFilter, currentQuery);
}

async function loadSupplierLogos(){
  const strip = $("#logoStrip");
  if(!strip) return;

  // Try loading local logo images. If they exist, replace placeholders.
  const base = "assets/logos/";
  const imgs = [];

  for(const name of SUPPLIER_LOGOS){
    const url = base + name;
    const ok = await imageExists(url);
    if(ok){
      imgs.push(url);
    }
  }

  if(imgs.length){
    strip.innerHTML = imgs.map(src => `<img src="${src}" alt="Supplier logo" loading="lazy" />`).join("");
  }
}

function imageExists(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url + "?v=" + Date.now(); // cache-bust during testing
  });
}

function setupMobileNav(){
  const toggle = $("#navToggle");
  const mobileNav = $("#mobileNav");

  if(!toggle || !mobileNav) return;

  toggle.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    mobileNav.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  // Close menu when clicking a link
  $all(".mobileNav__link").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      mobileNav.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
}

function setupContactForm(){
  const form = $("#contactForm");
  const note = $("#formNote");
  if(!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = ($("#name")?.value || "").trim();
    const phone = ($("#phone")?.value || "").trim();
    const message = ($("#message")?.value || "").trim();

    if(note){
      note.textContent = `Saved locally (demo): ${name ? name + " • " : ""}${phone ? phone + " • " : ""}${message ? "Message added." : "Add a message to get the most value."}`;
    }

    // Later: wire to Formspree / email / backend.
    // For now, just reset fields:
    form.reset();
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  const y = $("#year");
  if(y) y.textContent = String(new Date().getFullYear());

  setupMobileNav();
  setupFilters();
  loadSupplierLogos();
  setupContactForm();
});
