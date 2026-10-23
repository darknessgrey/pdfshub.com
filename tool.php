<?php
// Serves /{lang}/{tool}: the static Turkish tool page localized for SEO (title, description, canonical, hreflang, article, schema).
$content = require __DIR__ . '/seo-content.php';
$tools = json_decode((string)file_get_contents(__DIR__ . '/seo-tools.json'), true);

$language = strtolower((string)($_GET['lang'] ?? ''));
$tool = (string)($_GET['tool'] ?? '');
$pageFile = __DIR__ . '/' . $tool . '.html';

if (!is_array($tools) || !isset($tools[$language][$tool]) || !preg_match('/^[a-z0-9]+$/', $tool) || !is_file($pageFile)) {
    http_response_code(404);
    exit('Page not found');
}

$html = (string)file_get_contents($pageFile);
$meta = $tools[$language][$tool];
$origin = 'https://pdfshub.com';
$canonical = $origin . '/' . $language . '/' . $tool;
$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$locales = ['tr' => 'tr_TR', 'en' => 'en_US', 'de' => 'de_DE', 'ja' => 'ja_JP', 'hi' => 'hi_IN'];

$alternates = '';
foreach (array_keys($locales) as $code) {
    $alternates .= "\n    " . '<link rel="alternate" hreflang="' . $code . '" href="' . $origin . '/' . $code . '/' . $tool . '">';
}
$alternates .= "\n    " . '<link rel="alternate" hreflang="x-default" href="' . $origin . '/tr/' . $tool . '">';

$html = preg_replace('/<html lang="[^"]*">/', '<html lang="' . $language . '">', $html, 1);
$html = preg_replace('/<meta charset="UTF-8">/', '<meta charset="UTF-8">' . "\n    " . '<base href="/">', $html, 1);
$html = str_replace($origin . '/' . $tool . '.html', $canonical, $html);
$html = preg_replace('/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\s*/', '', $html);
$html = preg_replace('/(<link rel="canonical" href=")[^"]*(">)/', '$1' . $canonical . '$2' . $alternates, $html, 1);
$html = preg_replace('/(<meta property="(?:og|twitter):url" content=")[^"]*(")/', '$1' . $canonical . '$2', $html);
$html = preg_replace('/<meta property="og:locale" content="[^"]*">\s*/', '', $html);
$html = preg_replace('/(<meta property="og:type" content="website">)/', '$1' . "\n    " . '<meta property="og:locale" content="' . $locales[$language] . '">', $html, 1);

if ($language !== 'tr') {
    $text = $content[$language];
    $title = $meta['title'] . ' - ' . $text['title_suffix'];

    $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . $escape($title) . '</title>', $html, 1);
    $html = preg_replace('/(<meta name="description" content=")[^"]*(")/', '$1' . $escape($meta['desc']) . '$2', $html, 1);
    $html = preg_replace('/(<meta name="keywords" content=")[^"]*(")/', '$1' . $escape($meta['title'] . ', ' . $meta['title'] . ' online, PDFsHub') . '$2', $html, 1);
    $html = preg_replace('/(<meta property="(?:og|twitter):title" content=")[^"]*(")/', '$1' . $escape($title) . '$2', $html);
    $html = preg_replace('/(<meta property="(?:og|twitter):description" content=")[^"]*(")/', '$1' . $escape($meta['desc']) . '$2', $html);
    $html = preg_replace('/(<h2 id="tool-title">).*?(<\/h2>)/s', '$1' . $escape($meta['title']) . '$2', $html, 1);
    $html = preg_replace('/(<p id="tool-desc">).*?(<\/p>)/s', '$1' . $escape($meta['desc']) . '$2', $html, 1);

    $steps = '';
    foreach ($text['steps'] as $index => [$stepTitle, $stepDesc]) {
        $steps .= '<div style="background:var(--bg-color); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.5rem; display:flex; gap:1.2rem; align-items:flex-start;">'
            . '<div style="background:var(--primary); color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0;">' . ($index + 1) . '</div>'
            . '<div><h4 style="font-weight:700; margin-bottom:0.4rem; color:var(--text-main); font-size:1.05rem;">' . $escape($stepTitle) . '</h4>'
            . '<p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin:0;">' . $escape($stepDesc) . '</p></div></div>';
    }

    $trustColors = ['var(--primary)', 'var(--secondary)', '#10b981'];
    $trustIcons = ['fa-shield-halved', 'fa-bolt', 'fa-coins'];
    $trust = '';
    foreach ($text['trust'] as $index => [$trustTitle, $trustDesc]) {
        $trust .= '<div style="background: var(--bg-color); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem;">'
            . '<h4 style="color: ' . $trustColors[$index] . '; font-weight: 700; margin-bottom: 0.5rem;"><i class="fa-solid ' . $trustIcons[$index] . '"></i> ' . $escape($trustTitle) . '</h4>'
            . '<p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin: 0;">' . $escape($trustDesc) . '</p></div>';
    }

    $faqHtml = '';
    $faqEntities = [];
    foreach ($text['faq'] as [$question, $answer]) {
        $faqHtml .= '<div style="background:var(--bg-color); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.4rem; margin-bottom:1rem;">'
            . '<h4 style="font-weight:700; margin-bottom:0.5rem; color:var(--text-main); font-size:1rem;"><i class="fa-regular fa-circle-question" style="color:var(--primary); margin-right:6px;"></i> ' . $escape($question) . '</h4>'
            . '<p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin:0;">' . $escape($answer) . '</p></div>';
        $faqEntities[] = ['@type' => 'Question', 'name' => $question, 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $answer]];
    }

    $article = '<article class="tool-seo-guide" style="max-width: 900px; margin: 4rem auto 2rem auto; padding: 0 1rem; width: 100%;">'
        . '<div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">'
        . '<h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 1.2rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">' . $escape($meta['title']) . '</h2>'
        . '<p style="color: var(--text-muted); font-size: 0.98rem; line-height: 1.8; margin-bottom: 2rem;">' . $escape($meta['desc'] . ' ' . $text['privacy']) . '</p>'
        . '<h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; color: var(--text-main);">' . $escape($text['howto']) . '</h3>'
        . '<div style="display: grid; gap: 1rem; margin-bottom: 2.5rem;">' . $steps . '</div>'
        . '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">' . $trust . '</div>'
        . '<h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; color: var(--text-main);">' . $escape($text['faq_title']) . '</h3>'
        . '<div>' . $faqHtml . '</div>'
        . '<div style="text-align: center; margin-top: 2rem;"><a href="/' . $language . '" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: var(--radius-md); font-weight: 600;"><i class="fa-solid fa-arrow-left"></i> ' . $escape($text['back']) . '</a></div>'
        . '</div></article>';
    $html = preg_replace('/<article class="tool-seo-guide".*?<\/article>/s', str_replace(['\\', '$'], ['\\\\', '\\$'], $article), $html, 1);

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebApplication',
                'name' => $meta['title'] . ' - PDFsHub',
                'url' => $canonical,
                'inLanguage' => $language,
                'operatingSystem' => 'All',
                'applicationCategory' => 'BusinessApplication',
                'description' => $meta['desc'],
                'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
            ],
            ['@type' => 'FAQPage', 'inLanguage' => $language, 'mainEntity' => $faqEntities],
        ],
    ];
    $schemaJson = json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $html = preg_replace('/<script type="application\/ld\+json">.*?<\/script>/s', str_replace(['\\', '$'], ['\\\\', '\\$'], '<script type="application/ld+json">' . $schemaJson . '</script>'), $html, 1);
}

// Keep internal links inside the visitor's language.
$html = preg_replace_callback('/href="([a-z0-9]+)\.html"/', static function (array $match) use ($tools, $language): string {
    if ($match[1] === 'index') return 'href="/' . $language . '"';
    return isset($tools[$language][$match[1]]) ? 'href="/' . $language . '/' . $match[1] . '"' : $match[0];
}, $html);

header('Content-Type: text/html; charset=UTF-8');
header('X-Robots-Tag: index, follow');
echo $html;
