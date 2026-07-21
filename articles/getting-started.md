---
title: How This Site Works
date: 2026-07-20
author: Abdulmajeed Alqassem
tags:
  - guide
  - english
excerpt: A quick walkthrough of how to publish articles on this site — in English or Arabic.
---

This site is a lightweight, fast, and fully static website for publishing
articles. There is no database and no server to maintain — every page is plain
HTML generated from your Markdown files.

## Writing an article

Create a new `.md` file inside the `articles/` folder. Each file starts with a
small block of metadata (called *front matter*):

```yaml
---
title: My Article Title
date: 2026-07-20
tags:
  - law
  - finance
excerpt: A one-line summary shown on the homepage.
---
```

Everything below that block is the body of your article, written in normal
Markdown.

## Arabic and English

The site detects the language of each article automatically. Arabic articles are
displayed right-to-left, and English articles left-to-right — no configuration
needed. You can mix both languages on the same site.

## Publishing

When you're ready, run:

```bash
npm run build
```

The finished website appears in the `dist/` folder, ready to deploy anywhere —
GitHub Pages, Netlify, Vercel, or any static host.
