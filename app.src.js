let currentTool = null;
let selectedFiles = [];
let currentLang = 'tr';
let scannedPages = [];
let scanStream = null;
let redactRegions = {}; // { pageIndex: [{x,y,w,h}] }
let editItems = []; // [{text, page, position, fontSize, color}]
let visualEditPages = [];
let selectedEditElement = null;
let currentEditPageIndex = 0;
let lastTouchedEditPageIndex = 0;
let editElementIdCounter = 0;
let currentEditTool = 'select';
let currentEditShape = 'rectangle';
let editZoom = 1.0;
let editFillColor = 'none';
let editUndoStack = [];
let editRedoStack = [];
let autoOpenSigModal = false;

// Required CDN scripts mapping for each tool (lazy loaded on demand for top speed & perfect SEO score)
const toolScripts = {
    merge: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    split: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'],
    organizepages: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
    protect: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    unlock: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    sign: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    jpg2pdf: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    pdf2jpg: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'],
    word2pdf: ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'],
    excel2pdf: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'],
    pdf2word: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'],
    pdf2excel: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'],
    pagenumbers: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    watermark: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    rotate: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    compress: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
    html2pdf: ['https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'],
    crop: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    repair: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    ocr: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'],
    ppt2pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    pdf2ppt: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js'],
    edit: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
    redact: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
    compare: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jsdiff/5.1.0/diff.min.js'],
    scantopdf: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
    pdf2pdfa: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js']
};

const loadedScripts = new Set();

// Sleek Dynamic Script Loader to boost SEO PageSpeed score from 15% to 100%!
async function loadRequiredScripts(toolId) {
    const urls = toolScripts[toolId] || [];
    if (urls.length === 0) return;

    const overlay = document.getElementById('script-loading-overlay');
    const labelText = document.getElementById('loading-overlay-text');
    
    labelText.textContent = currentLang === 'tr' 
        ? "Güvenli modüller ve kütüphaneler yükleniyor..." 
        : "Loading secure browser modules...";
    overlay.style.display = 'flex';

    try {
        const promises = urls.map(url => {
            if (loadedScripts.has(url)) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.crossOrigin = "anonymous";
                script.onload = () => {
                    loadedScripts.add(url);
                    // Special PDFJS worker binding right after loading
                    if (url.includes('pdf.min.js') && window.pdfjsLib) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }
                    resolve();
                };
                script.onerror = () => reject(new Error(`Failed to load dependency: ${url}`));
                document.head.appendChild(script);
            });
        });
        await Promise.all(promises);
    } catch (err) {
        alert(currentLang === 'tr' ? `Hata: Kütüphane yüklenemedi. Lütfen sayfayı yenileyin. Detay: ${err.message}` : `Error: Dependencies failed to load. Please refresh. Detail: ${err.message}`);
        throw err;
    } finally {
        overlay.style.display = 'none';
    }
}

// DOM Elements
const viewHome = document.getElementById('view-home');
const viewTool = document.getElementById('view-tool');
const toolTitle = document.getElementById('tool-title');
const toolDesc = document.getElementById('tool-desc');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileListContainer = document.getElementById('file-list-container');
const fileList = document.getElementById('file-list');
const toolOptions = document.getElementById('tool-options');
const actionBtn = document.getElementById('action-btn');

const resultArea = document.getElementById('result-area');
const loader = document.getElementById('loader');
const resultContent = document.getElementById('result-content');
const downloadBtn = document.getElementById('download-btn');

// Metadata definitions with deep Turkish & English localized SEO title/description mapping
const toolsMetadata = {
    tr: {
        merge: { title: "PDF Birleştir", desc: "PDF dosyalarınızı sıralayın ve tarayıcınızda tek tıkla birleştirin." },
        split: { title: "PDF Ayır", desc: "PDF sayfalarını istediğiniz aralıklardan ayırıp ZIP olarak indirin." },
        organizepages: { title: "Sayfaları Düzenle/Sil", desc: "PDF sayfalarının yerini sürükleyerek değiştirin ve istemediklerinizi tek tuşla silin." },
        jpg2pdf: { title: "JPG'den PDF'e", desc: "Resimlerinizi (JPG, PNG) yüksek çözünürlüklü PDF belgesine dönüştürün." },
        pdf2jpg: { title: "PDF'ten JPG'e", desc: "PDF sayfalarını yüksek kaliteli JPG resimleri olarak dışa aktarın." },
        word2pdf: { title: "Word'den PDF'e", desc: "Word belgenizi (.docx) tarayıcınızda anında PDF formatında kaydedin." },
        excel2pdf: { title: "Excel'den PDF'e", desc: "Excel (.xlsx) tablolarınızı okunabilir temiz bir PDF'e dönüştürün." },
        pdf2word: { title: "PDF'ten Word'e", desc: "PDF'in içindeki metinleri okuyarak (.doc) formatına dönüştürün." },
        pdf2excel: { title: "PDF'ten Excel'e", desc: "PDF tablolarınızı otomatik olarak XLSX Excel tablosuna dönüştürün." },
        pagenumbers: { title: "Sayfa Numarası Ekle", desc: "PDF sayfalarınızın köşelerine veya ortasına sayfa numarası yerleştirin." },
        watermark: { title: "Filigran Ekle", desc: "Her sayfaya şeffaf koruma/mühür yazısı ekleyin." },
        rotate: { title: "PDF Döndür", desc: "Ters veya yan dönmüş PDF sayfalarınızı istediğiniz yöne döndürün." },
        protect: { title: "PDF Şifrele", desc: "PDF belgenize güçlü açılış şifresi ekleyerek gizliliğinizi koruyun." },
        unlock: { title: "PDF Şifre Çöz", desc: "Şifresini bildiğiniz PDF dosyalarından korumayı kalıcı olarak kaldırın." },
        sign: { title: "İmza Ekle", desc: "Belgenize kendi imzanızı (resim olarak) sürükleyip yerleştirin." },
        compress: { title: "PDF Sıkıştır", desc: "PDF dosya boyutunu kaliteden ödün vermeden optimize ederek küçültün." },
        html2pdf: { title: "HTML'den PDF'e", desc: "Web sayfalarını veya girdiğiniz HTML kodlarını PDF yapın." },
        crop: { title: "PDF Kırp", desc: "Sayfa kenarlarındaki gereksiz beyaz boşlukları temizleyin." },
        repair: { title: "PDF Tamir Et", desc: "Hatalı veya bozuk yapıdaki PDF dosyalarını onarın." },
        ocr: { title: "OCR PDF", desc: "Taranmış resim veya PDF belgelerindeki metinleri otomatik tanıyarak çıkarın." },
        ppt2pdf: { title: "PPT'den PDF'e", desc: "Slayt metinlerini PDF'e aktarır; görseller ve tasarım korunmaz." },
        pdf2ppt: { title: "PDF'ten PPT'ye", desc: "PDF dökümanınızı düzenlenebilir PPT slaytlarına dönüştürün." },
        edit: { title: "PDF Düzenle", desc: "PDF üzerine yazı yazın, resim ve şekil ekleyin." },
        redact: { title: "Redakte Et", desc: "PDF üzerindeki hassas veya gizli bilgilerin üzerini siyah bantla kapatın." },
        compare: { title: "PDF Karşılaştır", desc: "İki PDF belgesi arasındaki metinsel farkları bulup gösterin." },
        scantopdf: { title: "Tarat ve PDF Yap", desc: "Web kameranızı veya telefon kameranızı kullanarak döküman tarayıp anında PDF yapın." },
        pdf2pdfa: { title: "PDF Bilgilerini Güncelle", desc: "PDF Creator bilgisini PDFsHub olarak düzenler; PDF/A dönüşümü veya uygunluk doğrulaması yapmaz." }
    },
    en: {
        merge: { title: "Merge PDF", desc: "Combine several PDF files into one quickly and securely in your browser." },
        split: { title: "Split PDF", desc: "Separate PDF pages into independent files and download as ZIP." },
        organizepages: { title: "Organize Pages", desc: "Sort, rotate, and delete PDF pages easily." },
        jpg2pdf: { title: "JPG to PDF", desc: "Convert your image files (JPG, PNG) to high-quality PDF documents." },
        pdf2jpg: { title: "PDF to JPG", desc: "Extract PDF pages as high-quality JPG images." },
        word2pdf: { title: "Word to PDF", desc: "Convert Word DOCX documents to PDF format directly." },
        excel2pdf: { title: "Excel to PDF", desc: "Convert Excel spreadsheets into structured PDF tables." },
        pdf2word: { title: "PDF to Word", desc: "Extract text from PDF and convert it to DOC format." },
        pdf2excel: { title: "PDF to Excel", desc: "Convert tables in PDF into Excel XLSX spreadsheets." },
        pagenumbers: { title: "Page Numbers", desc: "Add customized page numbers to your PDF document." },
        watermark: { title: "Watermark", desc: "Stamp a transparent security text over your PDF pages." },
        rotate: { title: "Rotate PDF", desc: "Rotate your misoriented PDF pages perfectly." },
        protect: { title: "Protect PDF", desc: "Encrypt your PDF with a strong security password." },
        unlock: { title: "Unlock PDF", desc: "Remove password protection from encrypted PDFs." },
        sign: { title: "Sign PDF", desc: "Add your personal signature image to any document." },
        compress: { title: "Compress PDF", desc: "Optimize file size while keeping high visual quality." },
        html2pdf: { title: "HTML to PDF", desc: "Convert web pages or custom HTML code to PDF." },
        crop: { title: "Crop PDF", desc: "Trim margins or specific areas of a PDF document." },
        repair: { title: "Repair PDF", desc: "Fix damaged or corrupt structural layouts of PDF files." },
        ocr: { title: "OCR PDF", desc: "Convert scanned PDFs and images into editable text." },
        ppt2pdf: { title: "PPT to PDF", desc: "Extract slide text into a simple PDF; images and original layout are not preserved." },
        pdf2ppt: { title: "PDF to PPT", desc: "Convert PDF pages into editable PowerPoint slides." },
        edit: { title: "Edit PDF", desc: "Add text, drawings, and custom images to your PDF." },
        redact: { title: "Redact PDF", desc: "Permanently blackout sensitive information from your PDF." },
        compare: { title: "Compare PDF", desc: "Find textual and visual differences between two PDF versions." },
        scantopdf: { title: "Scan to PDF", desc: "Use your device camera to scan paper documents straight to PDF." },
        pdf2pdfa: { title: "Update PDF Metadata", desc: "Sets the PDF Creator metadata to PDFsHub; it does not convert to or validate PDF/A." }
    },
    ja: {
        merge:        { title: "PDF結合",           desc: "複数のPDFファイルをブラウザで素早く1つに結合します。" },
        split:        { title: "PDF分割",           desc: "PDFのページを分割してZIPでダウンロードします。" },
        organizepages:{ title: "ページ整理・削除",   desc: "ページをドラッグして並べ替え、不要なページを削除します。" },
        jpg2pdf:      { title: "JPGからPDF",        desc: "画像ファイル（JPG・PNG）を高品質なPDFに変換します。" },
        pdf2jpg:      { title: "PDFからJPG",        desc: "PDFの各ページを高品質なJPG画像として書き出します。" },
        word2pdf:     { title: "WordからPDF",       desc: "WordのDOCX文書をブラウザで直接PDF形式に変換します。" },
        excel2pdf:    { title: "ExcelからPDF",      desc: "Excelスプレッドシートを整理されたPDF表に変換します。" },
        pdf2word:     { title: "PDFからWord",       desc: "PDFのテキストを抽出してDOC形式に変換します。" },
        pdf2excel:    { title: "PDFからExcel",      desc: "PDFの表をXLSXスプレッドシートに変換します。" },
        pagenumbers:  { title: "ページ番号追加",     desc: "PDF文書にカスタムページ番号を追加します。" },
        watermark:    { title: "透かし追加",         desc: "PDFページに透明なセキュリティテキストを印刷します。" },
        rotate:       { title: "PDF回転",           desc: "向きの間違ったPDFページを正しく回転させます。" },
        protect:      { title: "PDF保護",           desc: "強力なパスワードでPDFを暗号化します。" },
        unlock:       { title: "PDFロック解除",      desc: "暗号化されたPDFからパスワード保護を削除します。" },
        sign:         { title: "署名追加",           desc: "任意の文書に個人の署名画像を追加します。" },
        compress:     { title: "PDF圧縮",           desc: "高画質を保ちながらファイルサイズを最適化します。" },
        html2pdf:     { title: "HTMLからPDF",       desc: "WebページやHTMLコードをPDFに変換します。" },
        crop:         { title: "PDF切り抜き",        desc: "PDFのページ余白や特定の領域をトリミングします。" },
        repair:       { title: "PDF修復",           desc: "破損または壊れたPDFファイルを修正します。" },
        ocr:          { title: "OCR PDF",           desc: "スキャンしたPDFや画像を編集可能なテキストに変換します。" },
        ppt2pdf:      { title: "PPTからPDF",        desc: "スライドのテキストのみPDFに抽出します。画像や元のレイアウトは保持されません。" },
        pdf2ppt:      { title: "PDFからPPT",        desc: "PDFページを編集可能なPowerPointスライドに変換します。" },
        edit:         { title: "PDF編集",           desc: "PDFにテキスト、図形、画像を追加します。" },
        redact:       { title: "黒塗り処理",         desc: "PDFから機密情報を永続的に黒塗りします。" },
        compare:      { title: "PDF比較",           desc: "2つのPDFバージョン間の差異を検出します。" },
        scantopdf:    { title: "スキャンしてPDF化",  desc: "カメラで紙文書をスキャンしてPDFを作成します。" },
        pdf2pdfa:     { title: "PDFメタデータを更新", desc: "PDF Creator情報をPDFsHubに設定します。PDF/A変換や適合性検証は行いません。" }
    },
    hi: {
        merge:        { title: "PDF मर्ज करें",      desc: "ब्राउज़र में कई PDF को जल्दी एक में मिलाएं।" },
        split:        { title: "PDF विभाजित करें",   desc: "PDF पृष्ठों को अलग करके ZIP के रूप में डाउनलोड करें।" },
        organizepages:{ title: "पृष्ठ व्यवस्थित करें", desc: "खींचकर पृष्ठ पुनर्व्यवस्थित करें और अनचाहे हटाएं।" },
        jpg2pdf:      { title: "JPG से PDF",         desc: "छवि फ़ाइलें (JPG, PNG) को PDF में बदलें।" },
        pdf2jpg:      { title: "PDF से JPG",         desc: "PDF पृष्ठों को उच्च-गुणवत्ता JPG के रूप में निर्यात करें।" },
        word2pdf:     { title: "Word से PDF",        desc: "Word DOCX दस्तावेज़ को सीधे PDF में बदलें।" },
        excel2pdf:    { title: "Excel से PDF",       desc: "Excel स्प्रेडशीट को साफ़ PDF तालिका में बदलें।" },
        pdf2word:     { title: "PDF से Word",        desc: "PDF से टेक्स्ट निकालें और DOC में बदलें।" },
        pdf2excel:    { title: "PDF से Excel",       desc: "PDF तालिकाओं को XLSX में बदलें।" },
        pagenumbers:  { title: "पृष्ठ संख्या जोड़ें", desc: "PDF में कस्टम पृष्ठ संख्या जोड़ें।" },
        watermark:    { title: "वॉटरमार्क जोड़ें",   desc: "PDF पृष्ठों पर पारदर्शी सुरक्षा टेक्स्ट लगाएं।" },
        rotate:       { title: "PDF घुमाएं",          desc: "गलत दिशा वाले PDF पृष्ठों को ठीक करें।" },
        protect:      { title: "PDF सुरक्षित करें",  desc: "मजबूत पासवर्ड से PDF एन्क्रिप्ट करें।" },
        unlock:       { title: "PDF अनलॉक करें",     desc: "एन्क्रिप्टेड PDF से पासवर्ड हटाएं।" },
        sign:         { title: "हस्ताक्षर जोड़ें",   desc: "किसी भी दस्तावेज़ में अपनी हस्ताक्षर छवि जोड़ें।" },
        compress:     { title: "PDF संपीड़ित करें",  desc: "गुणवत्ता बनाए रखते हुए फ़ाइल आकार कम करें।" },
        html2pdf:     { title: "HTML से PDF",        desc: "वेब पेज या HTML कोड को PDF में बदलें।" },
        crop:         { title: "PDF क्रॉप करें",     desc: "PDF मार्जिन या विशिष्ट क्षेत्र ट्रिम करें।" },
        repair:       { title: "PDF सुधारें",         desc: "क्षतिग्रस्त PDF फ़ाइलें ठीक करें।" },
        ocr:          { title: "OCR PDF",            desc: "स्कैन किए PDF को संपादन योग्य टेक्स्ट में बदलें।" },
        ppt2pdf:      { title: "PPT से PDF",          desc: "केवल स्लाइड का टेक्स्ट PDF में निकालता है; चित्र और मूल लेआउट सुरक्षित नहीं रहते।" },
        pdf2ppt:      { title: "PDF से PPT",          desc: "PDF पृष्ठों को संपादन योग्य PowerPoint में बदलें।" },
        edit:         { title: "PDF संपादित करें",    desc: "PDF में टेक्स्ट, चित्र और आकार जोड़ें।" },
        redact:       { title: "गोपनीय जानकारी छिपाएं", desc: "PDF से संवेदनशील जानकारी स्थायी रूप से हटाएं।" },
        compare:      { title: "PDF तुलना करें",      desc: "दो PDF संस्करणों के बीच अंतर खोजें।" },
        scantopdf:    { title: "स्कैन करके PDF बनाएं", desc: "कैमरे से कागज़ स्कैन करके PDF बनाएं।" },
        pdf2pdfa:     { title: "PDF मेटाडेटा अपडेट करें", desc: "PDF Creator जानकारी को PDFsHub सेट करता है; यह PDF/A में बदलता या मान्य नहीं करता।" }
    },
    de: {
        merge:        { title: "PDF zusammenführen",  desc: "Mehrere PDFs schnell und sicher im Browser zu einem zusammenführen." },
        split:        { title: "PDF aufteilen",        desc: "PDF-Seiten aufteilen und als ZIP herunterladen." },
        organizepages:{ title: "Seiten verwalten",     desc: "Seiten per Drag & Drop neu anordnen und unerwünschte löschen." },
        jpg2pdf:      { title: "JPG zu PDF",           desc: "Bilddateien (JPG, PNG) in hochwertige PDF-Dokumente umwandeln." },
        pdf2jpg:      { title: "PDF zu JPG",           desc: "PDF-Seiten als hochwertige JPG-Bilder exportieren." },
        word2pdf:     { title: "Word zu PDF",          desc: "Word-DOCX-Dokumente direkt in PDF umwandeln." },
        excel2pdf:    { title: "Excel zu PDF",         desc: "Excel-Tabellen in übersichtliche PDF-Tabellen umwandeln." },
        pdf2word:     { title: "PDF zu Word",          desc: "Text aus PDF extrahieren und in DOC umwandeln." },
        pdf2excel:    { title: "PDF zu Excel",         desc: "PDF-Tabellen in XLSX-Tabellenblätter umwandeln." },
        pagenumbers:  { title: "Seitenzahlen",         desc: "Benutzerdefinierte Seitenzahlen zum PDF hinzufügen." },
        watermark:    { title: "Wasserzeichen",        desc: "Transparenten Sicherheitstext über PDF-Seiten drucken." },
        rotate:       { title: "PDF drehen",           desc: "Falsch ausgerichtete PDF-Seiten korrekt drehen." },
        protect:      { title: "PDF schützen",         desc: "PDF mit einem starken Passwort verschlüsseln." },
        unlock:       { title: "PDF entsperren",       desc: "Passwortschutz aus verschlüsselten PDFs entfernen." },
        sign:         { title: "Unterschrift",         desc: "Persönliches Unterschriftsbild zu einem Dokument hinzufügen." },
        compress:     { title: "PDF komprimieren",     desc: "Dateigröße optimieren bei hoher Bildqualität." },
        html2pdf:     { title: "HTML zu PDF",          desc: "Webseiten oder HTML-Code in PDF umwandeln." },
        crop:         { title: "PDF zuschneiden",      desc: "Ränder oder bestimmte Bereiche eines PDFs trimmen." },
        repair:       { title: "PDF reparieren",       desc: "Beschädigte oder korrupte PDF-Dateien reparieren." },
        ocr:          { title: "OCR PDF",              desc: "Gescannte PDFs und Bilder in bearbeitbaren Text umwandeln." },
        ppt2pdf:      { title: "PPT zu PDF",           desc: "Extrahiert nur Folientext; Bilder und ursprüngliches Layout bleiben nicht erhalten." },
        pdf2ppt:      { title: "PDF zu PPT",           desc: "PDF-Seiten in bearbeitbare PowerPoint-Folien umwandeln." },
        edit:         { title: "PDF bearbeiten",       desc: "Text, Zeichnungen und Bilder zum PDF hinzufügen." },
        redact:       { title: "PDF schwärzen",        desc: "Sensible Informationen dauerhaft aus PDF entfernen." },
        compare:      { title: "PDFs vergleichen",     desc: "Textunterschiede zwischen zwei PDF-Versionen finden." },
        scantopdf:    { title: "Scannen zu PDF",       desc: "Mit der Kamera Papierdokumente scannen und als PDF speichern." },
        pdf2pdfa:     { title: "PDF-Metadaten aktualisieren", desc: "Setzt den PDF-Creator auf PDFsHub; es erfolgt keine PDF/A-Konvertierung oder Validierung." }
    }
};

const i18n = {
    tr: {
        hero_title: "PDF'lerinizi Kolayca Düzenleyin",
        hero_p: "Tamamen tarayıcınızda çalışan, ultra hızlı ve %100 gizli PDF araçları.",
        back: "Geri Dön",
        drop_h3: "Dosyaları buraya sürükleyin",
        drop_p: "veya",
        select_btn: "Bilgisayardan Seç",
        action_btn: "İşlemi Başlat",
        success_h3: "İşlem Tamamlandı!",
        success_p: "Dosyanız hazır.",
        download: "İndir",
        home: "Ana Sayfa",
        nav_merge: "Birleştir",
        nav_organize: "Sayfa Düzenle",
        nav_edit: "Düzenle",
        nav_protect: "Şifrele",
        addText: "Metin Ekle",
        addImage: "Resim Ekle",
        addShape: "Şekil Ekle",
        textColor: "Metin Rengi",
        fillColor: "Dolgu Rengi",
        fontSize: "Font Boyutu",
        fontWeight: "Font Kalınlığı",
        delete: "Sil",
        copy: "Kopyala",
        pages: "Sayfalar",
        page: "Sayfa",
        normal: "Normal",
        bold: "Kalın",
        rectangle: "Kutucuk",
        circle: "Daire",
        line: "Çizgi",
        arrow: "Ok",
        reuse: "Yeniden Kullan",
        transparent: "Şeffaf / Dolgu Yok"
    },
    en: {
        hero_title: "Organize & Edit your PDFs Easily",
        hero_p: "Ultra-fast and 100% private PDF tools that run entirely in your browser.",
        back: "Go Back",
        drop_h3: "Drag and drop files here",
        drop_p: "or",
        select_btn: "Choose from Computer",
        action_btn: "Start Processing",
        success_h3: "Process Completed!",
        success_p: "Your file is ready.",
        download: "Download",
        home: "Home",
        nav_merge: "Merge",
        nav_organize: "Organize",
        nav_edit: "Edit",
        nav_protect: "Protect",
        addText: "Add Text",
        addImage: "Add Image",
        addShape: "Add Shape",
        textColor: "Text Color",
        fillColor: "Fill Color",
        fontSize: "Font Size",
        fontWeight: "Font Weight",
        delete: "Delete",
        copy: "Copy",
        pages: "Pages",
        page: "Page",
        normal: "Normal",
        bold: "Bold",
        rectangle: "Rectangle",
        circle: "Circle",
        line: "Line",
        arrow: "Arrow",
        reuse: "Use Again",
        transparent: "Transparent (No Fill)"
    },
    ja: {
        hero_title: "PDFを簡単かつ安全に編集",
        hero_p: "ブラウザで完全に動作する高速で100%プライベートなPDFツール。",
        back: "戻る",
        drop_h3: "ファイルをここにドラッグ",
        drop_p: "または",
        select_btn: "コンピューターから選択",
        action_btn: "処理開始",
        success_h3: "処理完了！",
        success_p: "ファイルが準備できました。",
        download: "ダウンロード",
        home: "ホーム",
        nav_merge: "マージ",
        nav_organize: "ページ整理",
        nav_edit: "編集",
        nav_protect: "保護",
        addText: "テキスト追加",
        addImage: "画像追加",
        addShape: "図形追加",
        textColor: "テキスト色",
        fillColor: "塗りつぶし色",
        fontSize: "フォントサイズ",
        fontWeight: "フォントの太さ",
        delete: "削除",
        copy: "コピー",
        pages: "ページ",
        page: "ページ",
        normal: "標準",
        bold: "太字",
        rectangle: "四角形",
        circle: "円",
        line: "直線",
        arrow: "矢印",
        reuse: "再使用",
        transparent: "透明（塗りなし）"
    },
    hi: {
        hero_title: "अपने PDFs को आसानी से संपादित करें",
        hero_p: "आपके ब्राउज़र में पूरी तरह से चलने वाले तेज़ और 100% निजी PDF उपकरण।",
        back: "वापस",
        drop_h3: "यहाँ फ़ाइलें खींचें",
        drop_p: "या",
        select_btn: "कंप्यूटर से चुनें",
        action_btn: "प्रक्रिया शुरू करें",
        success_h3: "प्रक्रिया पूरी हुई!",
        success_p: "आपकी फ़ाइल तैयार है।",
        download: "डाउनलोड करें",
        home: "मुखपृष्ठ",
        nav_merge: "मर्ज करें",
        nav_organize: "पृष्ठ व्यवस्था करें",
        nav_edit: "संपादित करें",
        nav_protect: "सुरक्षित करें",
        addText: "टेक्स्ट जोड़ें",
        addImage: "छवि जोड़ें",
        addShape: "आकार जोड़ें",
        textColor: "पाठ रंग",
        fillColor: "भरण रंग",
        fontSize: "फ़ॉन्ट आकार",
        fontWeight: "फ़ॉन्ट वजन",
        delete: "हटाएं",
        copy: "कॉपी करें",
        pages: "पृष्ठ",
        page: "पृष्ठ",
        normal: "सामान्य",
        bold: "बोल्ड",
        rectangle: "आयत",
        circle: "वृत्त",
        line: "पंक्ति",
        arrow: "तीर",
        reuse: "पुनः उपयोग",
        transparent: "पारदर्शी (कोई भरण नहीं)"
    },
    de: {
        hero_title: "Bearbeiten Sie Ihre PDFs ganz einfach",
        hero_p: "Schnelle und 100% private PDF-Tools, die vollständig in Ihrem Browser ausgeführt werden.",
        back: "Zurück",
        drop_h3: "Dateien hierher ziehen",
        drop_p: "oder",
        select_btn: "Vom Computer auswählen",
        action_btn: "Verarbeitung starten",
        success_h3: "Verarbeitung abgeschlossen!",
        success_p: "Ihre Datei ist bereit.",
        download: "Herunterladen",
        home: "Startseite",
        nav_merge: "Zusammenführen",
        nav_organize: "Seiten verwalten",
        nav_edit: "Bearbeiten",
        nav_protect: "Schützen",
        addText: "Text hinzufügen",
        addImage: "Bild hinzufügen",
        addShape: "Form hinzufügen",
        textColor: "Textfarbe",
        fillColor: "Füllfarbe",
        fontSize: "Schriftgröße",
        fontWeight: "Schriftstärke",
        delete: "Löschen",
        copy: "Kopieren",
        pages: "Seiten",
        page: "Seite",
        normal: "Normal",
        bold: "Fett",
        rectangle: "Rechteck",
        circle: "Kreis",
        line: "Linie",
        arrow: "Pfeil",
        reuse: "Erneut verwenden",
        transparent: "Transparent (Ohne Füllung)"
    }
};

// UI element translations keyed by element ID
const uiI18n = {
    tr: {
        'merge-info-text':'Dosyaları sürükleyerek sıralarını değiştirebilirsiniz.',
        'protect-pwd-label':'Yeni Şifre:','unlock-pwd-label':'PDF Şifresi:',
        'sign-img-label':'İmza Resminizi Yükleyin (PNG/JPG):',
        'sign-img-info':'İmza, belgenin ilk sayfasının sağ alt köşesine eklenecektir.',
        'jpg2pdf-orient-label':'Sayfa Yönü:',
        'watermark-text-label':'Filigran Metni:',
        'watermark-warning-text':'* Lütfen Türkçe karakter (İ, ğ, ş, vs.) KULLANMAYIN.',
        'rotate-dir-label':'Döndürme Yönü:','pagenum-pos-label':'Numara Konumu:',
        'organize-info-text':'Sayfaların yerini <strong>sürükleyerek</strong> değiştirin. Silmek istediğiniz sayfaların <strong>işaretini kaldırın</strong>.',
        'organize-loading-text':'Sayfalar oluşturuluyor, lütfen bekleyin...',
        'organize-select-all-btn':'Hepsini Seç',
        'compress-level-label':'Sıkıştırma Seviyesi:',
        'html2pdf-url-label':'Web Sayfası URL veya HTML Kodu:',
        'html2pdf-info-text':'HTML kodu girmek en güvenli yöntemdir.',
        'compare-info-text':'Lütfen iki PDF dosyası yükleyin.',
        'redact-info-text':'Aşağıdaki sayfa önizlemelerinde <strong>mouse ile sürükleyerek</strong> gizlemek istediğiniz alanları seçin.',
        'redact-loading-text':'Sayfa önizlemeleri oluşturuluyor...',
        'redact-clear-btn':'<i class="fa-solid fa-trash"></i> Tüm Seçimleri Temizle',
        'split-info-text':'Ayırmak istediğiniz sayfaları seçin. Seçilmemiş sayfalar ayıklanmayacak.',
        'split-loading-text':'Sayfalar oluşturuluyor, lütfen bekleyin...',
        'split-select-all-text':'Hepsini Seç','split-deselect-all-text':'Hiçbirini Seçme',
        'word2pdf-info-text':'.docx dosyalarını destekler. Dosyanız otomatik olarak PDF\'e dönüştürülecektir.',
        'ppt2pdf-info-text':'Yalnızca slayt metinleri aktarılır; görseller ve özgün tasarım korunmaz.',
        'pdf2ppt-info-text':'PDF\'in her sayfası ayrı bir PowerPoint slaydına dönüştürülecektir.',
        'crop-mode-label':'Kırpma Modu:','crop-manual-text':'Manuel (mm)','crop-visual-text':'Görsel Kırpma',
        'crop-manual-info':'Kesilecek kenar boşluklarını milimetre (mm) cinsinden girin. 0 = değişiklik yok.',
        'crop-visual-info':'Kırpmak istediğiniz alanı mouse ile sürükleyerek seçin.',
        'crop-top-label':'Üst (mm):','crop-bottom-label':'Alt (mm):','crop-left-label':'Sol (mm):','crop-right-label':'Sağ (mm):',
        'loading-overlay-text':'Güvenli modüller ve kütüphaneler yükleniyor...',
        'pen-color-label':'Renk','pen-width-label':'Kalınlık','pen-opacity-label':'Opaklık',
        'lbl-stroke':'Dış Hat','lbl-fill':'İç Dolgu','lbl-text-color':'Metin','lbl-strokew':'Hat','lbl-fontsize':'Boyut','lbl-fontstyle':'Kalınlık','lbl-fontfamily':'Font',
        'edit-shape-rect-label':'Kutucuk / Dikdörtgen','edit-shape-circle-label':'Daire','edit-shape-ellipse-label':'Elips','edit-shape-triangle-label':'Üçgen','edit-shape-line-label':'Çizgi','edit-shape-arrow-label':'Ok',
        'edit-fw-normal':'Normal','edit-fw-bold':'Kalın (Bold)',
        'edit-save-label':'İndir',
        'sig-modal-title':'İmza Ekle',
        'sig-tab-type-btn':'✏️ Yaz','sig-tab-draw-btn':'🖊️ Çiz','sig-tab-upload-btn':'📁 Yükle',
        'sig-draw-color-label':'Renk:','sig-clear-btn':'Temizle','sig-cancel-btn':'İptal','sig-apply-btn':'PDF\'e Ekle',
        'scan-or-upload-text':'veya doğrudan kameranızla çekilmiş bir fotoğraf yükleyin:',
        'start-camera-btn':'<i class="fa-solid fa-video"></i> Kamerayı Başlat',
        'capture-btn':'<i class="fa-solid fa-camera"></i> Fotoğraf Çek',
        'stop-camera-btn':'<i class="fa-solid fa-video-slash"></i> Kamerayı Kapat',
        'scan-take-upload-btn':'<i class="fa-solid fa-mobile-screen-button"></i> Fotoğraf Çek / Yükle',
        'faq-section-title':'Neden PDFsHub?','faq-section-sub':'Sıkça Sorulan Sorular',
        'feature1-title':'%100 Gizlilik ve Güvenlik','feature1-desc':'Dosyalarınız hiçbir sunucuya yüklenmez. Tüm işlemler doğrudan tarayıcınızda gerçekleştirilir. Verileriniz tamamen sizde kalır.',
        'feature2-title':'Ultra Hızlı Performans','feature2-desc':'Veri transferi olmadan, WebAssembly teknolojisi sayesinde büyük PDF belgelerini bile milisaniyeler içinde işleyin.',
        'feature3-title':'Tamamen Ücretsiz','feature3-desc':'Üyelik, abonelik ya da limit olmaksızın tüm araçları sınırsız kullanın. Reklamsız ve temiz bir deneyim.',
        'faq1-q':'Dosyalarım çalınabilir mi? Sitede veri saklanıyor mu?','faq1-a':'Kesinlikle hayır. PDFsHub, tamamen istemci taraflı çalışır. Dosyalarınız hiçbir sunucuya gönderilmez, işlenmez veya kaydedilmez.',
        'faq2-q':'PDF Karşılaştırma aracı nasıl çalışıyor?','faq2-a':'İki PDF yüklediğinizde, tarayıcınızda metin çıkarılır ve gelişmiş diff algoritması ile farklar renklendirilerek gösterilir.',
        'faq3-q':'Mobil cihazlarda kamera ile tarama yapabilir miyim?','faq3-a':'Evet! Tarat ve PDF Yap aracı ile doğrudan kameranızı kullanarak belgeleri tarayıp anında PDF oluşturabilirsiniz.',
        'footer-tagline':'Tarayıcınızda çalışan, %100 gizli ve ücretsiz PDF araçları.',
        'footer-tools-title':'Temel Araçlar',
        'footer-convert-title':'Dönüştürme',
        'footer-legal-title':'Yasal',
        'footer-link-privacy':'Gizlilik Politikası',
        'footer-copy':'&copy; 2026 PDFsHub &mdash; Tüm hakları saklıdır. &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--primary);">Gizlilik Politikası</a>',
        '_sel_jpg2pdf':['Dikey (A4)','Yatay (A4)'],
        '_sel_rotate':['Sağa 90°','180° Ters','Sola 90° (270°)'],
        '_sel_pagenum':['Sağ Alt Köşe','Orta Alt','Sağ Üst Köşe'],
        '_sel_compress':['Ekstrem Sıkıştırma (Düşük Kalite)','Önerilen Sıkıştırma (İyi Kalite)','Az Sıkıştırma (Yüksek Kalite)'],
        '_sel_ocr':['Türkçe','İngilizce'],
        '_feedback_title':'Deneyiminiz Nasıldı?'
    },
    en: {
        'merge-info-text':'You can reorder files by dragging them.',
        'protect-pwd-label':'New Password:','unlock-pwd-label':'PDF Password:',
        'sign-img-label':'Upload Your Signature Image (PNG/JPG):',
        'sign-img-info':'The signature will be placed in the bottom-right corner of the first page.',
        'jpg2pdf-orient-label':'Page Orientation:',
        'watermark-text-label':'Watermark Text:',
        'watermark-warning-text':'* Avoid special characters.',
        'rotate-dir-label':'Rotation Direction:','pagenum-pos-label':'Number Position:',
        'organize-info-text':'<strong>Drag</strong> pages to reorder. <strong>Uncheck</strong> pages to delete.',
        'organize-loading-text':'Generating pages, please wait...',
        'organize-select-all-btn':'Select All',
        'compress-level-label':'Compression Level:',
        'html2pdf-url-label':'Web Page URL or HTML Code:',
        'html2pdf-info-text':'Entering HTML code is the most reliable method.',
        'compare-info-text':'Please upload two PDF files.',
        'redact-info-text':'<strong>Drag</strong> on the page previews below to select areas to redact.',
        'redact-loading-text':'Generating page previews...',
        'redact-clear-btn':'<i class="fa-solid fa-trash"></i> Clear All Selections',
        'split-info-text':'Select pages to extract. Unselected pages will not be included.',
        'split-loading-text':'Generating pages, please wait...',
        'split-select-all-text':'Select All','split-deselect-all-text':'Deselect All',
        'word2pdf-info-text':'Supports .docx files only. Will be automatically converted to PDF.',
        'ppt2pdf-info-text':'Only slide text is extracted; images, layout, and original formatting are not preserved.',
        'pdf2ppt-info-text':'Each PDF page will be converted to a separate PowerPoint slide.',
        'crop-mode-label':'Crop Mode:','crop-manual-text':'Manual (mm)','crop-visual-text':'Visual Crop',
        'crop-manual-info':'Enter crop margins in millimeters (mm). 0 = no change.',
        'crop-visual-info':'Drag to select the area to keep.',
        'crop-top-label':'Top (mm):','crop-bottom-label':'Bottom (mm):','crop-left-label':'Left (mm):','crop-right-label':'Right (mm):',
        'loading-overlay-text':'Loading secure browser modules...',
        'pen-color-label':'Color','pen-width-label':'Width','pen-opacity-label':'Opacity',
        'lbl-stroke':'Stroke','lbl-fill':'Fill','lbl-text-color':'Text','lbl-strokew':'Width','lbl-fontsize':'Size','lbl-fontstyle':'Weight','lbl-fontfamily':'Font',
        'edit-shape-rect-label':'Rectangle / Box','edit-shape-circle-label':'Circle','edit-shape-ellipse-label':'Ellipse','edit-shape-triangle-label':'Triangle','edit-shape-line-label':'Line','edit-shape-arrow-label':'Arrow',
        'edit-fw-normal':'Normal','edit-fw-bold':'Bold',
        'edit-save-label':'Download',
        'sig-modal-title':'Add Signature',
        'sig-tab-type-btn':'✏️ Type','sig-tab-draw-btn':'🖊️ Draw','sig-tab-upload-btn':'📁 Upload',
        'sig-draw-color-label':'Color:','sig-clear-btn':'Clear','sig-cancel-btn':'Cancel','sig-apply-btn':'Add to PDF',
        'scan-or-upload-text':'or upload a document photo directly from your device:',
        'start-camera-btn':'<i class="fa-solid fa-video"></i> Start Camera',
        'capture-btn':'<i class="fa-solid fa-camera"></i> Capture Photo',
        'stop-camera-btn':'<i class="fa-solid fa-video-slash"></i> Close Camera',
        'scan-take-upload-btn':'<i class="fa-solid fa-mobile-screen-button"></i> Take / Upload Photo',
        'faq-section-title':'Why PDFsHub?','faq-section-sub':'Frequently Asked Questions',
        'feature1-title':'100% Privacy & Security','feature1-desc':'Your files are never uploaded to any server. All operations run in your browser. Your data stays with you.',
        'feature2-title':'Ultra Fast Performance','feature2-desc':'Process even large PDFs in milliseconds with WebAssembly technology — no data transfer needed.',
        'feature3-title':'Completely Free','feature3-desc':'Use all tools without limits, subscriptions, or registration. Clean and ad-free.',
        'faq1-q':'Can my files be stolen? Is data stored?','faq1-a':'Absolutely not. PDFsHub runs entirely client-side. Your files are never sent to any server.',
        'faq2-q':'How does PDF Compare work?','faq2-a':'Text is extracted in your browser and differences are highlighted using a diff algorithm.',
        'faq3-q':'Can I scan with my camera on mobile?','faq3-a':'Yes! The Scan to PDF tool lets you scan documents with your camera and create PDFs instantly.',
        'footer-tagline':'100% private and free PDF tools running directly in your browser.',
        'footer-tools-title':'Essential Tools',
        'footer-convert-title':'Convert Tools',
        'footer-legal-title':'Legal',
        'footer-link-privacy':'Privacy Policy',
        'footer-copy':'&copy; 2026 PDFsHub &mdash; All rights reserved. &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--primary);">Privacy Policy</a>',
        '_sel_jpg2pdf':['Portrait (A4)','Landscape (A4)'],
        '_sel_rotate':['Rotate Right 90°','180° Flip','Rotate Left 90°'],
        '_sel_pagenum':['Bottom Right','Bottom Center','Top Right'],
        '_sel_compress':['Extreme Compression (Low Quality)','Recommended (Good Quality)','Light Compression (High Quality)'],
        '_sel_ocr':['Turkish','English'],
        '_feedback_title':'How was your experience?'
    },
    ja: {
        'merge-info-text':'ドラッグしてファイルを並べ替えられます。',
        'protect-pwd-label':'新しいパスワード:','unlock-pwd-label':'PDFパスワード:',
        'sign-img-label':'署名画像をアップロード (PNG/JPG):',
        'sign-img-info':'署名は最初のページの右下に配置されます。',
        'jpg2pdf-orient-label':'ページの向き:',
        'watermark-text-label':'透かしテキスト:',
        'watermark-warning-text':'* 特殊文字は避けてください。',
        'rotate-dir-label':'回転方向:','pagenum-pos-label':'ページ番号の位置:',
        'organize-info-text':'ページを<strong>ドラッグ</strong>して並べ替え。削除は<strong>チェックを外す</strong>。',
        'organize-loading-text':'ページを生成中...','organize-select-all-btn':'すべて選択',
        'compress-level-label':'圧縮レベル:',
        'html2pdf-url-label':'WebページURLまたはHTMLコード:',
        'html2pdf-info-text':'HTMLコードを入力するのが最も確実な方法です。',
        'compare-info-text':'2つのPDFファイルをアップロードしてください。',
        'redact-info-text':'ページプレビュー上で<strong>ドラッグ</strong>して隠したい領域を選択。',
        'redact-loading-text':'ページプレビューを生成中...',
        'redact-clear-btn':'<i class="fa-solid fa-trash"></i> すべてクリア',
        'split-info-text':'抽出するページを選択。未選択ページは含まれません。',
        'split-loading-text':'ページを生成中...','split-select-all-text':'すべて選択','split-deselect-all-text':'すべて解除',
        'word2pdf-info-text':'.docxをサポート。自動的にPDFに変換されます。',
        'ppt2pdf-info-text':'スライドのテキストのみ抽出し、画像や元のレイアウトは保持されません。',
        'pdf2ppt-info-text':'各PDFページが個別のPowerPointスライドに変換されます。',
        'crop-mode-label':'クロップモード:','crop-manual-text':'手動 (mm)','crop-visual-text':'ビジュアル',
        'crop-manual-info':'mm単位でマージンを入力。0 = 変更なし。',
        'crop-visual-info':'保持する領域をドラッグして選択。',
        'crop-top-label':'上 (mm):','crop-bottom-label':'下 (mm):','crop-left-label':'左 (mm):','crop-right-label':'右 (mm):',
        'loading-overlay-text':'モジュールを読み込み中...',
        'pen-color-label':'色','pen-width-label':'太さ','pen-opacity-label':'不透明度',
        'lbl-stroke':'線','lbl-fill':'塗り','lbl-text-color':'文字','lbl-strokew':'線幅','lbl-fontsize':'サイズ','lbl-fontstyle':'太さ','lbl-fontfamily':'フォント',
        'edit-shape-rect-label':'四角形 / ボックス','edit-shape-circle-label':'円','edit-shape-ellipse-label':'楕円','edit-shape-triangle-label':'三角形','edit-shape-line-label':'直線','edit-shape-arrow-label':'矢印',
        'edit-fw-normal':'標準','edit-fw-bold':'太字',
        'edit-save-label':'ダウンロード',
        'sig-modal-title':'署名を追加',
        'sig-tab-type-btn':'✏️ 入力','sig-tab-draw-btn':'🖊️ 手書き','sig-tab-upload-btn':'📁 アップロード',
        'sig-draw-color-label':'色:','sig-clear-btn':'クリア','sig-cancel-btn':'キャンセル','sig-apply-btn':'PDFに追加',
        'scan-or-upload-text':'またはカメラで撮影した写真を直接アップロード:',
        'start-camera-btn':'<i class="fa-solid fa-video"></i> カメラを起動',
        'capture-btn':'<i class="fa-solid fa-camera"></i> 写真を撮影',
        'stop-camera-btn':'<i class="fa-solid fa-video-slash"></i> カメラを停止',
        'scan-take-upload-btn':'<i class="fa-solid fa-mobile-screen-button"></i> 撮影 / 写真アップロード',
        'faq-section-title':'なぜPDFsHub?','faq-section-sub':'よくある質問',
        'feature1-title':'100%プライバシー','feature1-desc':'ファイルはサーバーに送信されません。すべての処理はブラウザ内で行われます。',
        'feature2-title':'超高速','feature2-desc':'WebAssemblyでデータ転送なく大きなPDFもミリ秒で処理。',
        'feature3-title':'完全無料','feature3-desc':'登録・制限なしで全ツール使い放題。広告なし。',
        'faq1-q':'ファイルが盗まれる可能性は?','faq1-a':'ありません。ファイルはサーバーに送信されません。',
        'faq2-q':'PDF比較はどう機能しますか?','faq2-a':'ブラウザでテキストを抽出し差異をハイライト表示します。',
        'faq3-q':'モバイルでカメラスキャンできますか?','faq3-a':'はい！スキャンしてPDF化ツールで可能です。',
        'footer-tagline':'ブラウザで完全に動作する、100%プライベートで無料のPDFツール。',
        'footer-tools-title':'基本ツール',
        'footer-convert-title':'変換ツール',
        'footer-legal-title':'法的情報',
        'footer-link-privacy':'プライバシーポリシー',
        'footer-copy':'&copy; 2026 PDFsHub &mdash; 全著作権所有。 &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--primary);">プライバシーポリシー</a>',
        '_sel_jpg2pdf':['縦 (A4)','横 (A4)'],
        '_sel_rotate':['右90°','180°','左90°'],
        '_sel_pagenum':['右下','下中央','右上'],
        '_sel_compress':['最大圧縮（低品質）','推奨（良好）','軽圧縮（高品質）'],
        '_sel_ocr':['トルコ語','英語'],
        '_feedback_title':'ご体験はいかがでしたか？'
    },
    hi: {
        'merge-info-text':'फ़ाइलें खींचकर क्रम बदलें।',
        'protect-pwd-label':'नया पासवर्ड:','unlock-pwd-label':'PDF पासवर्ड:',
        'sign-img-label':'हस्ताक्षर छवि अपलोड करें (PNG/JPG):',
        'sign-img-info':'हस्ताक्षर पहले पृष्ठ के दाएं नीचे रखा जाएगा।',
        'jpg2pdf-orient-label':'पृष्ठ अभिविन्यास:',
        'watermark-text-label':'वॉटरमार्क पाठ:',
        'watermark-warning-text':'* विशेष वर्ण न उपयोग करें।',
        'rotate-dir-label':'घुमाने की दिशा:','pagenum-pos-label':'नंबर स्थिति:',
        'organize-info-text':'पृष्ठ <strong>खींचकर</strong> पुनर्व्यवस्थित करें। हटाने के लिए <strong>अनचेक करें</strong>।',
        'organize-loading-text':'पृष्ठ बना रहे हैं...','organize-select-all-btn':'सभी चुनें',
        'compress-level-label':'संपीड़न स्तर:',
        'html2pdf-url-label':'URL या HTML कोड:',
        'html2pdf-info-text':'HTML कोड दर्ज करना सबसे विश्वसनीय है।',
        'compare-info-text':'कृपया दो PDF अपलोड करें।',
        'redact-info-text':'छिपाने के लिए पूर्वावलोकन पर <strong>खींचें</strong>।',
        'redact-loading-text':'पूर्वावलोकन बना रहे हैं...',
        'redact-clear-btn':'<i class="fa-solid fa-trash"></i> सभी साफ़ करें',
        'split-info-text':'निकालने के लिए पृष्ठ चुनें।',
        'split-loading-text':'पृष्ठ बना रहे हैं...','split-select-all-text':'सभी चुनें','split-deselect-all-text':'सभी हटाएं',
        'word2pdf-info-text':'.docx फ़ाइलें समर्थित हैं। स्वचालित रूप से PDF में बदलेगा।',
        'ppt2pdf-info-text':'केवल स्लाइड का टेक्स्ट निकलेगा; चित्र और मूल लेआउट सुरक्षित नहीं रहेंगे।',
        'pdf2ppt-info-text':'प्रत्येक PDF पृष्ठ अलग स्लाइड बनेगा।',
        'crop-mode-label':'क्रॉप मोड:','crop-manual-text':'मैनुअल (mm)','crop-visual-text':'विज़ुअल',
        'crop-manual-info':'mm में मार्जिन दर्ज करें। 0 = कोई परिवर्तन नहीं।',
        'crop-visual-info':'रखने के लिए क्षेत्र खींचें।',
        'crop-top-label':'ऊपर (mm):','crop-bottom-label':'नीचे (mm):','crop-left-label':'बाएं (mm):','crop-right-label':'दाएं (mm):',
        'loading-overlay-text':'मॉड्यूल लोड हो रहे हैं...',
        'pen-color-label':'रंग','pen-width-label':'मोटाई','pen-opacity-label':'अपारदर्शिता',
        'lbl-stroke':'स्ट्रोक','lbl-fill':'भरण','lbl-text-color':'पाठ','lbl-strokew':'चौड़ाई','lbl-fontsize':'आकार','lbl-fontstyle':'वजन','lbl-fontfamily':'फ़ॉन्ट',
        'edit-shape-rect-label':'आयत / बॉक्स','edit-shape-circle-label':'वृत्त','edit-shape-ellipse-label':'दीर्घवृत्त','edit-shape-triangle-label':'त्रिभुज','edit-shape-line-label':'पंक्ति','edit-shape-arrow-label':'तीर',
        'edit-fw-normal':'सामान्य','edit-fw-bold':'बोल्ड',
        'edit-save-label':'डाउनलोड करें',
        'sig-modal-title':'हस्ताक्षर जोड़ें',
        'sig-tab-type-btn':'✏️ लिखें','sig-tab-draw-btn':'🖊️ बनाएं','sig-tab-upload-btn':'📁 अपलोड',
        'sig-draw-color-label':'रंग:','sig-clear-btn':'साफ़ करें','sig-cancel-btn':'रद्द करें','sig-apply-btn':'PDF में जोड़ें',
        'scan-or-upload-text':'या सीधे कैमरे से फोटो अपलोड करें:',
        'start-camera-btn':'<i class="fa-solid fa-video"></i> कैमरा शुरू करें',
        'capture-btn':'<i class="fa-solid fa-camera"></i> फोटो खींचें',
        'stop-camera-btn':'<i class="fa-solid fa-video-slash"></i> कैमरा बंद करें',
        'scan-take-upload-btn':'<i class="fa-solid fa-mobile-screen-button"></i> फोटो लें / अपलोड करें',
        'faq-section-title':'PDFsHub क्यों?','faq-section-sub':'अक्सर पूछे जाने वाले प्रश्न',
        'feature1-title':'100% गोपनीयता','feature1-desc':'फ़ाइलें सर्वर पर नहीं जातीं। ब्राउज़र में सब होता है।',
        'feature2-title':'अल्ट्रा फास्ट','feature2-desc':'WebAssembly से बिना ट्रांसफर के मिलीसेकंड में प्रोसेस।',
        'feature3-title':'पूरी तरह मुफ़्त','feature3-desc':'बिना सदस्यता, बिना सीमा। विज्ञापन-मुक्त।',
        'faq1-q':'क्या फ़ाइलें चोरी हो सकती हैं?','faq1-a':'नहीं। फ़ाइलें कभी सर्वर नहीं भेजी जातीं।',
        'faq2-q':'PDF तुलना कैसे काम करता है?','faq2-a':'ब्राउज़र में टेक्स्ट निकाला जाता है और अंतर हाइलाइट होते हैं।',
        'faq3-q':'मोबाइल पर कैमरा स्कैन?','faq3-a':'हां! स्कैन टू PDF टूल से सीधे कैमरे से स्कैन करें।',
        'footer-tagline':'सीधे आपके ब्राउज़र में चलने वाले 100% निजी और मुफ़्त PDF उपकरण।',
        'footer-tools-title':'मुख्य उपकरण',
        'footer-convert-title':'परिवर्तन उपकरण',
        'footer-legal-title':'कानूनी',
        'footer-link-privacy':'गोपनीयता नीति',
        'footer-copy':'&copy; 2026 PDFsHub &mdash; सर्वाधिकार सुरक्षित। &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--primary);">गोपनीयता नीति</a>',
        '_sel_jpg2pdf':['पोर्ट्रेट (A4)','लैंडस्केप (A4)'],
        '_sel_rotate':['दाएं 90°','180°','बाएं 90°'],
        '_sel_pagenum':['दाएं नीचे','नीचे मध्य','दाएं ऊपर'],
        '_sel_compress':['अधिकतम (कम गुणवत्ता)','अनुशंसित (अच्छी गुणवत्ता)','हल्का (उच्च गुणवत्ता)'],
        '_sel_ocr':['तुर्की','अंग्रेज़ी'],
        '_feedback_title':'आपका अनुभव कैसा था?'
    },
    de: {
        'merge-info-text':'Dateien durch Ziehen neu anordnen.',
        'protect-pwd-label':'Neues Passwort:','unlock-pwd-label':'PDF-Passwort:',
        'sign-img-label':'Unterschriftsbild hochladen (PNG/JPG):',
        'sign-img-info':'Die Unterschrift wird unten rechts auf der ersten Seite platziert.',
        'jpg2pdf-orient-label':'Seitenausrichtung:',
        'watermark-text-label':'Wasserzeichentext:',
        'watermark-warning-text':'* Keine Sonderzeichen verwenden.',
        'rotate-dir-label':'Drehrichtung:','pagenum-pos-label':'Nummerposition:',
        'organize-info-text':'Seiten durch <strong>Ziehen</strong> neu anordnen. <strong>Deaktivieren</strong> zum Löschen.',
        'organize-loading-text':'Seiten werden erstellt...','organize-select-all-btn':'Alle auswählen',
        'compress-level-label':'Komprimierungsstufe:',
        'html2pdf-url-label':'Webseiten-URL oder HTML-Code:',
        'html2pdf-info-text':'HTML-Code eingeben ist die zuverlässigste Methode.',
        'compare-info-text':'Bitte zwei PDF-Dateien hochladen.',
        'redact-info-text':'Auf den Seitenvorschauen <strong>ziehen</strong> um zu schwärzende Bereiche zu wählen.',
        'redact-loading-text':'Seitenvorschauen werden erstellt...',
        'redact-clear-btn':'<i class="fa-solid fa-trash"></i> Alle löschen',
        'split-info-text':'Zu extrahierende Seiten auswählen.',
        'split-loading-text':'Seiten werden erstellt...','split-select-all-text':'Alle auswählen','split-deselect-all-text':'Alle abwählen',
        'word2pdf-info-text':'.docx wird unterstützt. Automatisch in PDF konvertiert.',
        'ppt2pdf-info-text':'Nur Folientext wird extrahiert; Bilder und ursprüngliches Layout bleiben nicht erhalten.',
        'pdf2ppt-info-text':'Jede PDF-Seite wird in eine eigene PowerPoint-Folie konvertiert.',
        'crop-mode-label':'Zuschneidemodus:','crop-manual-text':'Manuell (mm)','crop-visual-text':'Visuell',
        'crop-manual-info':'Ränder in mm eingeben. 0 = keine Änderung.',
        'crop-visual-info':'Bereich durch Ziehen auswählen.',
        'crop-top-label':'Oben (mm):','crop-bottom-label':'Unten (mm):','crop-left-label':'Links (mm):','crop-right-label':'Rechts (mm):',
        'loading-overlay-text':'Module werden geladen...',
        'pen-color-label':'Farbe','pen-width-label':'Stärke','pen-opacity-label':'Deckkraft',
        'lbl-stroke':'Kontur','lbl-fill':'Füllung','lbl-text-color':'Text','lbl-strokew':'Stärke','lbl-fontsize':'Größe','lbl-fontstyle':'Stärke','lbl-fontfamily':'Schriftart',
        'edit-shape-rect-label':'Rechteck / Kasten','edit-shape-circle-label':'Kreis','edit-shape-ellipse-label':'Ellipse','edit-shape-triangle-label':'Dreieck','edit-shape-line-label':'Linie','edit-shape-arrow-label':'Pfeil',
        'edit-fw-normal':'Normal','edit-fw-bold':'Fett',
        'edit-save-label':'Herunterladen',
        'sig-modal-title':'Unterschrift hinzufügen',
        'sig-tab-type-btn':'✏️ Schreiben','sig-tab-draw-btn':'🖊️ Zeichnen','sig-tab-upload-btn':'📁 Hochladen',
        'sig-draw-color-label':'Farbe:','sig-clear-btn':'Löschen','sig-cancel-btn':'Abbrechen','sig-apply-btn':'Zu PDF hinzufügen',
        'scan-or-upload-text':'oder Dokumentfoto direkt hochladen:',
        'start-camera-btn':'<i class="fa-solid fa-video"></i> Kamera starten',
        'capture-btn':'<i class="fa-solid fa-camera"></i> Foto aufnehmen',
        'stop-camera-btn':'<i class="fa-solid fa-video-slash"></i> Kamera schließen',
        'scan-take-upload-btn':'<i class="fa-solid fa-mobile-screen-button"></i> Foto aufnehmen / hochladen',
        'faq-section-title':'Warum PDFsHub?','faq-section-sub':'Häufig gestellte Fragen',
        'feature1-title':'100% Datenschutz','feature1-desc':'Ihre Dateien werden nie hochgeladen. Alles läuft im Browser.',
        'feature2-title':'Ultra schnell','feature2-desc':'WebAssembly verarbeitet PDFs in Millisekunden ohne Datenübertragung.',
        'feature3-title':'Komplett kostenlos','feature3-desc':'Alle Tools ohne Limit oder Anmeldung. Werbefrei.',
        'faq1-q':'Können Dateien gestohlen werden?','faq1-a':'Nein. Dateien werden nie an Server gesendet.',
        'faq2-q':'Wie funktioniert PDF-Vergleich?','faq2-a':'Text wird im Browser extrahiert und Unterschiede hervorgehoben.',
        'faq3-q':'Kamera-Scan auf Mobilgeräten?','faq3-a':'Ja! Mit dem Scan-zu-PDF-Tool direkt mit der Kamera scannen.',
        'footer-tagline':'100% private und kostenlose PDF-Tools direkt in Ihrem Browser.',
        'footer-tools-title':'Grundlegende Tools',
        'footer-convert-title':'Konvertierung',
        'footer-legal-title':'Rechtliches',
        'footer-link-privacy':'Datenschutzrichtlinie',
        'footer-copy':'&copy; 2026 PDFsHub &mdash; Alle Rechte vorbehalten. &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--primary);">Datenschutzrichtlinie</a>',
        '_sel_jpg2pdf':['Hochformat (A4)','Querformat (A4)'],
        '_sel_rotate':['Rechts 90°','180°','Links 90°'],
        '_sel_pagenum':['Unten rechts','Unten Mitte','Oben rechts'],
        '_sel_compress':['Extreme Komprimierung (niedrig)','Empfohlen (gut)','Leicht (hoch)'],
        '_sel_ocr':['Türkisch','Englisch'],
        '_feedback_title':'Wie war Ihre Erfahrung?'
    }
};

function applyUiTranslations(lang) {
    const u = uiI18n[lang] || uiI18n.tr;
    const htmlIds = new Set([
        'merge-info-text','organize-info-text','redact-info-text','redact-clear-btn',
        'start-camera-btn','capture-btn','stop-camera-btn','scan-take-upload-btn',
        'feature1-desc','feature2-desc','feature3-desc','faq1-a','faq2-a','faq3-a',
        'footer-copy'
    ]);

    Object.keys(u).forEach(id => {
        if (id.startsWith('_')) return;
        const el = document.getElementById(id);
        if (!el) return;
        if (htmlIds.has(id)) el.innerHTML = u[id];
        else el.textContent = u[id];
    });

    // Select dropdowns
    function setOpts(selId, arr) {
        const s = document.getElementById(selId);
        if (!s || !arr) return;
        arr.forEach((t, i) => { if (s.options[i]) s.options[i].textContent = t; });
    }
    setOpts('jpg2pdf-orientation', u['_sel_jpg2pdf']);
    setOpts('rotate-degrees',      u['_sel_rotate']);
    setOpts('pagenum-position',    u['_sel_pagenum']);
    setOpts('compress-level',      u['_sel_compress']);
    setOpts('ocr-lang',            u['_sel_ocr']);

    // Feedback title
    const ft = document.getElementById('feedback-title');
    if (ft && u['_feedback_title']) ft.textContent = u['_feedback_title'];
}

// Dynamic SPA Routing and SEO Meta Tag Handler
function handleRouting() {
    const hash = window.location.hash.replace('#', '');
    if (hash && toolsMetadata[currentLang][hash]) {
        showTool(hash);
    } else {
        goHome();
    }
}

function goHome() {
    if (window.location.hash !== '' && window.location.hash !== '#') {
        window.location.hash = '';
        return;
    }
    
    viewTool.classList.remove('active', 'edit-active');
    viewHome.classList.add('active');
    
    // Restore default Homepage SEO title & meta description
    document.title = "PDFsHub - Profesyonel, Ücretsiz ve Hızlı PDF Araçları";
    document.querySelector('meta[name="description"]').setAttribute("content", 
        "Tamamen tarayıcınızda çalışan, %100 gizli, ultra hızlı ve ücretsiz PDF birleştirme, ayırma, şifreleme, sıkıştırma ve dönüştürme araçları.");
    
    // Stop camera if navigating away from scantopdf
    stopCamera();
    resetToolState();
}

async function showTool(toolId) {
    if (window.location.hash !== `#${toolId}`) {
        window.location.hash = toolId;
        return;
    }

    currentTool = toolId;

    if (toolId === 'sign') {
        autoOpenSigModal = true;
        if (window.location.hash !== '#edit') { window.location.hash = 'edit'; return; }
        toolId = 'edit';
        currentTool = 'edit';
    }

    // Dynamic SEO Metadata Injector
    const meta = toolsMetadata[currentLang][toolId];
    document.title = `${meta.title} - Ücretsiz PDFsHub Aracı`;
    document.querySelector('meta[name="description"]').setAttribute("content", meta.desc);

    // Show loading overlay, fetch and load dependencies dynamically (Zero homepage size!)
    await loadRequiredScripts(toolId);

    toolTitle.textContent = meta.title;
    toolDesc.textContent = meta.desc;

    // Reset specialized tool custom areas
    document.getElementById('compare-result').style.display = 'none';
    document.getElementById('compare-result').innerHTML = '';
    scannedPages = [];
    document.getElementById('scan-thumbnails').innerHTML = '';
    redactRegions = {};
    document.getElementById('redact-pages-container').innerHTML = '';
    editItems = [];
    const editList = document.getElementById('edit-items-list');
    if (editList) editList.innerHTML = '';
    
    // Setup allowed formats
    if (toolId === 'jpg2pdf') fileInput.accept = "image/jpeg, image/png";
    else if (toolId === 'word2pdf') fileInput.accept = ".docx";
    else if (toolId === 'ppt2pdf') fileInput.accept = ".pptx";
    else if (toolId === 'excel2pdf') fileInput.accept = ".xlsx, .xls";
    else fileInput.accept = "application/pdf";

    viewHome.classList.remove('active');
    viewTool.classList.add('active');
    viewTool.classList.toggle('edit-active', toolId === 'edit');
    resetToolState();
    
    // Specific Tool Activations
    if (toolId === 'scantopdf') {
        dropZone.style.display = 'none';
        fileListContainer.style.display = 'block';
        setupToolOptionsVisibility();
    }
}

function resetToolState() {
    selectedFiles = [];
    updateFileListUI();
    fileInput.value = '';
    if (currentTool !== 'scantopdf') {
        dropZone.style.display = 'block';
        fileListContainer.style.display = 'none';
    }
    resultArea.style.display = 'none';
    loader.style.display = 'block';
    resultContent.style.display = 'none';
    const statusEl = document.getElementById('processing-status');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
    }
    document.querySelectorAll('.options-panel').forEach(p => p.style.display = 'none');
    toolOptions.style.display = 'none';
    document.getElementById('organize-grid').innerHTML = '';
    fileListContainer.classList.remove('edit-mode');
    viewTool.classList.remove('edit-active');
}

function updateProcessingStatus(msg) {
    const el = document.getElementById('processing-status');
    if (el) {
        el.textContent = msg;
        el.style.display = msg ? 'block' : 'none';
    }
}

async function extractTextViaOcr(pdf, statusCallback) {
    let extractedPages = [];
    const ocrLang = (document.getElementById('ocr-lang') && document.getElementById('ocr-lang').value) || 'tur';
    
    // Tesseract.js v5: create a worker with the desired language
    const worker = await Tesseract.createWorker(ocrLang);
    
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            if (statusCallback) {
                statusCallback(currentLang === 'tr' 
                    ? `Sayfa ${i} / ${pdf.numPages} OCR ile taranıyor...` 
                    : `Scanning page ${i} / ${pdf.numPages} with OCR...`);
            }
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const { data } = await worker.recognize(canvas);
            const rows = [];
            data.words.forEach(word => {
                if (!word.text || word.text.trim() === '') return;
                const y = word.bbox.y0;
                const x = word.bbox.x0;
                // Y tolerance of 15 units since OCR text lines might drift slightly
                let row = rows.find(r => Math.abs(r.y - y) <= 15);
                if (!row) {
                    row = { y: y, items: [] };
                    rows.push(row);
                }
                row.items.push({ x: x, str: word.text });
            });
            
            // Sort rows top-to-bottom (Y ascending for canvas/Tesseract)
            rows.sort((a, b) => a.y - b.y);
            
            const pageRows = [];
            rows.forEach(row => {
                // Sort items left-to-right (X ascending)
                row.items.sort((a, b) => a.x - b.x);
                if (row.items.length > 0) {
                    pageRows.push(row.items);
                }
            });
            
            extractedPages.push(pageRows);
        }
    } finally {
        await worker.terminate();
    }
    return extractedPages;
}

function setupToolOptionsVisibility() {
    let panelId = 'options-' + currentTool;
    const panel = document.getElementById(panelId);
    const isEdit = panelId === 'options-edit';
    const flc = document.getElementById('file-list-container');
    if (flc) flc.classList.toggle('edit-mode', isEdit);
    viewTool.classList.toggle('edit-active', isEdit);
    if (panel) {
        toolOptions.style.display = 'block';
        panel.style.display = isEdit ? 'flex' : 'block';
    } else {
        toolOptions.style.display = 'none';
    }

    const multiFileTools = ['merge', 'jpg2pdf', 'compare'];
    if (!multiFileTools.includes(currentTool) && selectedFiles.length > 1) {
        alert(currentLang === 'tr' ? "Sadece tek dosya seçilebilir. Diğerleri silindi." : "Only single file permitted for this tool. Others removed.");
        selectedFiles = [selectedFiles[0]];
        updateFileListUI();
    }
}

function formatBytes(bytes) {
    if (!+bytes) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    if (files.length === 0) return;
    Array.from(files).forEach(file => {
        const type = file.type;
        const name = file.name.toLowerCase();
        let valid = false;
        if (currentTool === 'jpg2pdf') valid = type.includes('image');
        else if (currentTool === 'word2pdf') valid = name.endsWith('.docx');
        else if (currentTool === 'ppt2pdf') valid = name.endsWith('.pptx');
        else if (currentTool === 'excel2pdf') valid = name.endsWith('.xlsx') || name.endsWith('.xls');
        else valid = type === 'application/pdf';
        
        if (valid) selectedFiles.push(file);
        else alert(currentLang === 'tr' ? `Geçersiz format: ${file.name}` : `Invalid format: ${file.name}`);
    });
    if (selectedFiles.length > 0) {
        dropZone.style.display = 'none';
        fileListContainer.style.display = 'block';
        setupToolOptionsVisibility();
        updateFileListUI();
        if (currentTool === 'organizepages') await loadOrganizeGrid();
        if (currentTool === 'redact') await loadRedactPreview();
        if (currentTool === 'edit') await loadEditWorkspace();
    }
}

function updateFileListUI() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        if (['merge', 'jpg2pdf', 'compare'].includes(currentTool)) {
            item.classList.add('draggable'); 
            item.draggable = true; 
            item.dataset.index = index;
            item.addEventListener('dragstart', handleDragStart); 
            item.addEventListener('dragover', handleDragOver); 
            item.addEventListener('drop', handleDrop);
        }
        item.innerHTML = `
            <div class="file-item-icon"><i class="fa-solid fa-file"></i></div>
            <div class="file-item-info">
                <div class="file-item-name" title="${file.name}">${file.name}</div>
                <div class="file-item-size">${formatBytes(file.size)}</div>
            </div>
            <button class="remove-file" onclick="removeFile(${index})"><i class="fa-solid fa-xmark"></i></button>`;
        fileList.appendChild(item);
    });
    
    // Set minimal files requirements
    const minFiles = ['merge', 'jpg2pdf', 'compare'].includes(currentTool) ? 2 : 1;
    if (currentTool === 'scantopdf') {
        actionBtn.disabled = scannedPages.length === 0;
    } else {
        actionBtn.disabled = selectedFiles.length < minFiles;
    }
}

window.removeFile = function (index) {
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0 && currentTool !== 'scantopdf') resetToolState();
    else { updateFileListUI(); if (currentTool === 'organizepages') loadOrganizeGrid(); }
};

let draggedItemInfo = null;
function handleDragStart(e) { draggedItemInfo = { index: parseInt(this.dataset.index), element: this }; setTimeout(() => this.style.opacity = '0.5', 0); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) { e.stopPropagation(); const targetIndex = parseInt(this.dataset.index); if (draggedItemInfo && draggedItemInfo.index !== targetIndex) { const item = selectedFiles.splice(draggedItemInfo.index, 1)[0]; selectedFiles.splice(targetIndex, 0, item); updateFileListUI(); } draggedItemInfo = null; return false; }

// ORGANIZE PAGES UI LOGIC (Thumbnails)
let draggedThumb = null;
async function loadOrganizeGrid() {
    const grid = document.getElementById('organize-grid');
    const loading = document.getElementById('organize-loading');
    grid.innerHTML = ''; loading.style.display = 'block'; actionBtn.disabled = true;
    try {
        const file = selectedFiles[0];
        const pdfBytes = new Uint8Array(await file.arrayBuffer());
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true });
        const pdf = await loadingTask.promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            const thumb = document.createElement('div');
            thumb.className = 'page-thumbnail'; thumb.draggable = true; thumb.dataset.originalIndex = i - 1;
            
            const info = document.createElement('div');
            info.className = 'page-thumbnail-info';
            const num = document.createElement('span'); num.textContent = `${currentLang === 'tr' ? 'Sayfa' : 'Page'} ${i}`;
            const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.className = 'page-checkbox';
            checkbox.addEventListener('change', (e) => { if (e.target.checked) thumb.classList.remove('unchecked'); else thumb.classList.add('unchecked'); });
            
            info.appendChild(num); info.appendChild(checkbox);
            thumb.appendChild(canvas); thumb.appendChild(info);
            
            thumb.addEventListener('dragstart', function (e) { draggedThumb = this; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.style.opacity = '0.5', 0); });
            thumb.addEventListener('dragover', (e) => e.preventDefault());
            thumb.addEventListener('drop', function (e) { e.stopPropagation(); if (draggedThumb !== this) { const thumbsArray = Array.from(grid.children); const fromIndex = thumbsArray.indexOf(draggedThumb); const toIndex = thumbsArray.indexOf(this); if (fromIndex < toIndex) this.parentNode.insertBefore(draggedThumb, this.nextSibling); else this.parentNode.insertBefore(draggedThumb, this); } draggedThumb.style.opacity = '1'; draggedThumb = null; return false; });
            thumb.addEventListener('dragend', function () { this.style.opacity = '1'; });
            grid.appendChild(thumb);
        }
    } catch (error) { console.error("Grid load error:", error); }
    finally { loading.style.display = 'none'; actionBtn.disabled = false; }
}

window.selectAllOrganize = function (force) {
    document.querySelectorAll('.page-thumbnail').forEach(thumb => {
        thumb.querySelector('.page-checkbox').checked = force;
        if (force) thumb.classList.remove('unchecked'); else thumb.classList.add('unchecked');
    });
}

// Live HTML preview for HTML-to-PDF tool
window.updateHtmlPreview = function() {
    const content = document.getElementById('html-content').value;
    const container = document.getElementById('html-preview-container');
    const box = document.getElementById('html-preview-box');
    
    if (content.trim()) {
        container.style.display = 'block';
        if (content.startsWith('http')) {
            box.innerHTML = `<em style="color:var(--text-muted);">${currentLang==='tr'?'Linkler güvenlik gerekçesiyle canlı önizlenemez. HTML kodu girmeyi deneyebilirsiniz.':'Links cannot be previewed in real-time due to CORS protection. Try pasting raw HTML.'}</em>`;
        } else {
            box.innerHTML = window.DOMPurify ? DOMPurify.sanitize(content) : content;
        }
    } else {
        container.style.display = 'none';
    }
};

// =====================================================
// WEBCAM CAMERA SCANNER CONTROLS
// =====================================================
async function startCamera() {
    const video = document.getElementById('scan-video');
    const container = document.getElementById('camera-container');
    const startBtn = document.getElementById('start-camera-btn');
    
    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = scanStream;
        container.style.display = 'block';
        startBtn.style.display = 'none';
    } catch (err) {
        alert(currentLang === 'tr' 
            ? "Kamera başlatılamadı. HTTPS bağlantısı gerekiyor olabilir veya tarayıcı izin vermedi. Lütfen Fotoğraf Çek / Yükle butonunu kullanarak ortam kameranızı açın." 
            : "Camera access denied. Ensure HTTPS or camera permissions. Try the direct photo upload button.");
        console.error("Webcam scan init failure:", err);
    }
}

function stopCamera() {
    const container = document.getElementById('camera-container');
    const startBtn = document.getElementById('start-camera-btn');
    if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        scanStream = null;
    }
    container.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
}

function capturePhoto() {
    const video = document.getElementById('scan-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    addScannedPage(dataUrl);
}

function addScannedPage(dataUrl) {
    scannedPages.push(dataUrl);
    renderScanThumbnails();
    actionBtn.disabled = false;
}

function renderScanThumbnails() {
    const container = document.getElementById('scan-thumbnails');
    container.innerHTML = '';
    scannedPages.forEach((src, idx) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '90px';
        div.style.height = '120px';
        div.style.border = '2px solid var(--primary)';
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        div.style.boxShadow = 'var(--shadow-sm)';
        
        const img = document.createElement('img');
        img.src = src;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        delBtn.style.position = 'absolute';
        delBtn.style.top = '4px';
        delBtn.style.right = '4px';
        delBtn.style.background = 'var(--danger)';
        delBtn.style.color = '#fff';
        delBtn.style.border = 'none';
        delBtn.style.borderRadius = '50%';
        delBtn.style.width = '24px';
        delBtn.style.height = '24px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '0.8rem';
        delBtn.style.display = 'flex';
        delBtn.style.alignItems = 'center';
        delBtn.style.justifyContent = 'center';
        delBtn.onclick = (e) => {
            e.preventDefault();
            scannedPages.splice(idx, 1);
            renderScanThumbnails();
            if (scannedPages.length === 0) actionBtn.disabled = true;
        };
        
        div.appendChild(img);
        div.appendChild(delBtn);
        container.appendChild(div);
    });
}

// Bind scan events once DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const startCamBtn = document.getElementById('start-camera-btn');
    if (startCamBtn) startCamBtn.addEventListener('click', startCamera);
    
    const stopCamBtn = document.getElementById('stop-camera-btn');
    if (stopCamBtn) stopCamBtn.addEventListener('click', stopCamera);
    
    const captBtn = document.getElementById('capture-btn');
    if (captBtn) captBtn.addEventListener('click', capturePhoto);
    
    // Bind capture fallback
    const scanFileInput = document.getElementById('scan-file-input');
    if (scanFileInput) {
        scanFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                const reader = new FileReader();
                reader.onload = (event) => addScannedPage(event.target.result);
                reader.readAsDataURL(files[0]);
            }
        });
    }
});


// Processors Map
const processors = {
    merge: performMerge, split: performSplit, jpg2pdf: performJpg2Pdf, pdf2jpg: performPdf2Jpg,
    word2pdf: performWord2Pdf, excel2pdf: performExcel2Pdf, pdf2word: performPdf2Word,
    pagenumbers: performPageNumbers, organizepages: performOrganizePages,
    watermark: performWatermark, rotate: performRotate,
    protect: performProtect, unlock: performUnlock, sign: performSign,
    pdf2excel: performPdf2Excel,
    compress: performCompress, html2pdf: performHtml2Pdf, crop: performCrop, repair: performRepair,
    ocr: performOcr, ppt2pdf: performPpt2Pdf, pdf2ppt: performPdf2Ppt, edit: performEdit,
    redact: performRedact, compare: performCompare, scantopdf: performScanToPdf, pdf2pdfa: performPdf2Pdfa
};

// Analytics and Feedback
window.trackEvent = function(action, status, label = '') {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': 'PDF_Tools',
            'event_label': label,
            'value': status === 'success' ? 1 : 0
        });
    }
    console.log(`[Analytics] Action: ${action}, Status: ${status}, Label: ${label}`);
};

// Setup star rating hover & click behaviour (called once after DOM ready)
function initStarRating() {
    const container = document.getElementById('star-rating');
    if (!container) return;
    const stars = container.querySelectorAll('i');

    stars.forEach(star => {
        const n = parseInt(star.dataset.star);

        star.addEventListener('mouseenter', () => {
            stars.forEach(s => {
                const sn = parseInt(s.dataset.star);
                s.classList.toggle('hover', sn <= n);
            });
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hover'));
        });
        star.addEventListener('click', () => {
            submitFeedback(n);
        });
    });
}

window.submitFeedback = function(rating) {
    const container = document.getElementById('star-rating');
    const stars = container ? container.querySelectorAll('i') : [];

    // Highlight all stars up to selected
    stars.forEach(s => {
        const n = parseInt(s.dataset.star);
        s.classList.toggle('active', n <= rating);
        s.classList.remove('hover');
    });

    // Send to GA4 as a dedicated event for easy reporting
    if (typeof gtag !== 'undefined') {
        gtag('event', 'tool_rated', {
            event_category: 'Feedback',
            tool_name: currentTool,
            tool_title: (toolsMetadata.tr[currentTool] || {}).title || currentTool,
            rating: rating
        });
    }
    trackEvent(currentTool + '_rated', 'success', 'Stars: ' + rating);

    document.getElementById('feedback-modal').style.display = 'none';
    setTimeout(() => {
        alert(currentLang === 'tr' ? 'Geri bildiriminiz için teşekkürler!' : 'Thank you for your feedback!');
    }, 200);
};

// Reset tool state and stay on current tool for reuse
window.reuseCurrentTool = function() {
    resetToolState();
    dropZone.style.display = 'block';
};

actionBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0 && currentTool !== 'scantopdf') return;
    fileListContainer.style.display = 'none'; resultArea.style.display = 'flex'; loader.style.display = 'block'; resultContent.style.display = 'none';
    trackEvent(currentTool, 'start');
    try {
        const res = await processors[currentTool]();
        loader.style.display = 'none'; resultContent.style.display = 'block';
        downloadBtn.href = res.url; downloadBtn.download = res.filename;
        trackEvent(currentTool, 'success');
        
        // Smart Messages
        if (res.smartMessage) {
            document.querySelector('#result-content p').textContent = res.smartMessage;
        } else {
            document.querySelector('#result-content p').textContent = i18n[currentLang].success_p;
        }
        
        // Reset stars (modal will show on download click)
        const starContainer = document.getElementById('star-rating');
        if (starContainer) starContainer.querySelectorAll('i').forEach(s => { s.classList.remove('active','hover'); });
        
    } catch (error) { 
        trackEvent(currentTool, 'error', error.message);
        alert(currentLang === 'tr' ? `Hata Oluştu: ${error.message}` : `Error occurred: ${error.message}`); 
        resultArea.style.display = 'none'; 
        fileListContainer.style.display = 'block'; 
    }
});

// =====================================================
// CORE TOOL IMPLEMENTATIONS
// =====================================================

async function performMerge() {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    for (const file of selectedFiles) {
        const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
    }
    return { url: URL.createObjectURL(new Blob([await mergedPdf.save()])), filename: 'birlestirilmis.pdf' };
}

async function performSplit() {
    const { PDFDocument } = PDFLib;
    const zip = new JSZip();
    const pdfDoc = await PDFDocument.load(await selectedFiles[0].arrayBuffer());
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
        zip.file(`sayfa_${i + 1}.pdf`, await newPdf.save());
    }
    return { url: URL.createObjectURL(await zip.generateAsync({ type: "blob" })), filename: 'ayrilmis.zip' };
}

async function performJpg2Pdf() {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const orien = document.getElementById('jpg2pdf-orientation').value;
    const width = orien === 'portrait' ? 595.28 : 841.89, height = orien === 'portrait' ? 841.89 : 595.28;
    for (const file of selectedFiles) {
        const bytes = await file.arrayBuffer();
        const isPng = file.name.toLowerCase().endsWith('.png') || file.type.includes('png');
        const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([width, height]);
        const scale = Math.min(width / image.width, height / image.height);
        page.drawImage(image, { x: (width - image.width * scale) / 2, y: (height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    }
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'resimler.pdf' };
}

async function performPdf2Jpg() {
    const zip = new JSZip();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()), disableWorker: true }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i), viewport = page.getViewport({ scale: 2.0 }), canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        zip.file(`sayfa_${i}.jpg`, await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9)));
    }
    return { url: URL.createObjectURL(await zip.generateAsync({ type: "blob" })), filename: 'resimler.zip' };
}

async function performWord2Pdf() {
    const name = selectedFiles[0].name.toLowerCase();
    if (!name.endsWith('.docx')) {
        throw new Error(currentLang === 'tr'
            ? 'Sadece .docx formatı desteklenir. Lütfen geçerli bir Word belgesi yükleyin.'
            : 'Only .docx files are supported. Please upload a valid Word document.');
    }
    try {
        const res = await mammoth.convertToHtml({ arrayBuffer: await selectedFiles[0].arrayBuffer() });
        const container = document.getElementById('render-container'); container.innerHTML = res.value; container.style.display = 'block';
        const blob = await html2pdf().set({ margin: 10, html2canvas: { scale: 2 } }).from(container).output('blob');
        container.style.display = 'none'; container.innerHTML = '';
        return { url: URL.createObjectURL(blob), filename: 'word.pdf' };
    } catch (err) {
        throw new Error(currentLang === 'tr'
            ? 'Word dosyası işlenemedi. Lütfen geçerli bir .docx dosyası yükleyin.'
            : 'Word file could not be processed. Please use a valid .docx file.');
    }
}

async function performExcel2Pdf() {
    const workbook = XLSX.read(await selectedFiles[0].arrayBuffer(), { type: 'array' });
    const htmlStr = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
    const container = document.getElementById('render-container'); container.innerHTML = `<style>table{border-collapse:collapse; width:100%;} td,th{border:1px solid #ccc; padding:8px;}</style>` + htmlStr; container.style.display = 'block';
    const blob = await html2pdf().set({ margin: 10, jsPDF: { orientation: 'landscape' } }).from(container).output('blob');
    container.style.display = 'none'; container.innerHTML = '';
    return { url: URL.createObjectURL(blob), filename: 'excel.pdf' };
}

async function performPdf2Word() {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()), disableWorker: true }).promise;
    let html = `<html><body style="font-family: Arial; padding: 20px; line-height: 1.5;">`;
    let totalItems = 0;
    let hasContent = false;
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        totalItems += textContent.items.length;
        
        const rows = [];
        textContent.items.forEach(item => {
            if (!item.str || item.str.trim() === '') return;
            const y = item.transform[5];
            const x = item.transform[4];
            let row = rows.find(r => Math.abs(r.y - y) <= 5);
            if (!row) {
                row = { y: y, items: [] };
                rows.push(row);
            }
            row.items.push({ x: x, str: item.str });
        });
        
        // Sort rows top-to-bottom (Y descending)
        rows.sort((a, b) => b.y - a.y);
        
        rows.forEach(row => {
            // Sort items left-to-right (X ascending)
            row.items.sort((a, b) => a.x - b.x);
            let rowStr = row.items.map(item => item.str).join(" ");
            if (rowStr.trim()) {
                html += `<p>${escapeHtml(rowStr)}</p>`;
                hasContent = true;
            }
        });
        
        if (i < pdf.numPages) {
            html += `<div style="page-break-after: always;"></div>`;
        }
    }
    
    if (totalItems === 0 || !hasContent) {
        updateProcessingStatus(currentLang === 'tr' 
            ? "Taranmış PDF tespit edildi. Metinler otomatik olarak OCR ile taranıyor, lütfen bekleyin..." 
            : "Scanned PDF detected. Reading text automatically via OCR, please wait...");
        
        const ocrPages = await extractTextViaOcr(pdf, updateProcessingStatus);
        
        html = `<html><body style="font-family: Arial; padding: 20px; line-height: 1.5;">`;
        ocrPages.forEach((pageRows, pageIdx) => {
            pageRows.forEach(rowItems => {
                let rowStr = rowItems.map(item => item.str).join(" ");
                if (rowStr.trim()) {
                    html += `<p>${escapeHtml(rowStr)}</p>`;
                }
            });
            if (pageIdx < ocrPages.length - 1) {
                html += `<div style="page-break-after: always;"></div>`;
            }
        });
    }
    
    html += "</body></html>";
    return { url: URL.createObjectURL(new Blob([html], { type: 'application/msword' })), filename: 'pdf.doc' };
}

async function performPdf2Excel() {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()), disableWorker: true }).promise;
    let data = [];
    let totalItems = 0;
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        totalItems += textContent.items.length;
        
        const rows = [];
        textContent.items.forEach(item => {
            if (!item.str || item.str.trim() === '') return;
            const y = item.transform[5];
            const x = item.transform[4];
            let row = rows.find(r => Math.abs(r.y - y) <= 5);
            if (!row) {
                row = { y: y, items: [] };
                rows.push(row);
            }
            row.items.push({ x: x, str: item.str });
        });
        
        // Sort rows top-to-bottom (Y descending)
        rows.sort((a, b) => b.y - a.y);
        
        rows.forEach(row => {
            // Sort items left-to-right (X ascending)
            row.items.sort((a, b) => a.x - b.x);
            const rowValues = row.items.map(item => item.str);
            if (rowValues.length > 0) {
                data.push(rowValues);
            }
        });
    }
    
    if (totalItems === 0 || data.length === 0) {
        updateProcessingStatus(currentLang === 'tr' 
            ? "Taranmış PDF tespit edildi. Metinler otomatik olarak OCR ile taranıyor, lütfen bekleyin..." 
            : "Scanned PDF detected. Reading text automatically via OCR, please wait...");
        
        const ocrPages = await extractTextViaOcr(pdf, updateProcessingStatus);
        
        data = [];
        ocrPages.forEach(pageRows => {
            pageRows.forEach(rowItems => {
                data.push(rowItems.map(item => item.str));
            });
        });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PDF Verileri");
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    return { 
        url: URL.createObjectURL(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })), 
        filename: 'pdf_verileri.xlsx' 
    };
}

// FIXED: Local client-side browser encryption! No servers, 100% privacy!
async function performProtect() {
    const pass = document.getElementById('protect-password').value; 
    if (!pass) throw new Error(currentLang === 'tr' ? "Şifre belirleyin" : "Password cannot be empty");
    
    // Import pdf-encrypt-lite ESM on demand to perform secure local encrypting
    const { encryptPDF } = await import('https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt-lite/+esm');
    const pdfBytes = await selectedFiles[0].arrayBuffer();
    const encryptedBytes = await encryptPDF(new Uint8Array(pdfBytes), pass);
    
    return { url: URL.createObjectURL(new Blob([encryptedBytes], { type: 'application/pdf' })), filename: 'sifreli.pdf' };
}

async function performUnlock() {
    const pass = document.getElementById('unlock-password').value; 
    if (!pass) throw new Error(currentLang === 'tr' ? "Şifreyi giriniz" : "Password required to unlock");
    
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer(), { password: pass });
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'sifresiz.pdf' };
}

async function performSign() {
    const imgFile = document.getElementById('sign-image-input').files[0]; if (!imgFile) throw new Error("İmza resmi yükleyiniz");
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    const bytes = await imgFile.arrayBuffer();
    const isPng = imgFile.name.toLowerCase().endsWith('.png') || imgFile.type.includes('png');
    const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.getPages()[0]; const { width, height } = page.getSize();
    const sw = 150, sh = (image.height / image.width) * sw;
    page.drawImage(image, { x: width - sw - 50, y: 50, width: sw, height: sh });
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'imzali.pdf' };
}

async function performPageNumbers() {
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pos = document.getElementById('pagenum-position').value;
    pdfDoc.getPages().forEach((page, idx) => {
        const { width, height } = page.getSize(), text = `${idx + 1}`, sw = font.widthOfTextAtSize(text, 12);
        let x, y; if (pos === 'bottom-right') { x = width - sw - 30; y = 30; } else if (pos === 'bottom-center') { x = (width - sw) / 2; y = 30; } else { x = width - sw - 30; y = height - 30; }
        page.drawText(text, { x, y, size: 12, font, color: PDFLib.rgb(0, 0, 0) });
    });
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'numarali.pdf' };
}

async function performOrganizePages() {
    const pages = Array.from(document.getElementById('organize-grid').children).filter(t => t.querySelector('.page-checkbox').checked).map(t => parseInt(t.dataset.originalIndex));
    if (!pages.length) throw new Error("Sayfa seçilmedi");
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer()), newPdf = await PDFLib.PDFDocument.create();
    (await newPdf.copyPages(pdfDoc, pages)).forEach(p => newPdf.addPage(p));
    return { url: URL.createObjectURL(new Blob([await newPdf.save()])), filename: 'düzenlenmiş.pdf' };
}

async function performWatermark() {
    const text = (document.getElementById('watermark-text').value || 'GIZLIDIR').replace(/[çğıiöşüÇĞİIÖŞÜ]/g, m => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' }[m] || m));
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer()), font = await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBold);
    pdfDoc.getPages().forEach(page => { const { width, height } = page.getSize(); page.drawText(text, { x: width / 2 - text.length * 15, y: height / 2, size: 60, font, color: PDFLib.rgb(0.5, 0.5, 0.5), opacity: 0.3, rotate: PDFLib.degrees(45) }); });
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'filigranlı.pdf' };
}

async function performRotate() {
    const deg = parseInt(document.getElementById('rotate-degrees').value), pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    pdfDoc.getPages().forEach(p => p.setRotation(PDFLib.degrees(p.getRotation().angle + deg)));
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'döndürülmüş.pdf' };
}

async function performCompress() {
    const level = document.getElementById('compress-level').value;
    const qualityMap = { extreme: 0.3, recommended: 0.6, low: 0.85 };
    const maxWidthMap = { extreme: 800, recommended: 1200, low: 1600 };
    const quality = qualityMap[level] || 0.6;
    const maxW = maxWidthMap[level] || 1200;
    
    const originalBytes = await selectedFiles[0].arrayBuffer();
    const originalSize = originalBytes.byteLength;
    
    // Render each page via pdf.js, compress as JPEG, rebuild with pdf-lib
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(originalBytes), disableWorker: true }).promise;
    const { PDFDocument } = PDFLib;
    const newPdf = await PDFDocument.create();
    
    for (let i = 1; i <= pdf.numPages; i++) {
        updateProcessingStatus(currentLang === 'tr'
            ? `Sayfa ${i} / ${pdf.numPages} sıkıştırılıyor...`
            : `Compressing page ${i} / ${pdf.numPages}...`);
        
        const page = await pdf.getPage(i);
        const origViewport = page.getViewport({ scale: 1.0 });
        
        // Scale down if page is wider than maxW
        let scale = 1.0;
        if (origViewport.width > maxW) {
            scale = maxW / origViewport.width;
        }
        // But ensure minimum resolution for readability
        scale = Math.max(scale, 0.5);
        
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        
        // Compress to JPEG blob
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        const imgBytes = new Uint8Array(await blob.arrayBuffer());
        const img = await newPdf.embedJpg(imgBytes);
        
        // Create page with original dimensions (points)
        const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
    }
    
    const compressedBytes = await newPdf.save();
    const newSize = compressedBytes.byteLength;
    const reduction = Math.round((1 - newSize / originalSize) * 100);
    
    updateProcessingStatus(currentLang === 'tr'
        ? `Orijinal: ${formatBytes(originalSize)} \u2192 Yeni: ${formatBytes(newSize)} (${reduction > 0 ? '-' + reduction : '+' + Math.abs(reduction)}%)`
        : `Original: ${formatBytes(originalSize)} \u2192 New: ${formatBytes(newSize)} (${reduction > 0 ? '-' + reduction : '+' + Math.abs(reduction)}%)`);
        
    const smartMessage = currentLang === 'tr' 
        ? `Dosyanız ${formatBytes(originalSize)} boyutundan ${formatBytes(newSize)} boyutuna başarıyla küçültüldü! (%${reduction > 0 ? reduction : 0} kazanç)` 
        : `Your file was compressed from ${formatBytes(originalSize)} to ${formatBytes(newSize)}! (${reduction > 0 ? reduction : 0}% saved)`;
    
    return { url: URL.createObjectURL(new Blob([compressedBytes])), filename: 'sikistirilmis.pdf', smartMessage };
}

async function performHtml2Pdf() {
    const content = document.getElementById('html-content').value;
    if (!content) throw new Error(currentLang === 'tr' ? "İçerik veya URL giriniz" : "Provide content or link");

    const container = document.getElementById('render-container');
    if (content.startsWith('http')) {
        container.innerHTML = `<iframe src="${content}" style="width:100%; height:1000px; border:none;"></iframe>`;
        alert(currentLang === 'tr' ? "Not: Güvenlik koruması (CORS) nedeniyle dış linkler işlenemeyebilir. Doğrudan HTML kodu girmeyi deneyin." : "Note: External links might not load due to CORS. Pasting raw HTML code is recommended.");
    } else {
        container.innerHTML = window.DOMPurify ? DOMPurify.sanitize(content) : content;
    }

    container.style.display = 'block';
    const blob = await html2pdf().set({ margin: 10 }).from(container).output('blob');
    container.style.display = 'none'; container.innerHTML = '';
    return { url: URL.createObjectURL(blob), filename: 'web_sayfasi.pdf' };
}

async function performCrop() {
    const mmToPoints = 2.83465; // 1mm = 2.83465 PDF points
    const topMm = parseFloat(document.getElementById('crop-top').value) || 0;
    const bottomMm = parseFloat(document.getElementById('crop-bottom').value) || 0;
    const leftMm = parseFloat(document.getElementById('crop-left').value) || 0;
    const rightMm = parseFloat(document.getElementById('crop-right').value) || 0;
    
    if (topMm === 0 && bottomMm === 0 && leftMm === 0 && rightMm === 0) {
        throw new Error(currentLang === 'tr' ? 'En az bir kenardan kırpma değeri girin.' : 'Enter at least one crop margin.');
    }
    
    const top = topMm * mmToPoints;
    const bottom = bottomMm * mmToPoints;
    const left = leftMm * mmToPoints;
    const right = rightMm * mmToPoints;
    
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    pdfDoc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        const newW = width - left - right;
        const newH = height - top - bottom;
        if (newW <= 0 || newH <= 0) return; // skip if margins too large
        page.setCropBox(left, bottom, newW, newH);
        page.setTrimBox(left, bottom, newW, newH);
    });
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'kirpilmis.pdf' };
}

async function performRepair() {
    let srcDoc;
    try {
        srcDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer(), {
            ignoreEncryption: true,
            updateMetadata: false
        });
    } catch (e) {
        throw new Error(currentLang === 'tr'
            ? 'PDF dosyası açılamıyor. Dosya çok hasar görmüş olabilir.'
            : 'Cannot open PDF. The file may be too damaged.');
    }
    
    const newDoc = await PDFLib.PDFDocument.create();
    const totalPages = srcDoc.getPageCount();
    let recoveredCount = 0;
    let failedPages = [];
    
    for (let i = 0; i < totalPages; i++) {
        try {
            const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
            newDoc.addPage(copiedPage);
            recoveredCount++;
        } catch (e) {
            failedPages.push(i + 1);
            console.warn(`Sayfa ${i + 1} kurtarilamadi:`, e);
        }
    }
    
    if (recoveredCount === 0) {
        throw new Error(currentLang === 'tr'
            ? 'Hiçbir sayfa kurtarılamadı. Dosya çok hasar görmüş.'
            : 'No pages could be recovered. File is too damaged.');
    }
    
    let statusMsg = currentLang === 'tr'
        ? `${recoveredCount} / ${totalPages} sayfa ba\u015far\u0131yla kurtar\u0131ld\u0131.`
        : `${recoveredCount} / ${totalPages} pages recovered successfully.`;
    if (failedPages.length > 0) {
        statusMsg += currentLang === 'tr'
            ? ` Kurtarilamayan sayfalar: ${failedPages.join(', ')}`
            : ` Failed pages: ${failedPages.join(', ')}`;
    }
    updateProcessingStatus(statusMsg);
    
    return { url: URL.createObjectURL(new Blob([await newDoc.save()])), filename: 'tamir_edildi.pdf' };
}

async function performOcr() {
    const lang = document.getElementById('ocr-lang').value;
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()) }).promise;
    let extractedText = "";
    
    // Tesseract.js v5: create a worker with the desired language
    const worker = await Tesseract.createWorker(lang);
    
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            updateProcessingStatus(currentLang === 'tr'
                ? `Sayfa ${i} / ${pdf.numPages} OCR ile taranıyor...`
                : `Scanning page ${i} / ${pdf.numPages} with OCR...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const { data: { text } } = await worker.recognize(canvas);
            extractedText += `--- Sayfa ${i} ---\n` + text + "\n\n";
        }
    } finally {
        await worker.terminate();
    }
    return { url: URL.createObjectURL(new Blob([extractedText])), filename: 'ocr_sonucu.txt' };
}

// FIXED: Client-Side XML Slides Parsing PPTX-to-PDF Conversion! Fully client-side!
async function performPpt2Pdf() {
    const file = selectedFiles[0];
    const zip = await JSZip.loadAsync(file);
    const { PDFDocument, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    
    const slideFiles = [];
    zip.forEach((path, zipEntry) => {
        if (path.startsWith('ppt/slides/slide') && path.endsWith('.xml') && !path.includes('_rels')) {
            slideFiles.push(zipEntry);
        }
    });
    
    // Sort slide pages sequentially
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)[0]);
        const numB = parseInt(b.name.match(/\d+/)[0]);
        return numA - numB;
    });
    
    if (slideFiles.length === 0) throw new Error("Slayt bulunamadı / No slides found in PPTX");
    
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    for (let i = 0; i < slideFiles.length; i++) {
        const xmlText = await slideFiles[i].async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const textElements = xmlDoc.getElementsByTagName('a:t');
        
        const lines = [];
        for (let j = 0; j < textElements.length; j++) {
            const val = textElements[j].textContent.trim();
            if (val) lines.push(val);
        }
        
        // Create Landscape A4 page (841.89 x 595.28)
        const page = pdfDoc.addPage([841.89, 595.28]);
        
        // Draw elegant slide card background
        page.drawRectangle({
            x: 0,
            y: 0,
            width: 841.89,
            height: 595.28,
            color: rgb(0.98, 0.99, 1.0)
        });
        
        // Draw elegant brand headers
        page.drawText(`Slide ${i + 1} / ${slideFiles.length}`, { x: 50, y: 35, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
        page.drawText("PDFsHub.com - PPT to PDF Converter", { x: 600, y: 35, size: 10, font, color: rgb(0.4, 0.5, 0.8) });
        
        let yOffset = 500;
        if (lines.length > 0) {
            // Draw title text
            page.drawText(lines[0].substring(0, 60), { x: 50, y: yOffset, size: 24, font, color: rgb(0.1, 0.2, 0.5) });
            
            // Draw visual divider
            page.drawLine({
                start: { x: 50, y: yOffset - 15 },
                end: { x: 791.89, y: yOffset - 15 },
                thickness: 2,
                color: rgb(0.8, 0.8, 0.9)
            });
            yOffset -= 60;
            
            for (let j = 1; j < lines.length; j++) {
                if (yOffset < 70) break;
                page.drawText(`• ${lines[j].substring(0, 95)}`, { x: 70, y: yOffset, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
                yOffset -= 25;
            }
        } else {
            page.drawText("[Boş Slayt / Empty Slide]", { x: 350, y: 300, size: 14, font, color: rgb(0.6, 0.6, 0.6) });
        }
    }
    
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'sunum.pdf' };
}

async function performPdf2Ppt() {
    const pptx = new PptxGenJS();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()) }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i), viewport = page.getViewport({ scale: 1.5 }), canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        pptx.addSlide().addImage({ data: canvas.toDataURL('image/png'), x: 0, y: 0, w: '100%', h: '100%' });
    }
    const blob = await pptx.writeFile({ outputType: 'blob' });
    return { url: URL.createObjectURL(blob), filename: 'sunum.pptx' };
}

// =====================================================
// CANVA-LIKE VISUAL PDF EDITOR
// =====================================================

async function loadEditWorkspace() {
    const container = document.getElementById('edit-zoom-container');
    if (!container) return;
    container.innerHTML = '';
    visualEditPages = [];
    selectedEditElement = null;
    currentEditPageIndex = 0;
    lastTouchedEditPageIndex = 0;
    editElementIdCounter = 0;
    editUndoStack = [];
    editRedoStack = [];
    editZoom = 1.0;
    editFillColor = 'none';
    container.style.transform = 'scale(1)';
    const zoomDisplay = document.getElementById('edit-zoom-display');
    if (zoomDisplay) zoomDisplay.textContent = '100%';

    try {
        const file = selectedFiles[0];
        const pdfBytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;

        const ws = document.getElementById('edit-workspace');
        const availW = Math.max(380, (ws && ws.clientWidth > 100 ? ws.clientWidth - 80 : document.documentElement.clientWidth * 0.8));
        const availH = Math.max(400, (ws && ws.clientHeight > 100 ? ws.clientHeight - 80 : window.innerHeight * 0.75));

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            const scaleW = availW / viewport.width;
            const scaleH = availH / viewport.height;
            const scale = Math.min(scaleW, scaleH, 1.5);
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;

            const wrapper = document.createElement('div');
            wrapper.className = 'edit-page-wrapper' + (i === 1 ? ' active-page' : '');
            wrapper.dataset.pageIndex = i - 1;
            wrapper.style.width = scaledViewport.width + 'px';
            wrapper.style.height = scaledViewport.height + 'px';

            // Page badge
            const badge = document.createElement('div');
            badge.className = 'edit-page-badge';
            const pageLbl = currentLang === 'tr' ? 'Sayfa' : currentLang === 'de' ? 'Seite' : 'Page';
            badge.textContent = `${pageLbl} ${i} / ${pdf.numPages}`;
            wrapper.appendChild(badge);

            // SVG overlay for freehand drawing and shapes
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', scaledViewport.width);
            svg.setAttribute('height', scaledViewport.height);
            svg.classList.add('edit-freehand-svg');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'painted';
            svg.style.overflow = 'visible';
            svg.style.zIndex = '5';

            wrapper.appendChild(canvas);
            wrapper.appendChild(svg);

            const pageIndex = i - 1;
            wrapper.addEventListener('mousedown', (e) => handleEditPageMousedown(e, wrapper, pageIndex));
            container.appendChild(wrapper);

            visualEditPages.push({
                pdfW: viewport.width,
                pdfH: viewport.height,
                scale,
                elements: [],
                wrapper,
                svg,
                pageNum: i
            });
        }

        updatePageTabs();
        actionBtn.disabled = false;
        if (autoOpenSigModal) { autoOpenSigModal = false; setTimeout(openSigModal, 100); }
    } catch (err) {
        console.error('Edit workspace load error:', err);
    }
}

function updatePageTabs() {
    const tabsContainer = document.getElementById('edit-page-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    visualEditPages.forEach((pageObj, idx) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        const pageLbl = currentLang === 'tr' ? 'Sayfa' : currentLang === 'de' ? 'Seite' : 'Page';
        tab.textContent = `${pageLbl} ${pageObj.pageNum}`;
        tab.style.padding = '6px 12px';
        tab.style.fontSize = '0.82rem';
        tab.style.fontWeight = '600';
        tab.style.border = idx === currentEditPageIndex ? '1px solid var(--primary)' : '1px solid var(--border)';
        tab.style.background = idx === currentEditPageIndex ? 'var(--primary)' : 'var(--surface)';
        tab.style.color = idx === currentEditPageIndex ? 'white' : 'var(--text-main)';
        tab.style.borderRadius = '6px';
        tab.style.cursor = 'pointer';
        tab.onclick = () => switchEditPage(idx);
        tabsContainer.appendChild(tab);
    });
}

function switchEditPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= visualEditPages.length) return;
    currentEditPageIndex = pageIndex;
    lastTouchedEditPageIndex = pageIndex;
    visualEditPages.forEach((p, idx) => {
        if (p.wrapper) p.wrapper.classList.toggle('active-page', idx === pageIndex);
    });
    updatePageTabs();
    const pageObj = visualEditPages[pageIndex];
    if (pageObj && pageObj.wrapper) {
        pageObj.wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

window.addImageToPageDialog = function() {
    document.getElementById('edit-image-input').click();
};

window.addTextToCurrentPage = function() {
    if (visualEditPages.length === 0) return;
    const pageObj = visualEditPages[currentEditPageIndex];

    const textEl = document.createElement('div');
    textEl.contentEditable = true;
    textEl.textContent = currentLang === 'tr' ? 'Metni düzenle' : 'Edit text';
    textEl.style.position = 'absolute';
    textEl.style.left = '40px';
    textEl.style.top = '40px';
    textEl.style.fontSize = (document.getElementById('edit-font-size')?.value || 24) + 'px';
    textEl.style.color = document.getElementById('edit-text-color')?.value || '#000000';
    textEl.style.background = editFillColor === 'none' ? 'transparent' : editFillColor;
    textEl.style.fontWeight = document.getElementById('edit-font-weight')?.value || '400';
    textEl.style.fontFamily = document.getElementById('edit-font-family')?.value || 'Arial, sans-serif';
    textEl.style.cursor = 'move';
    textEl.style.padding = '4px 8px';
    textEl.style.border = '1px dashed transparent';
    textEl.style.outline = 'none';
    textEl.style.userSelect = 'none';
    textEl.style.whiteSpace = 'nowrap';
    textEl.style.minWidth = '50px';
    textEl.id = 'edit-elem-' + (editElementIdCounter++);
    textEl.dataset.type = 'text';

    setupDraggableElement(textEl, pageObj);
    pageObj.wrapper.appendChild(textEl);
    pageObj.elements.push({ el: textEl, type: 'text' });
    editUndoStack.push({ type: 'add', el: textEl, pageIndex: currentEditPageIndex, elemType: 'text' });
    editRedoStack = [];
    selectElement(textEl, 'text');
};

window.addShapeToCurrentPage = function(shapeType) {
    if (visualEditPages.length === 0) return;
    setEditShapeType(shapeType);
};

window.addImageToCurrentPage = function(event) {
    const file = event.target.files[0];
    if (!file || visualEditPages.length === 0) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const pageObj = visualEditPages[currentEditPageIndex];

        const imgEl = document.createElement('img');
        imgEl.src = e.target.result;
        imgEl.style.position = 'absolute';
        imgEl.style.left = '50px';
        imgEl.style.top = '50px';
        imgEl.style.width = '140px';
        imgEl.style.height = 'auto';
        imgEl.style.cursor = 'move';
        imgEl.style.border = '1px dashed transparent';
        imgEl.style.objectFit = 'contain';
        imgEl.style.userSelect = 'none';
        imgEl.id = 'edit-elem-' + (editElementIdCounter++);
        imgEl.dataset.type = 'image';

        setupDraggableElement(imgEl, pageObj);
        setupResizableElement(imgEl, pageObj);
        pageObj.wrapper.appendChild(imgEl);
        pageObj.elements.push({ el: imgEl, type: 'image' });
        editUndoStack.push({ type: 'add', el: imgEl, pageIndex: currentEditPageIndex, elemType: 'image' });
        editRedoStack = [];
        selectElement(imgEl, 'image');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

function setupDraggableElement(el, pageObj) {
    let isDragging = false, startX, startY, initialX, initialY;

    el.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('resize-handle')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = parseFloat(el.style.left || 0);
        initialY = parseFloat(el.style.top || 0);
        selectElement(el, el.dataset.type);
        e.stopPropagation();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging || el !== selectedEditElement?.el) return;
        const dx = (e.clientX - startX) / editZoom;
        const dy = (e.clientY - startY) / editZoom;
        const parent = el.parentElement;
        if (parent) {
            const left = Math.max(0, Math.min(parent.offsetWidth - el.offsetWidth, initialX + dx));
            const top  = Math.max(0, Math.min(parent.offsetHeight - el.offsetHeight, initialY + dy));
            el.style.left = `${left}px`;
            el.style.top  = `${top}px`;
        } else {
            el.style.left = `${initialX + dx}px`;
            el.style.top  = `${initialY + dy}px`;
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    el.addEventListener('focus', function() { selectElement(el, el.dataset.type); });
    el.addEventListener('input', function() { if (el.dataset.type === 'text') selectElement(el, 'text'); });
}

function setupResizableElement(el, pageObj) {
    if (el.classList.contains('resizable-setup')) return;
    el.classList.add('resizable-setup');

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.position = 'absolute';
    handle.style.right = '-6px';
    handle.style.bottom = '-6px';
    handle.style.width = '12px';
    handle.style.height = '12px';
    handle.style.background = 'var(--primary)';
    handle.style.cursor = 'nwse-resize';
    handle.style.borderRadius = '50%';
    handle.style.display = 'none';
    handle.style.zIndex = '10';

    const currentPosition = getComputedStyle(el).position;
    if (currentPosition === 'static' || !currentPosition) {
        el.style.position = 'relative';
    }
    el.appendChild(handle);

    let isResizing = false, startX, startY, startWidth, startHeight;
    const lockAspect = el.dataset.lockAspect === 'true';

    handle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseFloat(getComputedStyle(el, null).getPropertyValue('width'));
        startHeight = parseFloat(getComputedStyle(el, null).getPropertyValue('height'));
        e.stopPropagation();
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing || el !== selectedEditElement?.el) return;
        const dx = (e.clientX - startX) / editZoom;
        const dy = (e.clientY - startY) / editZoom;
        let width = Math.max(30, startWidth + dx);
        let height = Math.max(30, startHeight + dy);
        if (lockAspect) {
            const scaleDelta = (dx * startWidth + dy * startHeight) / (startWidth ** 2 + startHeight ** 2);
            const scale = Math.max(30 / startWidth, 30 / startHeight, 1 + scaleDelta);
            width = startWidth * scale;
            height = startHeight * scale;
        }
        el.style.width = width + 'px';
        el.style.height = height + 'px';
    });

    document.addEventListener('mouseup', function() {
        isResizing = false;
    });
}

// ---- EDIT TOOL CONTROLS ----
window.setEditTool = function(tool) {
    currentEditTool = tool;
    document.querySelectorAll('.edit-svg-overlay').forEach(overlay => {
        overlay.style.pointerEvents = tool === 'select' ? 'all' : 'none';
    });
    if (tool !== 'pen') document.getElementById('edit-pen-dropdown')?.classList.remove('open');
    if (tool !== 'shape') document.getElementById('edit-shapes-dropdown')?.classList.remove('open');
    ['select','pen','eraser','text'].forEach(t => {
        const btn = document.getElementById('edit-btn-' + t);
        if (btn) btn.classList.toggle('active', t === tool);
    });
    const shapesBtn = document.getElementById('edit-btn-shapes');
    if (shapesBtn) shapesBtn.classList.toggle('active', tool === 'shape');
    const ws = document.getElementById('edit-workspace');
    if (ws) {
        if (tool === 'pen' || tool === 'shape') ws.style.cursor = 'crosshair';
        else if (tool === 'eraser') ws.style.cursor = 'cell';
        else if (tool === 'text') ws.style.cursor = 'text';
        else ws.style.cursor = 'default';
    }
};

function positionDropdown(dd, triggerBtn) {
    const rect = triggerBtn.getBoundingClientRect();
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = rect.left + 'px';
    const ddW = 240;
    if (rect.left + ddW > window.innerWidth) {
        dd.style.left = Math.max(4, window.innerWidth - ddW - 8) + 'px';
    }
}

function closeAllEditDropdowns() {
    document.getElementById('edit-shapes-dropdown')?.classList.remove('open');
    document.getElementById('edit-pen-dropdown')?.classList.remove('open');
}

window.toggleEditShapesMenu = function() {
    const dd = document.getElementById('edit-shapes-dropdown');
    const btn = document.getElementById('edit-btn-shapes');
    if (!dd || !btn) return;
    const penDd = document.getElementById('edit-pen-dropdown');
    if (penDd) penDd.classList.remove('open');
    if (dd.classList.contains('open')) { dd.classList.remove('open'); return; }
    positionDropdown(dd, btn);
    dd.classList.add('open');
};

window.toggleEditPenMenu = function() {
    setEditTool('pen');
    const dd = document.getElementById('edit-pen-dropdown');
    const btn = document.getElementById('edit-btn-pen');
    if (!dd || !btn) return;
    const shapesDd = document.getElementById('edit-shapes-dropdown');
    if (shapesDd) shapesDd.classList.remove('open');
    if (dd.classList.contains('open')) { dd.classList.remove('open'); return; }
    positionDropdown(dd, btn);
    dd.classList.add('open');
};

window.setEditShapeType = function(type) {
    currentEditShape = type;
    setEditTool('shape');
};

window.editUndo = function() {
    if (editUndoStack.length === 0) return;
    const action = editUndoStack.pop();
    const pageObj = visualEditPages[action.pageIndex];
    if (!pageObj) return;
    if (action.type === 'add') {
        action.el.remove();
        pageObj.elements = pageObj.elements.filter(e => e.el !== action.el);
        deselectAll();
    } else if (action.type === 'delete') {
        if (action.el.namespaceURI === 'http://www.w3.org/2000/svg') {
            pageObj.svg.appendChild(action.el);
        } else {
            pageObj.wrapper.appendChild(action.el);
        }
        pageObj.elements.push({ el: action.el, type: action.elemType });
    }
    editRedoStack.push(action);
};

window.editRedo = function() {
    if (editRedoStack.length === 0) return;
    const action = editRedoStack.pop();
    const pageObj = visualEditPages[action.pageIndex];
    if (!pageObj) return;
    if (action.type === 'add') {
        if (action.el.namespaceURI === 'http://www.w3.org/2000/svg') {
            pageObj.svg.appendChild(action.el);
        } else {
            pageObj.wrapper.appendChild(action.el);
        }
        pageObj.elements.push({ el: action.el, type: action.elemType });
    } else if (action.type === 'delete') {
        action.el.remove();
        pageObj.elements = pageObj.elements.filter(e => e.el !== action.el);
        deselectAll();
    }
    editUndoStack.push(action);
};

window.changeEditZoom = function(delta) {
    editZoom = Math.max(0.3, Math.min(3.0, editZoom + delta));
    const container = document.getElementById('edit-zoom-container');
    if (container) {
        container.style.transform = `scale(${editZoom})`;
        container.style.transformOrigin = 'top center';
        const naturalH = container.scrollHeight / editZoom;
        container.style.marginBottom = editZoom > 1 ? (naturalH * (editZoom - 1)) + 'px' : '0';
    }
    const display = document.getElementById('edit-zoom-display');
    if (display) display.textContent = Math.round(editZoom * 100) + '%';
};

// ---- SVG ELEMENT HELPERS ----
function getSvgTranslate(el) {
    const m = (el.getAttribute('transform') || '').match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
}
function setSvgTranslate(el, tx, ty) {
    const other = (el.getAttribute('transform') || '').replace(/translate\([^)]*\)/, '').trim();
    el.setAttribute('transform', `translate(${tx.toFixed(2)},${ty.toFixed(2)})${other ? ' ' + other : ''}`);
}
function updateSvgOverlayBounds(overlay, svgEl, wrapperEl) {
    const pad = 6;
    const rect = getSvgClientRect(svgEl, wrapperEl);
    overlay.style.left = `${rect.left - pad}px`;
    overlay.style.top = `${rect.top - pad}px`;
    overlay.style.width = `${Math.max(20, rect.width) + pad * 2}px`;
    overlay.style.height = `${Math.max(20, rect.height) + pad * 2}px`;
}
function getSvgClientRect(el, wrapperEl) {
    const cr = el.getBoundingClientRect();
    const wr = wrapperEl.getBoundingClientRect();
    return {
        left:   (cr.left   - wr.left) / editZoom,
        top:    (cr.top    - wr.top)  / editZoom,
        width:  cr.width  / editZoom,
        height: cr.height / editZoom
    };
}

// ---- SVG SELECTION OVERLAY ----
function selectSvgElement(svgEl, type, pageObj) {
    deselectAll();
    selectedEditElement = { el: svgEl, type, isSvg: true, pageObj };
    svgEl.setAttribute('data-sel', '1');

    // Sync toolbar colour controls
    const stroke = svgEl.getAttribute('stroke');
    const fill   = svgEl.getAttribute('fill');
    const sw     = svgEl.getAttribute('stroke-width');
    if (stroke) { const el = document.getElementById('edit-stroke-color'); if (el) el.value = stroke; }
    if (fill) {
        editFillColor = fill;
        const el = document.getElementById('edit-fill-color');
        if (el && fill !== 'none') el.value = fill;
        const btn = document.getElementById('edit-fill-color-btn');
        if (btn) {
            if (fill === 'none') {
                btn.classList.add('transparent-pattern');
                btn.style.background = '';
            } else {
                btn.classList.remove('transparent-pattern');
                btn.style.background = fill;
            }
        }
    }
    if (sw) { const el = document.getElementById('edit-stroke-width'); if (el) el.value = sw; }

    syncColorBtn('stroke');
    syncColorBtn('fill');
    _buildSvgOverlay(svgEl, type, pageObj);
}

function _buildSvgOverlay(svgEl, type, pageObj) {
    pageObj.wrapper.querySelectorAll('.edit-svg-overlay').forEach(o => o.remove());

    const pad = 6;
    const cr  = getSvgClientRect(svgEl, pageObj.wrapper);
    const left = cr.left - pad,  top  = cr.top - pad;
    const w    = Math.max(20, cr.width)  + pad * 2;
    const h    = Math.max(20, cr.height) + pad * 2;

    const ov = document.createElement('div');
    ov.className = 'edit-svg-overlay';
    ov.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;`
        + `border:2px dashed var(--primary);cursor:move;z-index:20;box-sizing:border-box;pointer-events:${currentEditTool === 'select' ? 'all' : 'none'};`;

    // Action button group (Copy + Delete)
    const btnGroup = document.createElement('div');
    btnGroup.className = 'edit-ov-btn-group';

    const cloneBtn = document.createElement('button');
    cloneBtn.className = 'edit-ov-btn btn-clone';
    cloneBtn.title = currentLang === 'tr' ? 'Kopyala' : 'Duplicate';
    cloneBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
    cloneBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); copySelectedElement(); });
    btnGroup.appendChild(cloneBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'edit-ov-btn btn-del';
    delBtn.title = currentLang === 'tr' ? 'Sil' : 'Delete';
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    delBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); deleteSelectedElement(); });
    btnGroup.appendChild(delBtn);

    ov.appendChild(btnGroup);

    // Resize handle (bottom-right)
    const rh = document.createElement('div');
    rh.className = 'resize-handle';
    rh.style.cssText = 'position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;'
        + 'background:var(--primary);cursor:nwse-resize;border-radius:50%;z-index:22;';
    ov.appendChild(rh);

    pageObj.wrapper.appendChild(ov);

    // ---- DRAG ----
    let dragSX, dragSY, dragInitL, dragInitT, dragInitTx, dragInitTy;
    ov.addEventListener('mousedown', (e) => {
        if (e.target.closest('.edit-ov-btn') || e.target === rh) return;
        e.stopPropagation(); e.preventDefault();
        dragSX    = e.clientX; dragSY    = e.clientY;
        dragInitL = parseFloat(ov.style.left);
        dragInitT = parseFloat(ov.style.top);
        const t   = getSvgTranslate(svgEl);
        dragInitTx = t.x; dragInitTy = t.y;

        const onMove = (ev) => {
            const dx = (ev.clientX - dragSX) / editZoom;
            const dy = (ev.clientY - dragSY) / editZoom;
            const wrapperW = pageObj.wrapper.offsetWidth;
            const wrapperH = pageObj.wrapper.offsetHeight;
            const ovW = parseFloat(ov.style.width);
            const ovH = parseFloat(ov.style.height);
            const newL = Math.max(0, Math.min(wrapperW - ovW, dragInitL + dx));
            const newT = Math.max(0, Math.min(wrapperH - ovH, dragInitT + dy));
            const clampDx = newL - dragInitL;
            const clampDy = newT - dragInitT;
            setSvgTranslate(svgEl, dragInitTx + clampDx, dragInitTy + clampDy);
            updateSvgOverlayBounds(ov, svgEl, pageObj.wrapper);
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // ---- RESIZE ----
    let resSX, resSY, resInitW, resInitH;
    let initAttrs = {};
    rh.addEventListener('mousedown', (e) => {
        e.stopPropagation(); e.preventDefault();
        resSX = e.clientX; resSY = e.clientY;
        const bounds = getSvgClientRect(svgEl, pageObj.wrapper);
        resInitW = Math.max(1, bounds.width);
        resInitH = Math.max(1, bounds.height);
        const a = (name) => parseFloat(svgEl.getAttribute(name) || 0);
        if (type === 'rectangle') initAttrs = { w: a('width'), h: a('height') };
        else if (type === 'circle')  initAttrs = { r: a('r') };
        else if (type === 'ellipse') initAttrs = { rx: a('rx'), ry: a('ry') };
        else if (type === 'line' || type === 'arrow') initAttrs = { x1: a('x1'), y1: a('y1'), x2: a('x2'), y2: a('y2') };
        else if (type === 'triangle') initAttrs = { pts: svgEl.getAttribute('points') };

        const onMove = (ev) => {
            const dx = (ev.clientX - resSX) / editZoom;
            const dy = (ev.clientY - resSY) / editZoom;
            const newW = Math.max(1, resInitW + dx);
            const newH = Math.max(1, resInitH + dy);
            const sx = newW / resInitW, sy = newH / resInitH;
            _scaleSvgAttrs(svgEl, type, sx, sy, initAttrs);
            updateSvgOverlayBounds(ov, svgEl, pageObj.wrapper);
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

function _scaleSvgAttrs(el, type, sx, sy, init) {
    if (type === 'rectangle') {
        el.setAttribute('width',  Math.max(1, init.w * sx));
        el.setAttribute('height', Math.max(1, init.h * sy));
    } else if (type === 'circle') {
        el.setAttribute('r', Math.max(1, init.r * Math.min(sx, sy)));
    } else if (type === 'ellipse') {
        el.setAttribute('rx', Math.max(1, init.rx * sx));
        el.setAttribute('ry', Math.max(1, init.ry * sy));
    } else if (type === 'line' || type === 'arrow') {
        const dx = init.x2 - init.x1, dy = init.y2 - init.y1;
        el.setAttribute('x2', init.x1 + dx * sx);
        el.setAttribute('y2', init.y1 + dy * sy);
    } else if (type === 'triangle') {
        const pts = init.pts.trim().split(/\s+/).map(p => p.split(',').map(Number));
        const x0 = Math.min(...pts.map(p=>p[0])), y0 = Math.min(...pts.map(p=>p[1]));
        el.setAttribute('points', pts.map(([px,py]) => `${(x0 + (px-x0)*sx).toFixed(2)},${(y0 + (py-y0)*sy).toFixed(2)}`).join(' '));
    } else {
        const existing = (el.getAttribute('transform') || '').replace(/scale\([^)]*\)/, '').trim();
        el.setAttribute('transform', `${existing} scale(${sx.toFixed(3)},${sy.toFixed(3)})`);
    }
}

// ---- MAIN MOUSEDOWN HANDLER ----
function handleEditPageMousedown(e, wrapper, pageIndex) {
    if (e.button !== 0) return;
    const pageObj = visualEditPages[pageIndex];
    if (!pageObj) return;

    if (currentEditPageIndex !== pageIndex) {
        switchEditPage(pageIndex);
    }

    if (currentEditTool === 'select') {
        const isSvgEl = e.target.namespaceURI === 'http://www.w3.org/2000/svg'
            && e.target.id && e.target.id.startsWith('edit-elem-');
        if (isSvgEl) {
            const found = pageObj.elements.find(item => item.el === e.target);
            if (found) { e.stopPropagation(); selectSvgElement(e.target, found.type, pageObj); return; }
        }
        if (e.target.closest && e.target.closest('.edit-svg-overlay')) return;
        if (e.target === wrapper || e.target.tagName === 'CANVAS' || e.target === pageObj.svg) deselectAll();
        return;
    }

    e.preventDefault();
    const rect = wrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / editZoom;
    const y = (e.clientY - rect.top)  / editZoom;

    if (currentEditTool === 'text') {
        const textEl = document.createElement('div');
        textEl.dataset.type = 'text';
        textEl.contentEditable = 'true';
        const fontSize = document.getElementById('edit-font-size')?.value || 24;
        const fontWeight = document.getElementById('edit-font-weight')?.value || '400';
        const fontFamily = document.getElementById('edit-font-family')?.value || 'Arial, sans-serif';
        const textColor = document.getElementById('edit-text-color')?.value || '#000000';
        const fillColor = editFillColor;

        textEl.style.cssText = `position:absolute;left:${x}px;top:${y}px;`
            + `background:${fillColor === 'none' ? 'transparent' : fillColor};`
            + `font-size:${fontSize}px;`
            + `font-weight:${fontWeight};`
            + `font-family:${fontFamily};`
            + `color:${textColor};`
            + `min-width:80px;min-height:30px;padding:4px 8px;cursor:move;z-index:10;`
            + `border:1px dashed transparent;user-select:text;`;
        textEl.textContent = currentLang === 'tr' ? 'Metni düzenle' : 'Edit text';
        textEl.id = 'edit-elem-' + (editElementIdCounter++);
        wrapper.appendChild(textEl);
        setupDraggableElement(textEl, pageObj);
        textEl.addEventListener('mousedown', (ev) => { ev.stopPropagation(); selectElement(textEl, 'text'); });
        pageObj.elements.push({ el: textEl, type: 'text' });
        editUndoStack.push({ type:'add', el:textEl, pageIndex, elemType:'text' });
        editRedoStack = [];
        setTimeout(() => {
            textEl.focus();
            const range = document.createRange();
            range.selectNodeContents(textEl);
            const sel = window.getSelection();
            if (sel) { sel.removeAllRanges(); sel.addRange(range); }
            selectElement(textEl, 'text');
        }, 30);
        return;
    }

    if (currentEditTool === 'eraser') {
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        for (const hit of hits) {
            let el = hit;
            while (el && el !== wrapper) {
                const found = pageObj.elements.find(item => item.el === el);
                if (found) {
                    editUndoStack.push({ type:'delete', el:found.el, pageIndex, elemType:found.type });
                    editRedoStack = [];
                    found.el.remove();
                    pageObj.elements = pageObj.elements.filter(item => item.el !== found.el);
                    if (selectedEditElement?.el === found.el) deselectAll();
                    return;
                }
                el = el.parentElement;
            }
        }
        const PROX = 12;
        for (const { el: elemEl, type: elemType } of pageObj.elements) {
            const br = elemEl.getBoundingClientRect();
            if (e.clientX >= br.left - PROX && e.clientX <= br.right + PROX &&
                e.clientY >= br.top - PROX  && e.clientY <= br.bottom + PROX) {
                editUndoStack.push({ type:'delete', el:elemEl, pageIndex, elemType });
                editRedoStack = [];
                elemEl.remove();
                pageObj.elements = pageObj.elements.filter(item => item.el !== elemEl);
                if (selectedEditElement?.el === elemEl) deselectAll();
                return;
            }
        }
        return;
    }

    if (currentEditTool === 'pen') {
        const svg = pageObj.svg; if (!svg) return;
        let points = [[x, y]];
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke',       document.getElementById('edit-pen-color')?.value   || '#000000');
        path.setAttribute('stroke-width', document.getElementById('edit-pen-width')?.value   || 3);
        path.setAttribute('opacity',      (parseFloat(document.getElementById('edit-pen-opacity')?.value||100)/100).toFixed(2));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.id = 'edit-elem-' + (editElementIdCounter++);
        svg.appendChild(path);
        const updPath = () => { path.setAttribute('d', points.reduce((a,[px,py],i) => i===0?`M${px} ${py}`:`${a} L${px} ${py}`,'')); };
        updPath();
        const onMove = (ev) => {
            const mr = wrapper.getBoundingClientRect();
            points.push([(ev.clientX-mr.left)/editZoom, (ev.clientY-mr.top)/editZoom]);
            updPath();
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (points.length > 1) {
                pageObj.elements.push({ el:path, type:'freehand' });
                editUndoStack.push({ type:'add', el:path, pageIndex, elemType:'freehand' });
                editRedoStack = [];
            } else { path.remove(); }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return;
    }

    if (currentEditTool === 'shape') {
        const svg = pageObj.svg; if (!svg) return;
        const strokeColor  = document.getElementById('edit-stroke-color')?.value || '#000000';
        const fillColor    = editFillColor;
        const strokeWidth  = parseInt(document.getElementById('edit-stroke-width')?.value) || 2;
        const ns = 'http://www.w3.org/2000/svg';
        let shapeEl;

        // Ensure marker exists for arrow if needed
        let markerId = '';
        if (currentEditShape === 'arrow') {
            markerId = 'marker-arrow-' + strokeColor.replace('#','');
            if (!svg.querySelector('#' + markerId)) {
                let defs = svg.querySelector('defs');
                if (!defs) {
                    defs = document.createElementNS(ns, 'defs');
                    svg.insertBefore(defs, svg.firstChild);
                }
                const marker = document.createElementNS(ns, 'marker');
                marker.id = markerId;
                marker.setAttribute('viewBox', '0 0 10 10');
                marker.setAttribute('refX', '6');
                marker.setAttribute('refY', '5');
                marker.setAttribute('markerWidth', '6');
                marker.setAttribute('markerHeight', '6');
                marker.setAttribute('orient', 'auto-start-reverse');
                const mpath = document.createElementNS(ns, 'path');
                mpath.setAttribute('d', 'M 0 1 L 8 5 L 0 9 z');
                mpath.setAttribute('fill', strokeColor);
                marker.appendChild(mpath);
                defs.appendChild(marker);
            }
        }

        if (currentEditShape === 'arrow') {
            shapeEl = document.createElementNS(ns,'line');
            shapeEl.setAttribute('x1', x); shapeEl.setAttribute('y1', y);
            shapeEl.setAttribute('x2', x); shapeEl.setAttribute('y2', y);
            shapeEl.setAttribute('stroke', strokeColor);
            shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('marker-end', `url(#${markerId})`);
            shapeEl.setAttribute('stroke-linecap', 'round');
        } else if (currentEditShape === 'line') {
            shapeEl = document.createElementNS(ns,'line');
            shapeEl.setAttribute('x1', x); shapeEl.setAttribute('y1', y);
            shapeEl.setAttribute('x2', x); shapeEl.setAttribute('y2', y);
            shapeEl.setAttribute('stroke', strokeColor);
            shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('stroke-linecap', 'round');
        } else if (currentEditShape === 'circle') {
            shapeEl = document.createElementNS(ns,'circle');
            shapeEl.setAttribute('cx', x); shapeEl.setAttribute('cy', y); shapeEl.setAttribute('r', 1);
            shapeEl.setAttribute('stroke', strokeColor); shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('fill', fillColor === 'none' ? 'none' : fillColor);
        } else if (currentEditShape === 'ellipse') {
            shapeEl = document.createElementNS(ns,'ellipse');
            shapeEl.setAttribute('cx', x); shapeEl.setAttribute('cy', y); shapeEl.setAttribute('rx', 1); shapeEl.setAttribute('ry', 1);
            shapeEl.setAttribute('stroke', strokeColor); shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('fill', fillColor === 'none' ? 'none' : fillColor);
        } else if (currentEditShape === 'triangle') {
            shapeEl = document.createElementNS(ns,'polygon');
            shapeEl.setAttribute('points', `${x},${y} ${x},${y} ${x},${y}`);
            shapeEl.setAttribute('stroke', strokeColor); shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('fill', fillColor === 'none' ? 'none' : fillColor);
        } else {
            // rectangle / box
            shapeEl = document.createElementNS(ns,'rect');
            shapeEl.setAttribute('x', x); shapeEl.setAttribute('y', y); shapeEl.setAttribute('width', 1); shapeEl.setAttribute('height', 1);
            shapeEl.setAttribute('stroke', strokeColor); shapeEl.setAttribute('stroke-width', strokeWidth);
            shapeEl.setAttribute('fill', fillColor === 'none' ? 'none' : fillColor);
            shapeEl.setAttribute('rx', '2');
        }

        shapeEl.id = 'edit-elem-' + (editElementIdCounter++);
        shapeEl.setAttribute('pointer-events', 'all');
        svg.appendChild(shapeEl);
        const sX = x, sY = y;
        const onMove = (ev) => {
            const mr = wrapper.getBoundingClientRect();
            const mx = (ev.clientX - mr.left) / editZoom, my = (ev.clientY - mr.top) / editZoom;
            const w = Math.abs(mx - sX), h = Math.abs(my - sY);
            const minX = Math.min(sX, mx), minY = Math.min(sY, my);
            if (currentEditShape === 'line' || currentEditShape === 'arrow') {
                shapeEl.setAttribute('x2', mx); shapeEl.setAttribute('y2', my);
            } else if (currentEditShape === 'circle') {
                const r = Math.max(1, Math.max(w, h) / 2);
                shapeEl.setAttribute('cx', (sX + mx) / 2); shapeEl.setAttribute('cy', (sY + my) / 2); shapeEl.setAttribute('r', r);
            } else if (currentEditShape === 'ellipse') {
                shapeEl.setAttribute('cx', (sX + mx) / 2); shapeEl.setAttribute('cy', (sY + my) / 2);
                shapeEl.setAttribute('rx', Math.max(1, w / 2)); shapeEl.setAttribute('ry', Math.max(1, h / 2));
            } else if (currentEditShape === 'triangle') {
                shapeEl.setAttribute('points', `${(sX + mx) / 2},${minY} ${minX},${minY + h} ${minX + w},${minY + h}`);
            } else {
                shapeEl.setAttribute('x', minX); shapeEl.setAttribute('y', minY);
                shapeEl.setAttribute('width', Math.max(1, w)); shapeEl.setAttribute('height', Math.max(1, h));
            }
        };
        const drawnType = currentEditShape;
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            pageObj.elements.push({ el: shapeEl, type: drawnType });
            editUndoStack.push({ type: 'add', el: shapeEl, pageIndex, elemType: drawnType });
            editRedoStack = [];
            setTimeout(() => selectSvgElement(shapeEl, drawnType, pageObj), 30);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return;
    }
}

function selectElement(el, type) {
    deselectAll();
    const pageObj = visualEditPages.find(p => p.wrapper.contains(el)) || visualEditPages[currentEditPageIndex];
    selectedEditElement = { el, type, pageObj };
    el.style.boxSizing = 'border-box';
    el.style.outline = '2px dashed var(--primary)';
    el.style.outlineOffset = '-2px';

    if (type === 'text') {
        document.getElementById('edit-text-color-label').style.display = 'flex';
        document.getElementById('edit-fill-color-label').style.display = 'flex';
        document.getElementById('edit-stroke-color-label').style.display = 'flex';
        document.getElementById('edit-stroke-width-label').style.display = 'flex';
        document.getElementById('edit-font-size-label').style.display = 'flex';
        document.getElementById('edit-font-weight-label').style.display = 'flex';
        document.getElementById('edit-font-family-label').style.display = 'flex';

        document.getElementById('edit-text-color').value = rgbToHex(el.style.color || '#000000');
        document.getElementById('edit-font-size').value = parseInt(el.style.fontSize) || 24;
        document.getElementById('edit-font-weight').value = el.style.fontWeight || '400';
        document.getElementById('edit-font-family').value = el.style.fontFamily || 'Arial, sans-serif';

        const bg = el.style.background && el.style.background !== 'transparent' ? rgbToHex(el.style.background) : 'none';
        editFillColor = bg;
        if (bg !== 'none') document.getElementById('edit-fill-color').value = bg;
        const fillBtn = document.getElementById('edit-fill-color-btn');
        if (fillBtn) {
            if (bg === 'none') {
                fillBtn.classList.add('transparent-pattern');
                fillBtn.style.background = '';
            } else {
                fillBtn.classList.remove('transparent-pattern');
                fillBtn.style.background = bg;
            }
        }

        const borderColor = el.style.borderColor && el.style.borderColor !== 'transparent' ? el.style.borderColor : '#000000';
        document.getElementById('edit-stroke-color').value = rgbToHex(borderColor);
        document.getElementById('edit-stroke-width').value = parseInt(el.style.borderWidth) || 0;

        syncColorBtn('fill');
        syncColorBtn('stroke');
        syncColorBtn('text');
    } else if (type === 'image') {
        document.getElementById('edit-text-color-label').style.display = 'none';
        document.getElementById('edit-fill-color-label').style.display = 'none';
        document.getElementById('edit-stroke-color-label').style.display = 'none';
        document.getElementById('edit-stroke-width-label').style.display = 'none';
        document.getElementById('edit-font-size-label').style.display = 'none';
        document.getElementById('edit-font-weight-label').style.display = 'none';
        document.getElementById('edit-font-family-label').style.display = 'none';
    } else {
        document.getElementById('edit-text-color-label').style.display = 'none';
        document.getElementById('edit-fill-color-label').style.display = 'flex';
        document.getElementById('edit-stroke-color-label').style.display = 'flex';
        document.getElementById('edit-stroke-width-label').style.display = 'flex';
        document.getElementById('edit-font-size-label').style.display = 'none';
        document.getElementById('edit-font-weight-label').style.display = 'none';
        document.getElementById('edit-font-family-label').style.display = 'none';

        const fillColor = el.style.background && el.style.background !== 'transparent' ? rgbToHex(el.style.background) : 'none';
        editFillColor = fillColor;
        if (fillColor !== 'none') document.getElementById('edit-fill-color').value = fillColor;
        document.getElementById('edit-stroke-width').value = parseInt(el.style.borderWidth) || 2;
        syncColorBtn('stroke');
        syncColorBtn('fill');
    }

    const handle = el.querySelector('.resize-handle');
    if (handle) handle.style.display = 'block';
}

function deselectAll() {
    selectedEditElement = null;
    visualEditPages.forEach(pageObj => {
        pageObj.wrapper.querySelectorAll('.edit-svg-overlay').forEach(o => o.remove());
        pageObj.wrapper.querySelectorAll('[data-sel]').forEach(el => el.removeAttribute('data-sel'));
        pageObj.wrapper.querySelectorAll('[id^="edit-elem-"]').forEach(el => {
            if (el.style) {
                el.style.outline = 'none';
            }
            const handle = el.querySelector('.resize-handle');
            if (handle) handle.style.display = 'none';
        });
    });
}

function syncColorBtn(type) {
    const map = { stroke:['edit-stroke-color','edit-stroke-color-btn'], fill:['edit-fill-color','edit-fill-color-btn'], text:['edit-text-color','edit-text-color-btn'] };
    const [inputId, btnId] = map[type] || [];
    if (!inputId) return;
    const v = type === 'fill' ? editFillColor : document.getElementById(inputId)?.value;
    const b = document.getElementById(btnId);
    if (!b) return;
    if (type === 'fill' && (v === 'none' || !v)) {
        b.classList.add('transparent-pattern');
        b.style.background = '';
    } else {
        b.classList.remove('transparent-pattern');
        if (v) b.style.background = v;
    }
}
window.syncColorBtn = syncColorBtn;

window.showColorPalette = function(type, btn) {
    const existing = document.getElementById('edit-color-palette');
    if (existing) { existing.remove(); if (window._palType === type) { window._palType = null; return; } }
    window._palType = type;
    const inputId = { stroke: 'edit-stroke-color', fill: 'edit-fill-color', text: 'edit-text-color' }[type];
    const input = document.getElementById(inputId);
    if (!input) return;

    const colors = ['#000000','#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#1e293b','#475569','#d97706','#16a34a','#dc2626','#7c3aed','#0ea5e9','#db2777','#65a30d','#0f172a'];
    const pal = document.createElement('div');
    pal.id = 'edit-color-palette';
    pal.style.cssText = 'position:fixed;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:grid;grid-template-columns:repeat(5,26px);gap:5px;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.18);';
    const r = btn.getBoundingClientRect();
    pal.style.top  = (r.bottom + 6) + 'px';
    pal.style.left = Math.min(r.left, window.innerWidth - 180) + 'px';

    function pick(val) {
        if (type === 'fill') editFillColor = val;
        if (val === 'none') {
            if (selectedEditElement?.isSvg) {
                selectedEditElement.el.setAttribute('fill', 'none');
            } else if (selectedEditElement?.type === 'text') {
                selectedEditElement.el.style.background = 'transparent';
            }
            if (selectedEditElement && type === 'fill') updateSelectedElementStyle();
            const b = document.getElementById('edit-fill-color-btn');
            if (b) {
                b.classList.add('transparent-pattern');
                b.style.background = '';
            }
        } else {
            input.value = val;
            const b = document.getElementById(type === 'fill' ? 'edit-fill-color-btn' : type === 'stroke' ? 'edit-stroke-color-btn' : 'edit-text-color-btn');
            if (b) {
                b.classList.remove('transparent-pattern');
                b.style.background = val;
            }
            if (selectedEditElement) updateSelectedElementStyle();
        }
        pal.remove(); window._palType = null;
    }

    if (type === 'fill') {
        const t = document.createElement('button');
        t.style.cssText = 'grid-column:1/-1;width:100%;height:26px;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;color:#64748b;border:2px solid #cbd5e1;background:repeating-conic-gradient(#e2e8f0 0% 25%,white 0% 50%) 0/10px 10px;';
        t.textContent = currentLang === 'tr' ? '✕  Şeffaf / Dolgu Yok' : currentLang === 'de' ? '✕  Transparent' : '✕  Transparent (No Fill)';
        t.onclick = (e) => { e.stopPropagation(); pick('none'); };
        pal.appendChild(t);
    }

    colors.forEach(c => {
        const sw = document.createElement('button');
        sw.style.cssText = `width:26px;height:26px;background:${c};border-radius:5px;cursor:pointer;border:2px solid ${c==='#ffffff'?'#e2e8f0':'transparent'};transition:transform 0.1s;`;
        sw.onmouseenter = () => sw.style.transform = 'scale(1.2)';
        sw.onmouseleave = () => sw.style.transform = '';
        sw.onclick = (e) => { e.stopPropagation(); pick(c); };
        pal.appendChild(sw);
    });

    const custom = document.createElement('button');
    custom.title = currentLang === 'tr' ? 'Özel renk' : 'Custom color';
    custom.textContent = '✎';
    custom.style.cssText = 'width:26px;height:26px;border-radius:5px;cursor:pointer;font-size:1rem;border:2px solid #e2e8f0;background:#f8fafc;';
    custom.onclick = (e) => {
        e.stopPropagation();
        input.style.cssText = `position:fixed;top:${r.bottom}px;left:${r.left}px;opacity:1;width:1px;height:1px;z-index:99999;pointer-events:auto;`;
        input.click(); pal.remove(); window._palType = null;
        input.addEventListener('change', () => {
            input.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
            if (type === 'fill') editFillColor = input.value;
            syncColorBtn(type);
            if (selectedEditElement) updateSelectedElementStyle();
        }, { once: true });
    };
    pal.appendChild(custom);
    document.body.appendChild(pal);

    setTimeout(() => {
        document.addEventListener('click', function closeP(e) {
            if (!pal.contains(e.target)) { pal.remove(); window._palType = null; document.removeEventListener('click', closeP); }
        });
    }, 0);
};

window.setEditFillColor = function(color) {
    editFillColor = color;
    syncColorBtn('fill');
    updateSelectedElementStyle();
};

window.updateSelectedElementStyle = function() {
    if (!selectedEditElement) return;
    const { el, type, isSvg } = selectedEditElement;

    if (isSvg) {
        const stroke = document.getElementById('edit-stroke-color')?.value;
        const fill   = editFillColor;
        const sw     = document.getElementById('edit-stroke-width')?.value;
        if (stroke && type !== 'freehand') {
            el.setAttribute('stroke', stroke);
            if (type === 'arrow') {
                const marker = el.ownerSVGElement?.querySelector('marker path');
                if (marker) marker.setAttribute('fill', stroke);
            }
        }
        if (fill && type !== 'freehand' && type !== 'line' && type !== 'arrow') {
            el.setAttribute('fill', fill === 'none' ? 'none' : fill);
        }
        if (sw) el.setAttribute('stroke-width', sw);
    } else if (type === 'text') {
        const color       = document.getElementById('edit-text-color')?.value || '#000000';
        const size        = document.getElementById('edit-font-size')?.value || 24;
        const weight      = document.getElementById('edit-font-weight')?.value || '400';
        const fontFamily  = document.getElementById('edit-font-family')?.value || 'Arial, sans-serif';
        const fillColor   = editFillColor;
        const strokeColor = document.getElementById('edit-stroke-color')?.value || '#000000';
        const strokeWidth = parseInt(document.getElementById('edit-stroke-width')?.value) || 0;

        el.style.color = color;
        el.style.fontSize = size + 'px';
        el.style.fontWeight = weight;
        el.style.fontFamily = fontFamily;
        el.style.background = fillColor === 'none' ? 'transparent' : fillColor;
        if (strokeWidth > 0) {
            el.style.borderWidth = strokeWidth + 'px';
            el.style.borderColor = strokeColor;
            el.style.borderStyle = 'solid';
        } else {
            el.style.borderWidth = '0px';
            el.style.borderColor = 'transparent';
        }
    } else {
        const fillColor   = editFillColor;
        const strokeColor = document.getElementById('edit-stroke-color')?.value || '#000000';
        const strokeWidth = document.getElementById('edit-stroke-width')?.value || 2;
        el.style.background  = fillColor === 'none' ? 'transparent' : fillColor;
        el.style.borderWidth = strokeWidth + 'px';
        el.style.borderColor = strokeColor;
        el.style.borderStyle = 'solid';
    }
};

window.copySelectedElement = function() {
    if (!selectedEditElement) return;
    const { el, type, isSvg, pageObj: svgPageObj } = selectedEditElement;
    const pageObj = svgPageObj || visualEditPages.find(p => p.wrapper.contains(el)) || visualEditPages[currentEditPageIndex];
    const pageIndex = visualEditPages.indexOf(pageObj);

    const clone = el.cloneNode(true);
    clone.id = 'edit-elem-' + (editElementIdCounter++);
    clone.removeAttribute('data-sel');
    clone.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
    clone.classList.remove('resizable-setup');

    if (isSvg) {
        const t = getSvgTranslate(clone);
        setSvgTranslate(clone, t.x + 20, t.y + 20);
        pageObj.svg.appendChild(clone);
        pageObj.elements.push({ el: clone, type });
        editUndoStack.push({ type: 'add', el: clone, pageIndex, elemType: type });
        editRedoStack = [];
        setTimeout(() => selectSvgElement(clone, type, pageObj), 30);
    } else {
        clone.style.left = (parseFloat(el.style.left || 0) + 20) + 'px';
        clone.style.top  = (parseFloat(el.style.top || 0)  + 20) + 'px';
        setupDraggableElement(clone, pageObj);
        if (type !== 'text') setupResizableElement(clone, pageObj);
        pageObj.wrapper.appendChild(clone);
        pageObj.elements.push({ el: clone, type });
        editUndoStack.push({ type: 'add', el: clone, pageIndex, elemType: type });
        editRedoStack = [];
        selectElement(clone, type);
    }
};

window.deleteSelectedElement = function() {
    if (!selectedEditElement) return;
    const { el, type, isSvg, pageObj: svgPageObj } = selectedEditElement;
    const pageObj = svgPageObj || visualEditPages.find(p => p.wrapper.contains(el)) || visualEditPages[currentEditPageIndex];
    const pageIndex = visualEditPages.indexOf(pageObj);
    editUndoStack.push({ type: 'delete', el, pageIndex, elemType: type });
    editRedoStack = [];
    el.remove();
    if (pageObj) pageObj.elements = pageObj.elements.filter(e => e.el !== el);
    deselectAll();
};

function rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'none' || rgbStr === 'transparent') return '#000000';
    if (rgbStr.startsWith('#')) return rgbStr;
    const rgb = rgbStr.match(/\d+/g);
    if (!rgb || rgb.length < 3) return '#000000';
    return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
}

function hexToRgb(hex) {
    if (!hex || hex === 'none' || hex === 'transparent') return [0, 0, 0];
    if (hex.startsWith('rgb')) { const m = hex.match(/\d+/g); return m ? [parseInt(m[0])/255, parseInt(m[1])/255, parseInt(m[2])/255] : [0,0,0]; }
    hex = hex.replace('#',''); if (hex.length===3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return [parseInt(hex.substring(0,2),16)/255, parseInt(hex.substring(2,4),16)/255, parseInt(hex.substring(4,6),16)/255];
}

// =====================================================
// SIGNATURE MODAL
// =====================================================
let sigDrawColor = '#000000';
let sigDrawing = false;
let sigLastX = 0, sigLastY = 0;

window.openSigModal = function() {
    if (visualEditPages.length === 0) return;
    document.getElementById('sig-modal').style.display = 'flex';
    initSigCanvas();
};
window.closeSigModal = function() {
    document.getElementById('sig-modal').style.display = 'none';
};
window.switchSigTab = function(tab) {
    ['type','draw','upload'].forEach(t => {
        document.getElementById('sig-tab-'+t).style.display = t===tab ? 'block' : 'none';
        const btn = document.querySelector(`.sig-tab[data-tab="${t}"]`);
        if (btn) {
            btn.style.background = t===tab ? 'var(--primary)' : 'white';
            btn.style.color = t===tab ? 'white' : '#444';
            btn.classList.toggle('active', t===tab);
        }
    });
    if (tab === 'draw') initSigCanvas();
};
window.setSigDrawColor = function(color) {
    sigDrawColor = color;
    document.querySelectorAll('.sig-color-btn').forEach(b => b.classList.toggle('active', b.dataset.color===color));
};
window.clearSigCanvas = function() {
    const c = document.getElementById('sig-draw-canvas');
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
};
window.loadSigUpload = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('sig-upload-preview');
        img.src = e.target.result;
        img.style.display = 'block';
    };
    reader.readAsDataURL(file);
};
function initSigCanvas() {
    const canvas = document.getElementById('sig-draw-canvas');
    if (!canvas || canvas.dataset.init) return;
    canvas.dataset.init = '1';
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = sigDrawColor; ctx.lineWidth = 2; ctx.lineCap = 'round';
    canvas.addEventListener('mousedown', (e) => {
        sigDrawing = true;
        const r = canvas.getBoundingClientRect();
        sigLastX = e.clientX - r.left; sigLastY = e.clientY - r.top;
        ctx.beginPath(); ctx.moveTo(sigLastX, sigLastY);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!sigDrawing) return;
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        ctx.strokeStyle = sigDrawColor; ctx.lineWidth = 2;
        ctx.lineTo(x, y); ctx.stroke();
        sigLastX = x; sigLastY = y;
    });
    canvas.addEventListener('mouseup', () => { sigDrawing = false; });
    canvas.addEventListener('mouseleave', () => { sigDrawing = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const t=e.touches[0], r=canvas.getBoundingClientRect(); sigDrawing=true; sigLastX=t.clientX-r.left; sigLastY=t.clientY-r.top; ctx.beginPath(); ctx.moveTo(sigLastX,sigLastY); }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if(!sigDrawing) return; const t=e.touches[0], r=canvas.getBoundingClientRect(); const x=t.clientX-r.left,y=t.clientY-r.top; ctx.strokeStyle=sigDrawColor; ctx.lineWidth=2; ctx.lineTo(x,y); ctx.stroke(); sigLastX=x; sigLastY=y; }, {passive:false});
    canvas.addEventListener('touchend', () => { sigDrawing=false; });
}

function getVisibleEditPageIndex() {
    let bestIndex = currentEditPageIndex;
    let bestArea = -1;
    visualEditPages.forEach((pageObj, idx) => {
        const rect = pageObj.wrapper.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        if (visibleArea > bestArea) {
            bestArea = visibleArea;
            bestIndex = idx;
        }
    });
    return bestIndex;
}

window.applySig = async function() {
    const activeTab = document.querySelector('.sig-tab.active')?.dataset.tab || 'type';
    let dataUrl = null;

    if (activeTab === 'type') {
        const text = document.getElementById('sig-text-input').value.trim();
        if (!text) { alert(currentLang==='tr'?'İmza metni girin':'Enter signature text'); return; }
        const font = document.getElementById('sig-font-select').value || 'Dancing Script';
        const c = document.createElement('canvas'); c.width=500; c.height=120;
        const ctx = c.getContext('2d');
        ctx.clearRect(0,0,500,120);
        ctx.font = `60px "${font}"`;
        ctx.fillStyle = '#000000';
        ctx.fillText(text, 10, 80);
        dataUrl = c.toDataURL('image/png');
    } else if (activeTab === 'draw') {
        const c = document.getElementById('sig-draw-canvas');
        dataUrl = c.toDataURL('image/png');
    } else if (activeTab === 'upload') {
        const img = document.getElementById('sig-upload-preview');
        if (!img.src || img.style.display==='none') { alert(currentLang==='tr'?'Resim yükleyin':'Upload an image'); return; }
        dataUrl = img.src;
    }

    if (!dataUrl) return;

    let pageIndex = typeof lastTouchedEditPageIndex === 'number' ? lastTouchedEditPageIndex : currentEditPageIndex;
    if (!visualEditPages[pageIndex]) pageIndex = currentEditPageIndex;
    const visiblePageIndex = getVisibleEditPageIndex();
    if ((pageIndex == null || !visualEditPages[pageIndex]) && typeof visiblePageIndex === 'number' && visualEditPages[visiblePageIndex]) {
        pageIndex = visiblePageIndex;
    }
    if (!visualEditPages[pageIndex]) pageIndex = currentEditPageIndex;
    const pageObj = visualEditPages[pageIndex];
    if (!pageObj) return;
    if (pageIndex !== currentEditPageIndex) {
        currentEditPageIndex = pageIndex;
        updatePageTabs();
    }

    const dimensions = await new Promise(resolve => {
        const probe = new Image();
        probe.onload = () => resolve({ width: probe.naturalWidth || 500, height: probe.naturalHeight || 120 });
        probe.onerror = () => resolve({ width: 500, height: 120 });
        probe.src = dataUrl;
    });
    const signature = document.createElement('div');
    signature.dataset.type = 'image';
    signature.dataset.lockAspect = 'true';
    signature.style.cssText = `position:absolute;left:50px;top:50px;width:200px;height:${200 * dimensions.height / dimensions.width}px;cursor:move;z-index:10;`;
    signature.id = 'edit-elem-' + (editElementIdCounter++);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.draggable = false;
    img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;';
    signature.appendChild(img);
    pageObj.wrapper.appendChild(signature);
    setupDraggableElement(signature, pageObj);
    setupResizableElement(signature, pageObj);
    pageObj.elements.push({ el:signature, type:'image' });
    editUndoStack.push({ type:'add', el:signature, pageIndex, elemType:'image' });
    editRedoStack = [];
    selectElement(signature, 'image');
    closeSigModal();
};

async function performEdit() {
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
    const courierFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
    const courierBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBold);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageObj = visualEditPages[i];
        if (!pageObj) continue;
        const sc = pageObj.scale, pH = pageObj.pdfH;

        for (const { el, type } of pageObj.elements) {
            const tr = getSvgTranslate(el);
            try {
                if (type === 'text') {
                    const rect = el.getBoundingClientRect();
                    const wr = pageObj.wrapper.getBoundingClientRect();
                    const pdfX = (rect.left - wr.left) / sc;
                    const fs = parseInt(el.style.fontSize) || 24;
                    const pdfFs = fs / sc;
                    const pdfY = pH - (rect.top - wr.top) / sc - pdfFs;
                    const safe = el.textContent.replace(/[\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]/g, m => ({'\u00e7':'c','\u011f':'g','\u0131':'i','\u00f6':'o','\u015f':'s','\u00fc':'u','\u00c7':'C','\u011e':'G','\u0130':'I','\u00d6':'O','\u015e':'S','\u00dc':'U'}[m]||m));
                    if (safe.trim()) {
                        const [r,g,b] = hexToRgb(rgbToHex(el.style.color));
                        const ff = (el.style.fontFamily || '').toLowerCase();
                        const isBold = el.style.fontWeight === '700' || el.style.fontWeight === 'bold';
                        let targetFont = isBold ? boldFont : font;
                        if (ff.includes('times')) targetFont = isBold ? timesBoldFont : timesFont;
                        else if (ff.includes('courier')) targetFont = isBold ? courierBoldFont : courierFont;

                        // Check if text has background fill
                        const bgFill = el.style.background;
                        if (bgFill && bgFill !== 'transparent' && bgFill !== 'none') {
                            const [bgr, bgg, bgb] = hexToRgb(rgbToHex(bgFill));
                            const textW = targetFont.widthOfTextAtSize(safe, pdfFs);
                            const textH = targetFont.heightAtSize(pdfFs);
                            page.drawRectangle({
                                x: pdfX - 2,
                                y: pdfY - 2,
                                width: textW + 4,
                                height: textH + 4,
                                color: PDFLib.rgb(bgr, bgg, bgb),
                                opacity: 0.95
                            });
                        }

                        page.drawText(safe, { x: pdfX, y: pdfY, size: pdfFs, font: targetFont, color: PDFLib.rgb(r,g,b) });
                    }
                } else if (type === 'image') {
                    const imgEl = el.tagName==='IMG' ? el : el.querySelector('img');
                    if (!imgEl?.src) continue;
                    const rect = el.getBoundingClientRect(), wr = pageObj.wrapper.getBoundingClientRect();
                    const w = rect.width/sc, h = rect.height/sc;
                    const pdfX = (rect.left-wr.left)/sc, pdfY = pH-(rect.top-wr.top)/sc-h;
                    const imgBytes = await (await fetch(imgEl.src)).arrayBuffer();
                    const image = imgEl.src.includes('image/png')||imgEl.src.includes('data:image/png') ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                    page.drawImage(image, { x:pdfX, y:pdfY, width:w, height:h });
                } else if (type === 'freehand') {
                    const d = el.getAttribute('d')||'';
                    const [sr,sg,sb] = hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw = parseFloat(el.getAttribute('stroke-width')||2)/sc;
                    const cmds = d.trim().split(/(?=[ML])/);
                    const pts = cmds.map(cmd => { const p = cmd.substring(1).trim().split(/[\s,]+/); return { x:(parseFloat(p[0])+tr.x)/sc, y:pH-(parseFloat(p[1])+tr.y)/sc }; }).filter(p=>!isNaN(p.x));
                    for (let j=0; j<pts.length-1; j++) page.drawLine({ start:pts[j], end:pts[j+1], thickness:Math.max(0.5,sw), color:PDFLib.rgb(sr,sg,sb) });
                } else if (type === 'rectangle') {
                    const x=(parseFloat(el.getAttribute('x')||0)+tr.x)/sc, y=parseFloat(el.getAttribute('y')||0)+tr.y;
                    const w=parseFloat(el.getAttribute('width')||1)/sc, h=parseFloat(el.getAttribute('height')||1)/sc;
                    const fillAttrR=el.getAttribute('fill')||'none';
                    const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw=parseFloat(el.getAttribute('stroke-width')||1)/sc;
                    const rectOpts={ x, y:pH-y/sc-h, width:w, height:h, borderColor:PDFLib.rgb(sr,sg,sb), borderWidth:Math.max(0.3,sw), borderOpacity:1 };
                    if (fillAttrR === 'none' || fillAttrR === 'transparent') {
                        rectOpts.opacity = 0;
                    } else {
                        const [fr,fg,fb]=hexToRgb(fillAttrR);
                        rectOpts.color = PDFLib.rgb(fr,fg,fb);
                        rectOpts.opacity = 1;
                    }
                    page.drawRectangle(rectOpts);
                } else if (type === 'circle') {
                    const cx=(parseFloat(el.getAttribute('cx')||0)+tr.x)/sc, cy=parseFloat(el.getAttribute('cy')||0)+tr.y;
                    const r=parseFloat(el.getAttribute('r')||1)/sc;
                    const fillAttrC=el.getAttribute('fill')||'none';
                    const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw=parseFloat(el.getAttribute('stroke-width')||1)/sc;
                    const circleOpts={ x:cx, y:pH-cy/sc, size:r, borderColor:PDFLib.rgb(sr,sg,sb), borderWidth:Math.max(0.3,sw), borderOpacity:1 };
                    if (fillAttrC === 'none' || fillAttrC === 'transparent') {
                        circleOpts.opacity = 0;
                    } else {
                        const [fr,fg,fb]=hexToRgb(fillAttrC);
                        circleOpts.color = PDFLib.rgb(fr,fg,fb);
                        circleOpts.opacity = 1;
                    }
                    page.drawCircle(circleOpts);
                } else if (type === 'ellipse') {
                    const cx=(parseFloat(el.getAttribute('cx')||0)+tr.x)/sc, cy=parseFloat(el.getAttribute('cy')||0)+tr.y;
                    const rx=parseFloat(el.getAttribute('rx')||1)/sc, ry=parseFloat(el.getAttribute('ry')||1)/sc;
                    const fillAttrE=el.getAttribute('fill')||'none';
                    const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw=parseFloat(el.getAttribute('stroke-width')||1)/sc;
                    const ellipseOpts={ x:cx, y:pH-cy/sc, xScale:rx, yScale:ry, borderColor:PDFLib.rgb(sr,sg,sb), borderWidth:Math.max(0.3,sw), borderOpacity:1 };
                    if (fillAttrE === 'none' || fillAttrE === 'transparent') {
                        ellipseOpts.opacity = 0;
                    } else {
                        const [fr,fg,fb]=hexToRgb(fillAttrE);
                        ellipseOpts.color = PDFLib.rgb(fr,fg,fb);
                        ellipseOpts.opacity = 1;
                    }
                    page.drawEllipse(ellipseOpts);
                } else if (type === 'line') {
                    const x1=(parseFloat(el.getAttribute('x1')||0)+tr.x)/sc, y1=parseFloat(el.getAttribute('y1')||0)+tr.y;
                    const x2=(parseFloat(el.getAttribute('x2')||0)+tr.x)/sc, y2=parseFloat(el.getAttribute('y2')||0)+tr.y;
                    const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw=parseFloat(el.getAttribute('stroke-width')||1)/sc;
                    page.drawLine({ start:{x:x1,y:pH-y1/sc}, end:{x:x2,y:pH-y2/sc}, thickness:Math.max(0.3,sw), color:PDFLib.rgb(sr,sg,sb) });
                } else if (type === 'arrow') {
                    const x1=(parseFloat(el.getAttribute('x1')||0)+tr.x)/sc, y1=parseFloat(el.getAttribute('y1')||0)+tr.y;
                    const x2=(parseFloat(el.getAttribute('x2')||0)+tr.x)/sc, y2=parseFloat(el.getAttribute('y2')||0)+tr.y;
                    const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                    const sw=parseFloat(el.getAttribute('stroke-width')||2)/sc;
                    const strokeColor = PDFLib.rgb(sr,sg,sb);
                    const startPt = { x: x1, y: pH - y1 / sc };
                    const endPt = { x: x2, y: pH - y2 / sc };
                    page.drawLine({ start: startPt, end: endPt, thickness: Math.max(0.5, sw), color: strokeColor });

                    // Draw arrowhead at end point
                    const angle = Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x);
                    const arrowHeadLen = Math.max(8, sw * 4);
                    const angle1 = angle + Math.PI * 0.85;
                    const angle2 = angle - Math.PI * 0.85;
                    const tip1 = { x: endPt.x + arrowHeadLen * Math.cos(angle1), y: endPt.y + arrowHeadLen * Math.sin(angle1) };
                    const tip2 = { x: endPt.x + arrowHeadLen * Math.cos(angle2), y: endPt.y + arrowHeadLen * Math.sin(angle2) };
                    page.drawLine({ start: endPt, end: tip1, thickness: Math.max(0.5, sw), color: strokeColor });
                    page.drawLine({ start: endPt, end: tip2, thickness: Math.max(0.5, sw), color: strokeColor });
                } else if (type === 'triangle') {
                    const rawPts=(el.getAttribute('points')||'').trim().split(/\s+/);
                    const pts=rawPts.map(p=>{const v=p.split(',').map(Number); return v.length===2&&!isNaN(v[0])&&!isNaN(v[1])?v:null;}).filter(Boolean);
                    if (pts.length>=3) {
                        const [sr,sg,sb]=hexToRgb(el.getAttribute('stroke')||'#000000');
                        const sw=parseFloat(el.getAttribute('stroke-width')||1)/sc;
                        const lc=PDFLib.rgb(sr,sg,sb), th=Math.max(0.5,sw);
                        const pp=pts.map(([px,py])=>({x:(px+tr.x)/sc, y:pH-(py+tr.y)/sc}));
                        page.drawLine({start:pp[0],end:pp[1],thickness:th,color:lc});
                        page.drawLine({start:pp[1],end:pp[2],thickness:th,color:lc});
                        page.drawLine({start:pp[2],end:pp[0],thickness:th,color:lc});
                    }
                }
            } catch(err) { console.warn('performEdit element error:', type, err); }
        }
    }

    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'duzenlenmis.pdf' };
}

// =====================================================
// REDACT TOOL - Interactive Canvas Region Selection
// =====================================================
async function loadRedactPreview() {
    const container = document.getElementById('redact-pages-container');
    const loading = document.getElementById('redact-loading');
    container.innerHTML = '';
    redactRegions = {};
    loading.style.display = 'block';
    actionBtn.disabled = true;
    
    try {
        const file = selectedFiles[0];
        const pdfBytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.8 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'redact-page-wrapper';
            
            const title = document.createElement('h4');
            title.textContent = `${currentLang === 'tr' ? 'Sayfa' : 'Page'} ${i}`;
            
            const canvasContainer = document.createElement('div');
            canvasContainer.className = 'redact-canvas-container';
            canvasContainer.dataset.pageIndex = i - 1;
            canvasContainer.appendChild(canvas);
            
            // Mouse drawing events
            setupRedactDrawing(canvasContainer, i - 1);
            
            wrapper.appendChild(title);
            wrapper.appendChild(canvasContainer);
            container.appendChild(wrapper);
            
            redactRegions[i - 1] = [];
        }
    } catch (err) {
        console.error('Redact preview error:', err);
    } finally {
        loading.style.display = 'none';
        actionBtn.disabled = false;
    }
}

function setupRedactDrawing(container, pageIndex) {
    let isDrawing = false;
    let startX, startY, selectionDiv;
    
    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const rect = container.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isDrawing = true;
        
        selectionDiv = document.createElement('div');
        selectionDiv.className = 'redact-selection-overlay';
        selectionDiv.style.left = startX + 'px';
        selectionDiv.style.top = startY + 'px';
        selectionDiv.style.width = '0';
        selectionDiv.style.height = '0';
        container.appendChild(selectionDiv);
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDrawing || !selectionDiv) return;
        const rect = container.getBoundingClientRect();
        const curX = Math.max(0, Math.min(e.clientX - rect.left, container.offsetWidth));
        const curY = Math.max(0, Math.min(e.clientY - rect.top, container.offsetHeight));
        
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);
        
        selectionDiv.style.left = x + 'px';
        selectionDiv.style.top = y + 'px';
        selectionDiv.style.width = w + 'px';
        selectionDiv.style.height = h + 'px';
    });
    
    container.addEventListener('mouseup', (e) => {
        if (!isDrawing || !selectionDiv) return;
        isDrawing = false;
        
        const rect = container.getBoundingClientRect();
        const curX = Math.max(0, Math.min(e.clientX - rect.left, container.offsetWidth));
        const curY = Math.max(0, Math.min(e.clientY - rect.top, container.offsetHeight));
        
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);
        
        selectionDiv.remove();
        
        if (w < 5 || h < 5) return; // Too small, ignore
        
        const regionIdx = redactRegions[pageIndex].length;
        redactRegions[pageIndex].push({ x, y, w, h });
        
        // Create visual region marker
        const regionDiv = document.createElement('div');
        regionDiv.className = 'redact-region';
        regionDiv.style.left = x + 'px';
        regionDiv.style.top = y + 'px';
        regionDiv.style.width = w + 'px';
        regionDiv.style.height = h + 'px';
        
        const delBtn = document.createElement('button');
        delBtn.className = 'redact-region-delete';
        delBtn.innerHTML = '&times;';
        delBtn.onclick = (ev) => {
            ev.stopPropagation();
            redactRegions[pageIndex].splice(regionIdx, 1);
            regionDiv.remove();
        };
        regionDiv.appendChild(delBtn);
        container.appendChild(regionDiv);
    });
    
    container.addEventListener('mouseleave', () => {
        if (isDrawing && selectionDiv) {
            selectionDiv.remove();
            isDrawing = false;
        }
    });
}

window.clearAllRedactRegions = function() {
    redactRegions = {};
    document.querySelectorAll('.redact-canvas-container').forEach(c => {
        c.querySelectorAll('.redact-region').forEach(r => r.remove());
        const pageIndex = parseInt(c.dataset.pageIndex);
        redactRegions[pageIndex] = [];
    });
};

async function performRedact() {
    let totalRegions = 0;
    Object.values(redactRegions).forEach(arr => totalRegions += arr.length);
    if (totalRegions === 0) throw new Error(currentLang==='tr'?'L\u00fctfen gizlenecek alanlar\u0131 se\u00e7in.':'Please select regions to redact.');

    const pdfBytes = new Uint8Array(await selectedFiles[0].arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;
    const newDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < pdf.numPages; i++) {
        const pdfPage = await pdf.getPage(i + 1);
        const origVP = pdfPage.getViewport({ scale: 1.0 });
        const exportVP = pdfPage.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = exportVP.width; canvas.height = exportVP.height;
        const ctx = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: ctx, viewport: exportVP }).promise;

        // Draw redactions (display was rendered at scale 0.8, export at 2.0)
        const regions = redactRegions[i] || [];
        if (regions.length > 0) {
            const factor = 2.0 / 0.8; // 2.5x
            ctx.fillStyle = '#000000';
            regions.forEach(r => ctx.fillRect(r.x * factor, r.y * factor, r.w * factor, r.h * factor));
        }

        // Embed flattened canvas \u2014 no text layer remains
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const imgBytes = await (await fetch(dataUrl)).arrayBuffer();
        const img = await newDoc.embedJpg(imgBytes);
        const newPage = newDoc.addPage([origVP.width, origVP.height]);
        newPage.drawImage(img, { x:0, y:0, width:origVP.width, height:origVP.height });
    }
    return { url: URL.createObjectURL(new Blob([await newDoc.save()])), filename: 'redakte_edildi.pdf' };
}

// FIXED: Advanced Visual comparison engine side-by-side or stacked diff generation client-side!
async function performCompare() {
    if (selectedFiles.length < 2) throw new Error("Karşılaştırma için lütfen 2 adet dosya seçin.");
    
    const pdf1 = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[0].arrayBuffer()), disableWorker: true }).promise;
    const pdf2 = await pdfjsLib.getDocument({ data: new Uint8Array(await selectedFiles[1].arrayBuffer()), disableWorker: true }).promise;
    
    async function extractPdfText(pdf) {
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const rows = [];
            textContent.items.forEach(item => {
                if (!item.str || item.str.trim() === '') return;
                const y = item.transform[5];
                const x = item.transform[4];
                let row = rows.find(r => Math.abs(r.y - y) <= 5);
                if (!row) {
                    row = { y: y, items: [] };
                    rows.push(row);
                }
                row.items.push({ x: x, str: item.str });
            });
            
            // Sort rows top-to-bottom (Y descending)
            rows.sort((a, b) => b.y - a.y);
            
            let pageLines = [];
            rows.forEach(row => {
                // Sort items left-to-right (X ascending)
                row.items.sort((a, b) => a.x - b.x);
                const lineStr = row.items.map(item => item.str).join(" ");
                if (lineStr.trim()) {
                    pageLines.push(lineStr);
                }
            });
            
            fullText += `--- Sayfa ${i} ---\n` + pageLines.join("\n") + "\n\n";
        }
        return fullText;
    }
    
    const text1 = await extractPdfText(pdf1);
    const text2 = await extractPdfText(pdf2);
    
    // Perform line-by-line comparison via jsdiff
    const diff = Diff.diffLines(text1, text2);
    
    let htmlMarkup = "";
    diff.forEach(part => {
        const lineStyle = part.added 
            ? 'diff-added-line' 
            : part.removed 
                ? 'diff-removed-line' 
                : '';
        const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
        
        const lines = part.value.split('\n');
        lines.forEach(line => {
            if (line.trim() || line === '') {
                htmlMarkup += `<div class="${lineStyle}" style="padding:4px 10px; font-family:monospace; white-space:pre-wrap; border-bottom:1px solid #f1f5f9;">${prefix}${escapeHtml(line)}</div>`;
            }
        });
    });
    
    const resultBox = document.getElementById('compare-result');
    resultBox.innerHTML = `<h4 style="margin-bottom:12px; font-weight:700; color:var(--text-main);"><i class="fa-solid fa-code-compare"></i> Rapor Önizleme:</h4>` + htmlMarkup;
    resultBox.style.display = 'block';

    // Build TXT Report download
    let reportTxt = `PDF Karşılaştırma Raporu - PDFsHub.com\n==========================================\n`;
    reportTxt += `Belge 1: ${selectedFiles[0].name}\n`;
    reportTxt += `Belge 2: ${selectedFiles[1].name}\n\n`;
    diff.forEach(part => {
        const prefix = part.added ? "[Eklendi] " : part.removed ? "[Silindi] " : " ";
        reportTxt += part.value.split('\n').map(l => prefix + l).join('\n') + '\n';
    });

    return { url: URL.createObjectURL(new Blob([reportTxt], { type: 'text/plain' })), filename: 'karsilastirma_raporu.txt' };
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// FIXED: Environment-friendly Camera/Scanning engine compilation!
async function performScanToPdf() {
    if (scannedPages.length === 0) throw new Error(currentLang === 'tr' ? "Lütfen en az bir sayfa tarayın." : "Please capture at least one page first.");
    
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    
    for (const src of scannedPages) {
        const res = await fetch(src);
        const bytes = await res.arrayBuffer();
        const image = src.includes('image/png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        
        const w = image.width, h = image.height;
        const page = pdfDoc.addPage([w, h]);
        page.drawImage(image, { x: 0, y: 0, width: w, height: h });
    }
    
    // Stop streams
    stopCamera();
    
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'taranmis_belge.pdf' };
}

async function performPdf2Pdfa() {
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    pdfDoc.setCreator('PDFsHub');
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'pdf_metadata_updated.pdf' };
}

// Translations and Language Setting
function setLanguage(lang) {
    const validLangs = ['tr', 'en', 'ja', 'hi', 'de'];
    if (!validLangs.includes(lang)) lang = 'tr';
    currentLang = lang;
    localStorage.setItem('pdfshub_lang', currentLang);
    localStorage.setItem('pdfshub_lang_manual', '1');
    document.documentElement.lang = currentLang;

    // Update lang select dropdown
    const langSelect = document.getElementById('lang-select');
    if (langSelect && langSelect.value !== currentLang) {
        langSelect.value = currentLang;
    }

    const t = i18n[currentLang] || i18n.tr;

    // Navigation and titles
    const langLabel = { tr: 'EN', en: 'JA', ja: 'HI', hi: 'DE', de: 'TR' };
    const lbl = document.getElementById('lang-label');
    if (lbl) lbl.textContent = langLabel[currentLang];

    const navLogo = document.getElementById('nav-logo');
    if (navLogo) navLogo.innerHTML = `<img src="logo.png" alt="PDFsHub Logo" style="height: 32px; width: auto; object-fit: contain;"> PDFsHub`;

    const navHome = document.getElementById('nav-home');
    if (navHome) navHome.textContent = t.home;
    const navMerge = document.getElementById('nav-merge-tab');
    if (navMerge) navMerge.textContent = t.nav_merge;
    const navOrg = document.getElementById('nav-organize-tab');
    if (navOrg) navOrg.textContent = t.nav_organize;
    const navEdit = document.getElementById('nav-edit-tab');
    if (navEdit) navEdit.textContent = t.nav_edit;
    const navProtect = document.getElementById('nav-protect-tab');
    if (navProtect) navProtect.textContent = t.nav_protect;

    const heroH1 = document.querySelector('.hero h1');
    if (heroH1) heroH1.textContent = t.hero_title;
    const heroP = document.querySelector('.hero p');
    if (heroP) heroP.textContent = t.hero_p;

    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.innerHTML = `<i class="fa-solid fa-arrow-left"></i> ${t.back}`;

    const dropH3 = document.querySelector('#drop-zone h3');
    if (dropH3) dropH3.textContent = t.drop_h3;
    const dropP = document.querySelector('#drop-zone p');
    if (dropP) dropP.textContent = t.drop_p;
    const dropBtn = document.querySelector('#drop-zone button');
    if (dropBtn) dropBtn.textContent = t.select_btn;

    const actionBtnEl = document.getElementById('action-btn');
    if (actionBtnEl) actionBtnEl.textContent = t.action_btn;

    const resH3 = document.querySelector('#result-content h3');
    if (resH3) resH3.textContent = t.success_h3;
    const resP = document.querySelector('#result-content p');
    if (resP) resP.textContent = t.success_p;

    const downloadBtnEl = document.getElementById('download-btn');
    if (downloadBtnEl) downloadBtnEl.innerHTML = `<i class="fa-solid fa-download"></i> ${t.download}`;

    const editSaveLabel = document.getElementById('edit-save-label');
    if (editSaveLabel) editSaveLabel.textContent = t.download;

    const reuseText = document.getElementById('reuse-btn-text');
    if (reuseText) reuseText.textContent = t.reuse;

    applyUiTranslations(currentLang);

    if (window.updateCookieBanner) {
        window.updateCookieBanner(currentLang);
    }

    // Refresh grid cards
    document.querySelectorAll('.tool-card').forEach(card => {
        const actionAttr = card.getAttribute('onclick');
        if (actionAttr) {
            const match = actionAttr.match(/'([^']+)'/);
            if (match) {
                const id = match[1];
                if (toolsMetadata[currentLang] && toolsMetadata[currentLang][id]) {
                    const h3 = card.querySelector('h3');
                    const p = card.querySelector('p');
                    if (h3) h3.textContent = toolsMetadata[currentLang][id].title;
                    if (p) p.textContent = toolsMetadata[currentLang][id].desc;
                }
            }
        }
    });

    if (currentTool && toolsMetadata[currentLang] && toolsMetadata[currentLang][currentTool]) {
        toolTitle.textContent = toolsMetadata[currentLang][currentTool].title;
        toolDesc.textContent = toolsMetadata[currentLang][currentTool].desc;
    }

    updatePageTabs();
}

function toggleLanguage() {
    const langs = ['tr', 'en', 'ja', 'hi', 'de'];
    const idx = langs.indexOf(currentLang);
    const nextLang = langs[(idx + 1) % langs.length];
    setLanguage(nextLang);
}
window.setLanguage = setLanguage;
window.toggleLanguage = toggleLanguage;
window.goHome = goHome;
window.showTool = showTool;

window.addEventListener('hashchange', handleRouting);

async function detectAndSetLanguage() {
    try {
        const storedLang = localStorage.getItem('pdfshub_lang');
        if (storedLang && ['tr', 'en', 'ja', 'hi', 'de'].includes(storedLang)) {
            setLanguage(storedLang);
            return;
        }
        const res = await fetch('https://get.geojs.io/v1/ip/country.json');
        const data = await res.json();
        const country = data.country;
        let detected = 'en';
        if (country === 'TR') detected = 'tr';
        else if (country === 'DE' || country === 'AT' || country === 'CH') detected = 'de';
        else if (country === 'JP') detected = 'ja';
        else if (country === 'IN') detected = 'hi';
        setLanguage(detected);
    } catch (e) {
        setLanguage(currentLang || 'tr');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    handleRouting();
    detectAndSetLanguage();

    // Star rating setup
    initStarRating();

    // Show feedback modal on download button click
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            setTimeout(() => {
                const modal = document.getElementById('feedback-modal');
                if (!modal || modal.style.display === 'block') return;
                const desc = document.getElementById('feedback-desc');
                if (desc) {
                    const title = (toolsMetadata[currentLang] || toolsMetadata.tr)[currentTool]?.title || currentTool;
                    desc.textContent = currentLang === 'tr'
                        ? `Bu aracı (${title}) daha iyi yapabilmemiz için puan verin:`
                        : currentLang === 'de'
                            ? `Bewerten Sie dieses Tool (${title}):`
                            : currentLang === 'ja'
                                ? `このツール (${title}) を評価してください:`
                                : currentLang === 'hi'
                                    ? `इस टूल (${title}) को रेट करें:`
                                    : `Rate this tool (${title}):`;
                }
                modal.style.display = 'block';
            }, 600);
        });
    }

    // Close edit dropdowns when clicking outside them
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-shapes-wrap') && !e.target.closest('.edit-pen-dropdown')) {
            document.getElementById('edit-shapes-dropdown')?.classList.remove('open');
            document.getElementById('edit-pen-dropdown')?.classList.remove('open');
        }
    });

    // Keyboard shortcuts in Visual Editor
    document.addEventListener('keydown', (e) => {
        if (currentTool !== 'edit') return;

        const isInput = document.activeElement && (
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable
        );

        // Duplicate (Ctrl+D)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
            if (!isInput && selectedEditElement) {
                e.preventDefault();
                copySelectedElement();
                return;
            }
        }

        // Undo / Redo (Ctrl+Z / Ctrl+Y)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            if (!isInput) {
                e.preventDefault();
                if (e.shiftKey) editRedo();
                else editUndo();
                return;
            }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
            if (!isInput) {
                e.preventDefault();
                editRedo();
                return;
            }
        }

        // Delete / Backspace key
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEditElement && !isInput) {
            e.preventDefault();
            deleteSelectedElement();
        }

        // Escape key
        if (e.key === 'Escape') {
            deselectAll();
        }
    });
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        processors, 
        i18n, 
        toolsMetadata, 
        toggleLanguage, 
        handleRouting,
        setSelectedFiles: (files) => { selectedFiles = files; },
        setScannedPages: (pages) => { scannedPages = pages; },
        setRedactRegions: (regions) => { redactRegions = regions; },
        setCurrentLang: (lang) => { currentLang = lang; }
    };
}
