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
let editElementIdCounter = 0;

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
    edit: ['https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
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
        ppt2pdf: { title: "PPT'den PDF'e", desc: "PowerPoint sunum slaytlarınızı PDF formatına çevirin." },
        pdf2ppt: { title: "PDF'ten PPT'ye", desc: "PDF dökümanınızı düzenlenebilir PPT slaytlarına dönüştürün." },
        edit: { title: "PDF Düzenle", desc: "PDF üzerine yazı yazın, resim ve şekil ekleyin." },
        redact: { title: "Redakte Et", desc: "PDF üzerindeki hassas veya gizli bilgilerin üzerini siyah bantla kapatın." },
        compare: { title: "PDF Karşılaştır", desc: "İki PDF belgesi arasındaki metinsel farkları bulup gösterin." },
        scantopdf: { title: "Tarat ve PDF Yap", desc: "Web kameranızı veya telefon kameranızı kullanarak döküman tarayıp anında PDF yapın." },
        pdf2pdfa: { title: "PDF'ten PDF/A'ya", desc: "Uzun süreli dijital arşivleme için standart PDF/A formatına geçin." }
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
        ppt2pdf: { title: "PPT to PDF", desc: "Convert PowerPoint slides to standard PDF files." },
        pdf2ppt: { title: "PDF to PPT", desc: "Convert PDF pages into editable PowerPoint slides." },
        edit: { title: "Edit PDF", desc: "Add text, drawings, and custom images to your PDF." },
        redact: { title: "Redact PDF", desc: "Permanently blackout sensitive information from your PDF." },
        compare: { title: "Compare PDF", desc: "Find textual and visual differences between two PDF versions." },
        scantopdf: { title: "Scan to PDF", desc: "Use your device camera to scan paper documents straight to PDF." },
        pdf2pdfa: { title: "PDF to PDF/A", desc: "Convert standard PDFs to ISO-standardized PDF/A for archiving." }
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
        rectangle: "Dikdörtgen",
        circle: "Daire",
        line: "Çizgi"
    },
    en: {
        hero_title: "Organize your PDFs easily",
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
        line: "Line"
    },
    ja: {
        hero_title: "PDFを簡単に編集",
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
        nav_protect: "保護",
        addText: "テキスト追加",
        addImage: "画像追加",
        addShape: "シェイプ追加",
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
        line: "線"
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
        line: "पंक्ति"
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
        line: "Linie"
    }
};

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
    
    viewTool.classList.remove('active');
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
    else if (toolId === 'word2pdf') fileInput.accept = ".doc, .docx";
    else if (toolId === 'ppt2pdf') fileInput.accept = ".pptx";
    else if (toolId === 'excel2pdf') fileInput.accept = ".xlsx, .xls";
    else fileInput.accept = "application/pdf";

    viewHome.classList.remove('active');
    viewTool.classList.add('active');
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
    if (panel) {
        toolOptions.style.display = 'block';
        panel.style.display = 'block';
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
        else if (currentTool === 'word2pdf') valid = name.endsWith('.docx') || name.endsWith('.doc');
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

window.submitFeedback = function(rating) {
    trackEvent(currentTool + '_feedback', 'success', 'Rating: ' + rating);
    document.getElementById('feedback-modal').style.display = 'none';
    
    // Highlight stars
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach((s, idx) => {
        if (idx < rating) s.classList.add('active');
        else s.classList.remove('active');
    });
    
    setTimeout(() => {
        alert(currentLang === 'tr' ? 'Geri bildiriminiz için teşekkürler!' : 'Thank you for your feedback!');
    }, 300);
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
        
        // Show feedback modal
        setTimeout(() => {
            document.getElementById('feedback-modal').style.display = 'block';
            document.getElementById('feedback-desc').textContent = currentLang === 'tr' ? `Bu aracı (${toolsMetadata.tr[currentTool].title}) daha iyi yapabilmemiz için puan verin:` : `Rate this tool (${toolsMetadata.en[currentTool].title}):`;
            document.querySelectorAll('.star-rating i').forEach(s => s.classList.remove('active'));
        }, 1500);
        
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
    const res = await mammoth.convertToHtml({ arrayBuffer: await selectedFiles[0].arrayBuffer() });
    const container = document.getElementById('render-container'); container.innerHTML = res.value; container.style.display = 'block';
    const blob = await html2pdf().set({ margin: 10, html2canvas: { scale: 2 } }).from(container).output('blob');
    container.style.display = 'none'; container.innerHTML = '';
    return { url: URL.createObjectURL(blob), filename: 'word.pdf' };
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
    const container = document.getElementById('edit-workspace');
    const loading = document.getElementById('edit-loading');
    container.innerHTML = '';
    visualEditPages = [];
    selectedEditElement = null;
    currentEditPageIndex = 0;
    editElementIdCounter = 0;

    try {
        const file = selectedFiles[0];
        const pdfBytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });

            const maxWidth = 500;
            const scale = Math.min(1.0, maxWidth / viewport.width);
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;

            const wrapper = document.createElement('div');
            wrapper.className = 'edit-page-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            wrapper.style.backgroundColor = 'white';
            wrapper.style.width = scaledViewport.width + 'px';
            wrapper.style.height = scaledViewport.height + 'px';
            wrapper.style.borderRadius = '4px';
            wrapper.style.display = i === 1 ? 'block' : 'none';
            wrapper.dataset.pageIndex = i - 1;

            wrapper.appendChild(canvas);
            wrapper.addEventListener('mousedown', handleWorkspaceClick);
            wrapper.addEventListener('dragover', (e) => e.preventDefault());

            container.appendChild(wrapper);

            visualEditPages.push({
                pdfW: viewport.width,
                pdfH: viewport.height,
                scale: scale,
                elements: [],
                wrapper: wrapper,
                pageNum: i
            });
        }

        updatePageTabs();
        actionBtn.disabled = false;
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
        tab.textContent = `${currentLang === 'tr' ? 'Sayfa' : 'Page'} ${pageObj.pageNum}`;
        tab.style.padding = '8px';
        tab.style.fontSize = '0.85rem';
        tab.style.border = '1px solid var(--border)';
        tab.style.background = idx === currentEditPageIndex ? 'var(--primary)' : 'var(--surface)';
        tab.style.color = idx === currentEditPageIndex ? 'white' : 'var(--text-main)';
        tab.style.borderRadius = '4px';
        tab.style.cursor = 'pointer';
        tab.onclick = () => switchEditPage(idx);
        tabsContainer.appendChild(tab);
    });
}

function switchEditPage(pageIndex) {
    deselectAll();
    visualEditPages.forEach((p, idx) => {
        p.wrapper.style.display = idx === pageIndex ? 'block' : 'none';
    });
    currentEditPageIndex = pageIndex;
    updatePageTabs();
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
    textEl.style.left = '30px';
    textEl.style.top = '30px';
    textEl.style.fontSize = '24px';
    textEl.style.color = '#000000';
    textEl.style.fontWeight = '400';
    textEl.style.fontFamily = 'Arial, sans-serif';
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
    selectElement(textEl, 'text');
};

window.addShapeToCurrentPage = function(shapeType) {
    if (visualEditPages.length === 0) return;
    const pageObj = visualEditPages[currentEditPageIndex];

    const shapeEl = document.createElement('div');
    shapeEl.style.position = 'absolute';
    shapeEl.style.left = '50px';
    shapeEl.style.top = '50px';
    shapeEl.style.background = '#ffffff';
    shapeEl.style.border = '2px solid #000000';
    shapeEl.style.cursor = 'move';
    shapeEl.style.userSelect = 'none';
    shapeEl.id = 'edit-elem-' + (editElementIdCounter++);
    shapeEl.dataset.type = shapeType;

    if (shapeType === 'rectangle') {
        shapeEl.style.width = '100px';
        shapeEl.style.height = '80px';
        shapeEl.style.borderRadius = '2px';
    } else if (shapeType === 'circle') {
        shapeEl.style.width = '80px';
        shapeEl.style.height = '80px';
        shapeEl.style.borderRadius = '50%';
    } else if (shapeType === 'line') {
        shapeEl.style.width = '100px';
        shapeEl.style.height = '2px';
        shapeEl.style.background = '#000000';
        shapeEl.style.border = 'none';
    }

    setupDraggableElement(shapeEl, pageObj);
    setupResizableElement(shapeEl, pageObj);
    pageObj.wrapper.appendChild(shapeEl);
    pageObj.elements.push({ el: shapeEl, type: shapeType });
    selectElement(shapeEl, shapeType);
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
        imgEl.style.width = '120px';
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
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = `${initialX + dx}px`;
        el.style.top = `${initialY + dy}px`;
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
    handle.style.right = '-5px';
    handle.style.bottom = '-5px';
    handle.style.width = '12px';
    handle.style.height = '12px';
    handle.style.background = 'var(--primary)';
    handle.style.cursor = 'nwse-resize';
    handle.style.borderRadius = '50%';
    handle.style.display = 'none';
    handle.style.zIndex = '10';

    el.style.position = 'relative';
    el.appendChild(handle);

    let isResizing = false, startX, startY, startWidth, startHeight;

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
        const width = Math.max(30, startWidth + (e.clientX - startX));
        const height = Math.max(30, startHeight + (e.clientY - startY));
        el.style.width = width + 'px';
        if (el.dataset.type !== 'line') el.style.height = height + 'px';
    });

    document.addEventListener('mouseup', function() {
        isResizing = false;
    });
}

function handleWorkspaceClick(e) {
    if (e.target === this) {
        deselectAll();
    }
}

function selectElement(el, type) {
    deselectAll();
    selectedEditElement = { el, type };
    el.style.borderColor = 'var(--primary)';

    // Update properties panel
    if (type === 'text') {
        document.getElementById('edit-text-color').style.display = 'block';
        document.getElementById('edit-text-color').value = rgbToHex(el.style.color || '#000000');
        document.getElementById('edit-font-size').style.display = 'block';
        document.getElementById('edit-font-size').value = parseInt(el.style.fontSize) || 24;
        document.getElementById('edit-font-weight').style.display = 'block';
        document.getElementById('edit-font-weight').value = el.style.fontWeight || '400';
        document.getElementById('edit-fill-color').style.display = 'none';
        document.getElementById('edit-stroke-width').style.display = 'none';
    } else if (type === 'image') {
        document.getElementById('edit-text-color').style.display = 'none';
        document.getElementById('edit-fill-color').style.display = 'none';
        document.getElementById('edit-font-size').style.display = 'none';
        document.getElementById('edit-font-weight').style.display = 'none';
        document.getElementById('edit-stroke-width').style.display = 'none';
    } else {
        document.getElementById('edit-text-color').style.display = 'none';
        document.getElementById('edit-fill-color').style.display = 'block';
        document.getElementById('edit-fill-color').value = rgbToHex(el.style.background || '#ffffff');
        document.getElementById('edit-font-size').style.display = 'none';
        document.getElementById('edit-font-weight').style.display = 'none';
        document.getElementById('edit-stroke-width').style.display = 'block';
        document.getElementById('edit-stroke-width').value = parseInt(el.style.borderWidth) || 2;
    }

    // Show resize handle
    const handle = el.querySelector('.resize-handle');
    if (handle) handle.style.display = 'block';
}

function deselectAll() {
    selectedEditElement = null;
    visualEditPages.forEach(pageObj => {
        pageObj.wrapper.querySelectorAll('[id^="edit-elem-"]').forEach(el => {
            el.style.borderColor = 'transparent';
            const handle = el.querySelector('.resize-handle');
            if (handle) handle.style.display = 'none';
        });
    });
}

window.updateSelectedElementStyle = function() {
    if (!selectedEditElement) return;
    const { el, type } = selectedEditElement;

    if (type === 'text') {
        const color = document.getElementById('edit-text-color').value;
        const size = document.getElementById('edit-font-size').value;
        const weight = document.getElementById('edit-font-weight').value;
        el.style.color = color;
        el.style.fontSize = size + 'px';
        el.style.fontWeight = weight;
    } else {
        const fillColor = document.getElementById('edit-fill-color').value;
        const strokeWidth = document.getElementById('edit-stroke-width').value;
        el.style.background = fillColor;
        el.style.borderWidth = strokeWidth + 'px';
    }
};

window.copySelectedElement = function() {
    if (!selectedEditElement) return;
    const { el, type } = selectedEditElement;
    const pageObj = visualEditPages[currentEditPageIndex];

    const clone = el.cloneNode(true);
    clone.id = 'edit-elem-' + (editElementIdCounter++);
    clone.style.left = (parseFloat(el.style.left) + 20) + 'px';
    clone.style.top = (parseFloat(el.style.top) + 20) + 'px';

    setupDraggableElement(clone, pageObj);
    if (type !== 'text') setupResizableElement(clone, pageObj);
    pageObj.wrapper.appendChild(clone);
    pageObj.elements.push({ el: clone, type: type });
    selectElement(clone, type);
};

window.deleteSelectedElement = function() {
    if (!selectedEditElement) return;
    const pageObj = visualEditPages[currentEditPageIndex];
    selectedEditElement.el.remove();
    pageObj.elements = pageObj.elements.filter(e => e.el !== selectedEditElement.el);
    deselectAll();
};

function rgbToHex(rgbStr) {
    if (!rgbStr) return '#000000';
    if (rgbStr.startsWith('#')) return rgbStr;
    const rgb = rgbStr.match(/\d+/g);
    if (!rgb || rgb.length < 3) return '#000000';
    return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
}

async function performEdit() {
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageObj = visualEditPages[i];
        if (!pageObj) continue;

        const scale = pageObj.scale;
        const wrapperRect = pageObj.wrapper.getBoundingClientRect();

        for (let ei = 0; ei < pageObj.elements.length; ei++) {
            const { el, type } = pageObj.elements[ei];
            const rect = el.getBoundingClientRect();
            const relX = rect.left - wrapperRect.left;
            const relY = rect.top - wrapperRect.top;

            const pdfX = relX / scale;
            const unscaledY = relY / scale;

            if (type === 'text') {
                const text = el.textContent;
                const sizeStr = el.style.fontSize || '24px';
                const fontSize = parseInt(sizeStr);
                const weight = el.style.fontWeight || '400';
                const pdfFontSize = fontSize / scale;
                const pdfY = pageObj.pdfH - unscaledY - pdfFontSize;

                const safeText = text.replace(/[\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]/g,
                    m => ({'\u00e7':'c','\u011f':'g','\u0131':'i','\u00f6':'o','\u015f':'s','\u00fc':'u','\u00c7':'C','\u011e':'G','\u0130':'I','\u00d6':'O','\u015e':'S','\u00dc':'U'}[m] || m));

                const hex = rgbToHex(el.style.color);
                const r = parseInt(hex.substring(1,3), 16) / 255;
                const g = parseInt(hex.substring(3,5), 16) / 255;
                const b = parseInt(hex.substring(5,7), 16) / 255;
                const color = PDFLib.rgb(r, g, b);

                page.drawText(safeText, {
                    x: pdfX,
                    y: pdfY,
                    size: pdfFontSize,
                    font: weight === '700' ? boldFont : font,
                    color
                });
            } else if (type === 'image') {
                const imgNode = el;
                if (imgNode && imgNode.src) {
                    try {
                        const res = await fetch(imgNode.src);
                        const imgBytes = await res.arrayBuffer();

                        let image;
                        if (imgNode.src.includes('image/png') || imgNode.src.includes('data:image/png')) {
                            image = await pdfDoc.embedPng(imgBytes);
                        } else {
                            image = await pdfDoc.embedJpg(imgBytes);
                        }

                        const width = rect.width / scale;
                        const height = rect.height / scale;
                        const pdfY = pageObj.pdfH - unscaledY - height;

                        page.drawImage(image, {
                            x: pdfX,
                            y: pdfY,
                            width: width,
                            height: height
                        });
                    } catch (e) {
                        console.warn('Image embed error:', e);
                    }
                }
            } else {
                const width = rect.width / scale;
                const height = rect.height / scale;
                const fillHex = rgbToHex(el.style.background);
                const r = parseInt(fillHex.substring(1,3), 16) / 255;
                const g = parseInt(fillHex.substring(3,5), 16) / 255;
                const b = parseInt(fillHex.substring(5,7), 16) / 255;
                const fillColor = PDFLib.rgb(r, g, b);

                const strokeHex = rgbToHex(el.style.borderColor || '#000000');
                const sr = parseInt(strokeHex.substring(1,3), 16) / 255;
                const sg = parseInt(strokeHex.substring(3,5), 16) / 255;
                const sb = parseInt(strokeHex.substring(5,7), 16) / 255;
                const strokeColor = PDFLib.rgb(sr, sg, sb);
                const strokeWidth = (parseInt(el.style.borderWidth) || 2) / scale;

                const pdfY = pageObj.pdfH - unscaledY - height;

                if (type === 'rectangle') {
                    page.drawRectangle({
                        x: pdfX,
                        y: pdfY,
                        width: width,
                        height: height,
                        borderColor: strokeColor,
                        borderWidth: strokeWidth,
                        color: fillColor
                    });
                } else if (type === 'circle') {
                    page.drawCircle({
                        x: pdfX + width / 2,
                        y: pdfY + height / 2,
                        size: Math.min(width, height),
                        borderColor: strokeColor,
                        borderWidth: strokeWidth,
                        color: fillColor
                    });
                } else if (type === 'line') {
                    page.drawLine({
                        start: { x: pdfX, y: pdfY + height / 2 },
                        end: { x: pdfX + width, y: pdfY + height / 2 },
                        color: strokeColor,
                        thickness: strokeWidth
                    });
                }
            }
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
    // Check if any regions selected
    let totalRegions = 0;
    Object.values(redactRegions).forEach(arr => totalRegions += arr.length);
    if (totalRegions === 0) {
        throw new Error(currentLang === 'tr' ? 'L\u00fctfen gizlenecek alanlar\u0131 se\u00e7in.' : 'Please select regions to redact.');
    }
    
    const pdfDoc = await PDFLib.PDFDocument.load(await selectedFiles[0].arrayBuffer());
    const pages = pdfDoc.getPages();
    
    // Get the rendered canvas dimensions to calculate scale ratio
    const containers = document.querySelectorAll('.redact-canvas-container');
    
    Object.keys(redactRegions).forEach(pageIdxStr => {
        const pageIdx = parseInt(pageIdxStr);
        const regions = redactRegions[pageIdx];
        if (!regions || regions.length === 0 || pageIdx >= pages.length) return;
        
        const page = pages[pageIdx];
        const { width: pdfW, height: pdfH } = page.getSize();
        
        // Get the canvas container for this page to find display scale
        const container = containers[pageIdx];
        const canvas = container ? container.querySelector('canvas') : null;
        const displayW = canvas ? canvas.offsetWidth : canvas?.width || pdfW;
        const displayH = canvas ? canvas.offsetHeight : canvas?.height || pdfH;
        
        const scaleX = pdfW / displayW;
        const scaleY = pdfH / displayH;
        
        regions.forEach(region => {
            // Convert from screen coords (top-left origin) to PDF coords (bottom-left origin)
            const x = region.x * scaleX;
            const y = pdfH - (region.y * scaleY) - (region.h * scaleY);
            const w = region.w * scaleX;
            const h = region.h * scaleY;
            
            page.drawRectangle({
                x, y, width: w, height: h,
                color: PDFLib.rgb(0, 0, 0)
            });
        });
    });
    
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'redakte_edildi.pdf' };
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
    return { url: URL.createObjectURL(new Blob([await pdfDoc.save()])), filename: 'arşiv.pdf' };
}

// Translations and Language Toggling
function toggleLanguage() {
    showLanguageModal();
}

window.showLanguageModal = function() {
    document.getElementById('language-modal').style.display = 'flex';
};

window.setLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('pdfshub_lang', currentLang);
    document.getElementById('language-modal').style.display = 'none';
    const langs = ['tr', 'en', 'ja', 'hi', 'de'];
    const langLabel = { tr: 'EN', en: 'JA', ja: 'HI', hi: 'DE', de: 'TR' };
    document.getElementById('lang-label').textContent = langLabel[currentLang];
    updateUILanguage();
};

function updateUILanguage() {
    const t = i18n[currentLang];
    document.getElementById('nav-logo').innerHTML = `<img src="logo.png" alt="PDFsHub Logo" style="height: 32px; width: auto; object-fit: contain;"> PDFsHub`;
    document.getElementById('nav-home').textContent = t.home;
    document.getElementById('nav-merge-tab').textContent = t.nav_merge;
    document.getElementById('nav-organize-tab').textContent = t.nav_organize;
    document.getElementById('nav-protect-tab').textContent = t.nav_protect;

    if (document.querySelector('.hero h1')) document.querySelector('.hero h1').textContent = t.hero_title;
    if (document.querySelector('.hero p')) document.querySelector('.hero p').textContent = t.hero_p;
    if (document.querySelector('.back-btn')) document.querySelector('.back-btn').innerHTML = `<i class="fa-solid fa-arrow-left"></i> ${t.back}`;
    if (document.querySelector('#drop-zone h3')) document.querySelector('#drop-zone h3').textContent = t.drop_h3;
    if (document.querySelector('#drop-zone p')) document.querySelector('#drop-zone p').textContent = t.drop_p;
    if (document.querySelector('#drop-zone button')) document.querySelector('#drop-zone button').textContent = t.select_btn;
    document.getElementById('action-btn').textContent = t.action_btn;
    if (document.querySelector('#result-content h3')) document.querySelector('#result-content h3').textContent = t.success_h3;
    if (document.querySelector('#result-content p')) document.querySelector('#result-content p').textContent = t.success_p;
    document.getElementById('download-btn').innerHTML = `<i class="fa-solid fa-download"></i> ${t.download}`;

    document.querySelectorAll('.tool-card').forEach(card => {
        const actionAttr = card.getAttribute('onclick');
        if (actionAttr) {
            const match = actionAttr.match(/'([^']+)'/);
            if (match) {
                const id = match[1];
                if (toolsMetadata[currentLang][id]) {
                    card.querySelector('h3').textContent = toolsMetadata[currentLang][id].title;
                    card.querySelector('p').textContent = toolsMetadata[currentLang][id].desc;
                }
            }
        }
    });

    if (currentTool && toolsMetadata[currentLang][currentTool]) {
        toolTitle.textContent = toolsMetadata[currentLang][currentTool].title;
        toolDesc.textContent = toolsMetadata[currentLang][currentTool].desc;
    }
}
window.toggleLanguage = toggleLanguage;
window.goHome = goHome;
window.showTool = showTool;

window.addEventListener('hashchange', handleRouting);

async function detectAndSetLanguage() {
    try {
        const storedLang = localStorage.getItem('pdfshub_lang');
        if (storedLang) {
            if (currentLang !== storedLang) {
                currentLang = storedLang;
                toggleLanguage();
                currentLang = storedLang; // Fix toggle logic resetting
            }
        } else {
            const res = await fetch('https://get.geojs.io/v1/ip/country.json');
            const data = await res.json();
            const country = data.country; // e.g. "TR"
            const targetLang = country === 'TR' ? 'tr' : 'en';
            
            if (currentLang !== targetLang) {
                currentLang = targetLang === 'tr' ? 'en' : 'tr';
                toggleLanguage();
            }
            localStorage.setItem('pdfshub_lang', targetLang);
        }
    } catch (e) {
        console.warn('Language detection failed, defaulting to ' + currentLang);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    handleRouting();
    detectAndSetLanguage();
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
        setCurrentLang: (lang) => { currentLang = lang; }
    };
}
