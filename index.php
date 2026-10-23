<?php
$languages = [
    'tr' => [
        'title' => 'PDFsHub - Ücretsiz PDF Birleştirme, Sıkıştırma ve Dönüştürme',
        'description' => 'PDF dosyalarını ücretsiz birleştirin, sıkıştırın, dönüştürün ve düzenleyin. Hızlı ve gizli PDF araçları doğrudan tarayıcınızda çalışır.',
        'keywords' => 'ücretsiz PDF araçları, PDF birleştirme, PDF sıkıştırma, PDF dönüştürme, PDF düzenleme, PDF ayırma',
        'og_locale' => 'tr_TR',
        'hero_title' => 'PDF\'lerinizi Kolayca Düzenleyin',
        'hero_description' => 'PDF dosyalarını ücretsiz birleştirin, sıkıştırın, dönüştürün ve düzenleyin. Hızlı ve gizli PDF araçları doğrudan tarayıcınızda çalışır.',
        'features' => ['PDF birleştirme', 'PDF ayırma', 'PDF sıkıştırma', 'PDF dönüştürme', 'PDF düzenleme', 'OCR']
    ],
    'en' => [
        'title' => 'PDFsHub - Free PDF Merger, Compressor & Converter',
        'description' => 'Merge, compress, convert, and edit PDF files for free. Fast, private PDF tools run directly in your browser.',
        'keywords' => 'free PDF tools, merge PDF, compress PDF, convert PDF, edit PDF, split PDF',
        'og_locale' => 'en_US',
        'hero_title' => 'Organize & Edit your PDFs Easily',
        'hero_description' => 'Merge, compress, convert, and edit PDF files for free. Fast, private PDF tools run directly in your browser.',
        'features' => ['Merge PDF', 'Split PDF', 'Compress PDF', 'Convert PDF', 'Edit PDF', 'OCR']
    ],
    'de' => [
        'title' => 'PDFsHub - PDF kostenlos zusammenfügen, komprimieren & umwandeln',
        'description' => 'PDF-Dateien kostenlos zusammenfügen, komprimieren, umwandeln und bearbeiten. Schnelle, private PDF-Tools direkt im Browser.',
        'keywords' => 'kostenlose PDF-Tools, PDF zusammenfügen, PDF komprimieren, PDF umwandeln, PDF bearbeiten, PDF teilen',
        'og_locale' => 'de_DE',
        'hero_title' => 'PDFs einfach bearbeiten und organisieren',
        'hero_description' => 'PDF-Dateien kostenlos zusammenfügen, komprimieren, umwandeln und bearbeiten. Schnelle, private PDF-Tools direkt im Browser.',
        'features' => ['PDF zusammenfügen', 'PDF teilen', 'PDF komprimieren', 'PDF umwandeln', 'PDF bearbeiten', 'OCR']
    ],
    'ja' => [
        'title' => 'PDFsHub - PDF結合・圧縮・変換を無料で',
        'description' => 'PDFファイルの結合、圧縮、変換、編集を無料で。高速でプライベートなPDFツールがブラウザ上で動作します。',
        'keywords' => '無料 PDF ツール, PDF 結合, PDF 圧縮, PDF 変換, PDF 編集, PDF 分割',
        'og_locale' => 'ja_JP',
        'hero_title' => 'PDFを簡単かつ安全に編集',
        'hero_description' => 'PDFファイルの結合、圧縮、変換、編集を無料で。高速でプライベートなPDFツールがブラウザ上で動作します。',
        'features' => ['PDF結合', 'PDF分割', 'PDF圧縮', 'PDF変換', 'PDF編集', 'OCR']
    ],
    'hi' => [
        'title' => 'PDFsHub - PDF मर्ज, कंप्रेस और कन्वर्ट करें मुफ्त में',
        'description' => 'PDF फ़ाइलों को मुफ्त में मर्ज, कंप्रेस, कन्वर्ट और संपादित करें। तेज़ और निजी PDF टूल सीधे आपके ब्राउज़र में चलते हैं।',
        'keywords' => 'मुफ्त PDF टूल, PDF मर्ज करें, PDF कंप्रेस करें, PDF कन्वर्ट करें, PDF संपादित करें, PDF विभाजित करें',
        'og_locale' => 'hi_IN',
        'hero_title' => 'अपने PDFs को आसानी से संपादित करें',
        'hero_description' => 'PDF फ़ाइलों को मुफ्त में मर्ज, कंप्रेस, कन्वर्ट और संपादित करें। तेज़ और निजी PDF टूल सीधे आपके ब्राउज़र में चलते हैं।',
        'features' => ['PDF मर्ज करें', 'PDF विभाजित करें', 'PDF कंप्रेस करें', 'PDF कन्वर्ट करें', 'PDF संपादित करें', 'OCR']
    ],
];

$language = strtolower((string)($_GET['lang'] ?? 'tr'));
if (!isset($languages[$language])) {
    http_response_code(404);
    exit('Language not found');
}

$html = file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    http_response_code(500);
    exit('Unable to load the homepage');
}

$page = $languages[$language];
$canonical = 'https://pdfshub.com/' . $language;
$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$html = preg_replace('/<html lang="[^"]*">/', '<html lang="' . $language . '">', $html, 1);
$html = preg_replace('/<title>.*?<\/title>/s', '<title>' . $escape($page['title']) . '</title>', $html, 1);
$html = preg_replace('/(<meta name="description" content=")[^"]*(")/', '$1' . $escape($page['description']) . '$2', $html, 1);
$html = preg_replace('/(<meta name="keywords" content=")[^"]*(")/', '$1' . $escape($page['keywords']) . '$2', $html, 1);
$html = preg_replace('/(<meta property="og:locale" content=")[^"]*(")/', '$1' . $page['og_locale'] . '$2', $html, 1);
$html = preg_replace('/(<link rel="canonical" href=")[^"]*(")/', '$1' . $canonical . '$2', $html, 1);
$html = preg_replace('/(<meta property="(?:og|twitter):url" content=")[^"]*(")/', '$1' . $canonical . '$2', $html);
$html = preg_replace('/(<meta property="(?:og|twitter):title" content=")[^"]*(")/', '$1' . $escape($page['title']) . '$2', $html);
$html = preg_replace('/(<meta property="(?:og|twitter):description" content=")[^"]*(")/', '$1' . $escape($page['description']) . '$2', $html);
$html = preg_replace('/(<h1 id="hero-title">).*?(<\/h1>)/s', '$1' . $escape($page['hero_title']) . '$2', $html, 1);
$html = preg_replace('/(<p id="hero-description">).*?(<\/p>)/s', '$1' . $escape($page['hero_description']) . '$2', $html, 1);

$schema = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'WebApplication',
            'name' => 'PDFsHub',
            'url' => $canonical,
            'inLanguage' => $language,
            'operatingSystem' => 'All',
            'applicationCategory' => 'BusinessApplication',
            'description' => $page['description'],
            'featureList' => $page['features'],
            'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
        ],
        [
            '@type' => 'Organization',
            'name' => 'PDFsHub',
            'url' => 'https://pdfshub.com/' . $language,
            'logo' => ['@type' => 'ImageObject', 'url' => 'https://pdfshub.com/logo.png'],
        ],
    ],
];
$schemaJson = json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$html = preg_replace(
    '/<script type="application\/ld\+json">.*?<\/script>/s',
    '<script type="application/ld+json">' . $schemaJson . '</script>',
    $html,
    1
);

header('Content-Type: text/html; charset=UTF-8');
header('X-Robots-Tag: index, follow');
$seoTools = json_decode((string)file_get_contents(__DIR__ . '/seo-tools.json'), true);
$html = preg_replace_callback('/href="([a-z0-9]+)\.html"/', static function (array $match) use ($seoTools, $language): string {
    return isset($seoTools[$language][$match[1]]) ? 'href="/' . $language . '/' . $match[1] . '"' : $match[0];
}, $html);

echo $html;
