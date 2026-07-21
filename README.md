# موقع المقالات — Articles Website

موقع بسيط وسريع لنشر المقالات، يدعم العربية (RTL) والإنجليزية (LTR) تلقائياً.
A lightweight, fast, static website for publishing articles — bilingual
(Arabic/English) out of the box.

---

## البدء السريع (Quick start)

```bash
npm install          # مرة واحدة فقط — install dependencies once
npm run dev          # معاينة محلية مع إعادة البناء التلقائي على http://localhost:3000
npm run build        # بناء الموقع النهائي في مجلد dist/
```

## نشر مقالة جديدة (Publish a new article)

1. أنشئ ملفاً جديداً في مجلد `articles/` بامتداد `.md`.
2. ابدأه بمعلومات المقالة، ثم اكتب المحتوى:

```markdown
---
title: عنوان المقالة
date: 2026-07-21
author: عبدالمجيد القاسم
tags:
  - قانون
  - أعمال
excerpt: ملخص من سطر واحد يظهر في الصفحة الرئيسية.
---

نص المقالة يبدأ هنا...
```

3. احفظ الملف. اللغة (عربي/إنجليزي) تُكتشف تلقائياً.
4. شغّل `npm run build` — أو ادفع التغييرات وسينشر الموقع تلقائياً.

### الحقول المتاحة (Front matter fields)

| الحقل | مطلوب؟ | الوصف |
|-------|--------|-------|
| `title` | نعم | عنوان المقالة |
| `date` | مُستحسن | تاريخ النشر (YYYY-MM-DD) |
| `author` | لا | الكاتب (الافتراضي من الإعدادات) |
| `tags` | لا | قائمة وسوم |
| `excerpt` | لا | ملخص (يُولَّد تلقائياً إن تُرك) |
| `lang` | لا | `ar` أو `en` (يُكتشف تلقائياً) |
| `slug` | لا | رابط المقالة (يُولَّد من العنوان) |
| `cover` | لا | صورة غلاف |
| `draft` | لا | `true` لإخفاء المقالة |

## التخصيص (Customize)

عدّل ملف `site.config.json` لتغيير اسم الموقع، الوصف، البريد، وحقوق النشر.
التصميم في `src/styles.css`.

## النشر (Deployment)

الموقع كله ملفات ثابتة في `dist/` — انشره على أي مستضيف:

- **GitHub Pages**: ملف `.github/workflows/deploy.yml` يبني وينشر الموقع تلقائياً
  عند كل دفعة. فعّل GitHub Pages من إعدادات المستودع (Settings → Pages → Source:
  GitHub Actions).
- **Netlify / Vercel**: أمر البناء `npm run build`، ومجلد النشر `dist`.

## هيكل المشروع (Project structure)

```
articles/          مقالاتك (Markdown)
src/               التصميم والسكربتات (styles.css, main.js)
public/            ملفات ثابتة تُنسخ كما هي (robots.txt, صور)
build.mjs          مولّد الموقع
site.config.json   إعدادات الموقع
dist/              الموقع المبني (يُنشأ تلقائياً)
```
