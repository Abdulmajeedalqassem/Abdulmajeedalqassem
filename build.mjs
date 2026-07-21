// Static site generator for a bilingual (Arabic/English) article website.
// Usage:
//   node build.mjs           -> build once into dist/
//   node build.mjs --serve   -> build, then serve dist/ on http://localhost:3000
//   node build.mjs --watch --serve -> rebuild on changes + serve (great for writing)

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const ARTICLES_DIR = path.join(ROOT, "articles");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");
const SRC_DIR = path.join(ROOT, "src");

const args = process.argv.slice(2);
const WATCH = args.includes("--watch");
const SERVE = args.includes("--serve");
const PORT = Number(process.env.PORT || 3000);

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8")
);

// ---------- helpers ----------

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[؀-ۿ]+/g, (m) => m) // keep Arabic letters
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]+/gu, "")
    .replace(/\-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Detect direction from content: if it has Arabic characters, treat as RTL.
function detectLang(text, explicit) {
  if (explicit) return explicit;
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin ? "ar" : "en";
}

function dirFor(lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

function formatDate(dateStr, lang) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return String(dateStr);
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function readingTime(text, lang) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return lang === "ar" ? `${mins} دقائق قراءة` : `${mins} min read`;
}

// ---------- content loading ----------

function loadArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".markdown"));

  const articles = files.map((file) => {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const lang = detectLang(content, data.lang);
    const title = data.title || file.replace(/\.(md|markdown)$/, "");
    const slug = data.slug || slugify(title) || slugify(file);
    const html = marked.parse(content, { mangle: false, headerIds: true });
    const excerpt =
      data.excerpt ||
      content
        .replace(/[#>*_`~\-\[\]!()]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
    return {
      file,
      title,
      slug,
      lang,
      dir: dirFor(lang),
      date: data.date || null,
      dateFormatted: formatDate(data.date, lang),
      author: data.author || config.author,
      tags: Array.isArray(data.tags) ? data.tags : [],
      excerpt,
      draft: Boolean(data.draft),
      cover: data.cover || null,
      readingTime: readingTime(content, lang),
      html,
    };
  });

  return articles
    .filter((a) => !a.draft)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
}

// ---------- templates ----------

function layout({ title, description, body, lang, dir, extraHead = "" }) {
  const siteTitle = lang === "ar" ? config.title : config.titleEn || config.title;
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || config.description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description || config.description)}" />
  <meta property="og:type" content="website" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${config.baseUrl}/assets/styles.css" />
  ${extraHead}
</head>
<body>
  <a class="skip-link" href="#main">${lang === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="${config.baseUrl}/">${escapeHtml(siteTitle)}</a>
      <nav class="nav">
        <a href="${config.baseUrl}/">${lang === "ar" ? "المقالات" : "Articles"}</a>
        <a href="${config.baseUrl}/about/">${lang === "ar" ? "نبذة" : "About"}</a>
        <button class="theme-toggle" id="theme-toggle" aria-label="${lang === "ar" ? "تبديل السمة" : "Toggle theme"}" type="button">
          <span class="theme-icon" aria-hidden="true"></span>
        </button>
      </nav>
    </div>
  </header>
  <main id="main" class="container">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${escapeHtml(config.copyright || config.author)}.</p>
    </div>
  </footer>
  <script src="${config.baseUrl}/assets/main.js" defer></script>
</body>
</html>`;
}

function articleCard(a) {
  const tags = a.tags
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");
  return `<article class="card" dir="${a.dir}" lang="${a.lang}">
    <a class="card-link" href="${config.baseUrl}/articles/${encodeURIComponent(a.slug)}/">
      <h2 class="card-title">${escapeHtml(a.title)}</h2>
      <p class="card-excerpt">${escapeHtml(a.excerpt)}</p>
      <div class="card-meta">
        ${a.dateFormatted ? `<time>${escapeHtml(a.dateFormatted)}</time>` : ""}
        <span class="dot">·</span>
        <span>${escapeHtml(a.readingTime)}</span>
      </div>
      ${tags ? `<div class="card-tags">${tags}</div>` : ""}
    </a>
  </article>`;
}

function homePage(articles) {
  const lang = config.language || "ar";
  const dir = dirFor(lang);
  const tagline = lang === "ar" ? config.tagline : config.taglineEn || config.tagline;
  const cards = articles.length
    ? articles.map(articleCard).join("\n")
    : `<p class="empty">${lang === "ar" ? "لا توجد مقالات منشورة بعد." : "No articles published yet."}</p>`;
  const body = `
    <section class="hero">
      <h1>${escapeHtml(lang === "ar" ? config.title : config.titleEn || config.title)}</h1>
      <p class="hero-tagline">${escapeHtml(tagline)}</p>
    </section>
    <section class="article-list">
      ${cards}
    </section>`;
  return layout({
    title: `${lang === "ar" ? config.title : config.titleEn} — ${tagline}`,
    description: config.description,
    body,
    lang,
    dir,
  });
}

function articlePage(a, all) {
  const backLabel = a.lang === "ar" ? "← كل المقالات" : "← All articles";
  const tags = a.tags
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");
  const body = `
    <article class="post" dir="${a.dir}" lang="${a.lang}">
      <a class="back-link" href="${config.baseUrl}/">${backLabel}</a>
      <header class="post-header">
        <h1 class="post-title">${escapeHtml(a.title)}</h1>
        <div class="post-meta">
          <span>${escapeHtml(a.author)}</span>
          ${a.dateFormatted ? `<span class="dot">·</span><time>${escapeHtml(a.dateFormatted)}</time>` : ""}
          <span class="dot">·</span>
          <span>${escapeHtml(a.readingTime)}</span>
        </div>
        ${tags ? `<div class="post-tags">${tags}</div>` : ""}
      </header>
      ${a.cover ? `<img class="post-cover" src="${escapeHtml(a.cover)}" alt="" />` : ""}
      <div class="post-body">
        ${a.html}
      </div>
    </article>`;
  return layout({
    title: `${a.title} — ${a.lang === "ar" ? config.title : config.titleEn}`,
    description: a.excerpt,
    body,
    lang: a.lang,
    dir: a.dir,
  });
}

function aboutPage() {
  const lang = config.language || "ar";
  const dir = dirFor(lang);
  const body =
    lang === "ar"
      ? `<article class="post" dir="rtl" lang="ar">
          <a class="back-link" href="${config.baseUrl}/">← كل المقالات</a>
          <header class="post-header"><h1 class="post-title">نبذة</h1></header>
          <div class="post-body">
            <p>مرحباً، أنا ${escapeHtml(config.author)}. هذه المساحة أنشر فيها مقالاتي وأفكاري.</p>
            <p>للتواصل: <a href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a></p>
          </div>
        </article>`
      : `<article class="post" dir="ltr" lang="en">
          <a class="back-link" href="${config.baseUrl}/">← All articles</a>
          <header class="post-header"><h1 class="post-title">About</h1></header>
          <div class="post-body">
            <p>Hi, I'm ${escapeHtml(config.author)}. This is where I publish my articles and ideas.</p>
            <p>Get in touch: <a href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a></p>
          </div>
        </article>`;
  return layout({ title: `${lang === "ar" ? "نبذة" : "About"} — ${config.title}`, body, lang, dir });
}

function feed(articles) {
  const items = articles
    .slice(0, 20)
    .map(
      (a) => `  <item>
    <title>${escapeHtml(a.title)}</title>
    <link>${config.baseUrl}/articles/${encodeURIComponent(a.slug)}/</link>
    <guid>${config.baseUrl}/articles/${encodeURIComponent(a.slug)}/</guid>
    ${a.date ? `<pubDate>${new Date(a.date).toUTCString()}</pubDate>` : ""}
    <description>${escapeHtml(a.excerpt)}</description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeHtml(config.title)}</title>
  <link>${config.baseUrl}/</link>
  <description>${escapeHtml(config.description)}</description>
${items}
</channel>
</rss>`;
}

// ---------- build ----------

function build() {
  const start = Date.now();
  rimraf(DIST_DIR);
  ensureDir(DIST_DIR);

  // static assets
  copyDir(PUBLIC_DIR, DIST_DIR);
  ensureDir(path.join(DIST_DIR, "assets"));
  if (fs.existsSync(path.join(SRC_DIR, "styles.css"))) {
    fs.copyFileSync(
      path.join(SRC_DIR, "styles.css"),
      path.join(DIST_DIR, "assets", "styles.css")
    );
  }
  if (fs.existsSync(path.join(SRC_DIR, "main.js"))) {
    fs.copyFileSync(
      path.join(SRC_DIR, "main.js"),
      path.join(DIST_DIR, "assets", "main.js")
    );
  }

  const articles = loadArticles();

  // home
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), homePage(articles));

  // about
  ensureDir(path.join(DIST_DIR, "about"));
  fs.writeFileSync(path.join(DIST_DIR, "about", "index.html"), aboutPage());

  // articles
  for (const a of articles) {
    const dir = path.join(DIST_DIR, "articles", a.slug);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, "index.html"), articlePage(a, articles));
  }

  // feed + sitemap
  fs.writeFileSync(path.join(DIST_DIR, "feed.xml"), feed(articles));
  const urls = [
    `${config.baseUrl}/`,
    `${config.baseUrl}/about/`,
    ...articles.map((a) => `${config.baseUrl}/articles/${encodeURIComponent(a.slug)}/`),
  ];
  fs.writeFileSync(
    path.join(DIST_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
  fs.writeFileSync(path.join(DIST_DIR, ".nojekyll"), "");

  const ms = Date.now() - start;
  console.log(
    `Built ${articles.length} article(s) into dist/ in ${ms}ms` +
      (articles.length === 0 ? " — add .md files to articles/ to get started." : "")
  );
}

// ---------- dev server ----------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serve() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(DIST_DIR, urlPath);
    if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + ".html"))
      filePath += ".html";
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())
      filePath = path.join(filePath, "index.html");
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1>");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  server.listen(PORT, () => {
    console.log(`Serving dist/ at http://localhost:${PORT}`);
  });
}

// ---------- run ----------

build();

if (WATCH) {
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (e) {
        console.error("Build error:", e.message);
      }
    }, 100);
  };
  for (const dir of [ARTICLES_DIR, SRC_DIR, PUBLIC_DIR]) {
    if (fs.existsSync(dir))
      fs.watch(dir, { recursive: true }, rebuild);
  }
  fs.watch(path.join(ROOT, "site.config.json"), rebuild);
  console.log("Watching for changes...");
}

if (SERVE) serve();
