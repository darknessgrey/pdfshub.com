// Regenerates seo-tools.json (from toolsMetadata in app.src.js) and sitemap.xml.
// Run with: npm run seo
const fs = require('fs');
const path = require('path');

const languages = ['tr', 'en', 'de', 'ja', 'hi'];
const source = fs.readFileSync(path.join(__dirname, 'app.src.js'), 'utf8');
const marker = 'const toolsMetadata = ';
const start = source.indexOf(marker);
const end = source.indexOf('\nconst i18n', start);
if (start < 0 || end < 0) throw new Error('toolsMetadata block not found in app.src.js');

const metadata = new Function('return ' + source.slice(start + marker.length, end).trim().replace(/;$/, ''))();
const toolIds = Object.keys(metadata.tr);

for (const lang of languages) {
    for (const id of toolIds) {
        const entry = metadata[lang] && metadata[lang][id];
        if (!entry || !entry.title || !entry.desc) throw new Error(`Missing ${lang}/${id} metadata`);
    }
}

const data = {};
for (const lang of languages) data[lang] = metadata[lang];
fs.writeFileSync(path.join(__dirname, 'seo-tools.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');

const origin = 'https://pdfshub.com';
const today = new Date().toISOString().slice(0, 10);

function entry(loc, alternates, changefreq, priority) {
    const links = alternates
        .map(([lang, href]) => `        <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
        .join('\n');
    return `    <url>
        <loc>${loc}</loc>
${links}
        <lastmod>${today}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
}

function group(suffix, changefreq, priorityTr, priorityOther) {
    const alternates = languages.map(lang => [lang, `${origin}/${lang}${suffix}`]);
    alternates.push(['x-default', `${origin}/tr${suffix}`]);
    return languages.map(lang =>
        entry(`${origin}/${lang}${suffix}`, alternates, changefreq, lang === 'tr' ? priorityTr : priorityOther));
}

const urls = [...group('', 'daily', '1.0', '0.9')];
for (const id of toolIds) urls.push(...group(`/${id}`, 'weekly', '0.9', '0.8'));
urls.push(`    <url>
        <loc>${origin}/privacy.html</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>`);

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`, 'utf8');

console.log(`seo-tools.json and sitemap.xml generated (${toolIds.length} tools x ${languages.length} languages).`);
