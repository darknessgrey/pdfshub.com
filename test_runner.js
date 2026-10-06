const fs = require('fs');
const path = require('path');

console.log("====================================================");
console.log("PDFsHub Automated Tool Processor Sanity Test Suite");
console.log("====================================================");

// Mock DOM environment
global.window = {
    location: { hash: '' },
    addEventListener: () => {},
    pdfjsLib: { GlobalWorkerOptions: {} }
};

const mockPageElement = {
    getSize: () => ({ width: 600, height: 800 }),
    getWidth: () => 600,
    getHeight: () => 800,
    drawImage: () => {},
    drawText: () => {},
    drawRectangle: () => {},
    drawLine: () => {},
    getRotation: () => ({ angle: 0 }),
    setRotation: () => {},
    setCropBox: () => {},
    setTrimBox: () => {}
};

global.document = {
    addEventListener: () => {},
    getElementById: (id) => {
        if (id === 'organize-grid') {
            return {
                children: [
                    {
                        dataset: { originalIndex: '0' },
                        querySelector: () => ({ checked: true })
                    }
                ]
            };
        }
        return {
            value: id.includes('password') ? 'mock-password'
                : id.startsWith('crop-') ? '10'
                : id === 'compress-level' ? 'recommended'
                : id === 'ocr-lang' ? 'eng'
                : id === 'html-content' ? '<h1>Test</h1>'
                : '1',
            style: { display: 'none' },
            files: [
                {
                    name: 'test_signature.png',
                    type: 'image/png',
                    arrayBuffer: async () => new ArrayBuffer(100)
                }
            ],
            accept: '',
            addEventListener: () => {},
            appendChild: () => {},
            click: () => {},
            getContext: () => ({
                drawImage: () => {},
                fillRect: () => {},
                toDataURL: () => 'data:image/png;base64,mock'
            }),
            innerHTML: '',
            children: []
        };
    },
    querySelectorAll: () => [],
    createElement: () => ({
        style: {},
        addEventListener: () => {},
        appendChild: () => {},
        getContext: () => ({
            drawImage: () => {},
            fillRect: () => {},
            toDataURL: () => 'data:image/png;base64,mock'
        }),
        toBlob: (callback) => callback(new Blob([])),
        toDataURL: () => 'data:image/png;base64,mock',
        innerHTML: ''
    }),
    head: { appendChild: () => {} }
};

global.navigator = {
    mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [] })
    }
};

global.URL = {
    createObjectURL: (blob) => 'blob:https://pdfshub.com/mock-uuid'
};

global.Blob = class Blob {
    constructor(chunks, options) {
        this.chunks = chunks;
        this.options = options;
    }
    async arrayBuffer() {
        return new ArrayBuffer(100);
    }
};

global.fetch = async (url) => {
    return {
        arrayBuffer: async () => new ArrayBuffer(100)
    };
};

// Mock external library globals matching exact browser libraries
global.PDFLib = {
    PDFDocument: {
        create: async () => ({
            copyPages: async () => [mockPageElement],
            addPage: () => mockPageElement,
            save: async () => new Uint8Array([1, 2, 3]),
            getPageIndices: () => [0],
            getPageCount: () => 1,
            embedPng: async () => ({ width: 100, height: 100 }),
            embedJpg: async () => ({ width: 100, height: 100 }),
            embedFont: async () => ({ widthOfTextAtSize: () => 10 }),
            getPages: () => [mockPageElement],
            setCreator: () => {}
        }),
        load: async () => ({
            copyPages: async () => [mockPageElement],
            addPage: () => mockPageElement,
            getPageIndices: () => [0],
            getPageCount: () => 1,
            save: async () => new Uint8Array([1, 2, 3]),
            getPages: () => [mockPageElement],
            embedFont: async () => ({ widthOfTextAtSize: () => 10 }),
            embedPng: async () => ({ width: 100, height: 100 }),
            embedJpg: async () => ({ width: 100, height: 100 }),
            setCreator: () => {}
        })
    },
    StandardFonts: { Helvetica: 'Helvetica', CourierBold: 'Courier-Bold' },
    rgb: () => ({}),
    degrees: () => ({})
};

global.JSZip = class JSZip {
    constructor() {
        this.files = {};
    }
    file(name, data) {
        this.files[name] = data;
    }
    async generateAsync() {
        return new Blob([]);
    }
    static async loadAsync() {
        return {
            forEach: (cb) => cb('ppt/slides/slide1.xml', { async: async () => '<a:t>Mock PPT Text</a:t>' })
        };
    }
};

global.pdfjsLib = {
    getDocument: () => ({
        promise: {
            numPages: 1,
            getPage: async () => ({
                getViewport: () => ({ width: 100, height: 100 }),
                render: () => ({ promise: Promise.resolve() }),
                getTextContent: async () => ({
                    items: [{ str: 'Mock extracted PDF text', transform: [0, 0, 0, 0, 0, 100] }]
                })
            })
        }
    })
};

global.XLSX = {
    read: () => ({
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
    }),
    utils: {
        sheet_to_html: () => '<table></table>',
        aoa_to_sheet: () => ({}),
        book_new: () => ({}),
        book_append_sheet: () => {}
    },
    write: () => 'mock-binary-excel-string'
};

global.html2pdf = () => {
    const chain = {
        set: () => chain,
        from: () => chain,
        output: async () => new Blob([])
    };
    return chain;
};

global.mammoth = {
    convertToHtml: async () => ({ value: '<h1>Mock Word</h1>' })
};

global.Tesseract = {
    createWorker: async () => ({
        recognize: async () => ({ data: { text: 'OCR text' } }),
        terminate: async () => {}
    })
};

global.PptxGenJS = class PptxGenJS {
    addSlide() {
        return { addImage: () => {} };
    }
    async writeFile() {
        return new Blob([]);
    }
};

global.Diff = {
    diffLines: () => [{ added: true, value: 'added text' }, { removed: true, value: 'removed text' }]
};

global.DOMParser = class DOMParser {
    parseFromString() {
        return {
            getElementsByTagName: () => [{ textContent: 'Mock text slide' }]
        };
    }
};

// Define dynamic import interception mock for Node.js
const originalAppJsPath = path.join(__dirname, 'app.src.js');
let appJsContent = fs.readFileSync(originalAppJsPath, 'utf8');

// Replace browser dynamic ESM import with a Node-compatible synchronous resolve mock
appJsContent = appJsContent.replace(
    /await import\('https:\/\/cdn\.jsdelivr\.net\/npm\/@pdfsmaller\/pdf-encrypt-lite\/\+esm'\)/g,
    `({ encryptPDF: async (bytes) => bytes })`
);

// Save temporary modified file for module loading
const tempAppJsPath = path.join(__dirname, 'app_temp.js');
fs.writeFileSync(tempAppJsPath, appJsContent, 'utf8');

// Mock data inputs for the processor functions
const mockFiles = [
    {
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf',
        arrayBuffer: async () => new ArrayBuffer(100)
    },
    {
        name: 'test2.pdf',
        size: 2048,
        type: 'application/pdf',
        arrayBuffer: async () => new ArrayBuffer(100)
    }
];
const mockDocx = {
    name: 'test.docx',
    size: 1024,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    arrayBuffer: async () => new ArrayBuffer(100)
};

const mockScannedPages = ['data:image/png;base64,mock'];

// Require the rewritten temp app
let app;
try {
    app = require('./app_temp.js');
    console.log("✓ app.src.js successfully loaded in test context!");
    
    // Inject states using setters
    app.setSelectedFiles(mockFiles);
    app.setScannedPages(mockScannedPages);
    app.setRedactRegions({ 0: [{ x: 10, y: 10, w: 20, h: 20 }] });
    app.setCurrentLang('tr');
} catch (e) {
    console.error("✗ Failed to load app.js module:", e);
    // Cleanup
    try { fs.unlinkSync(tempAppJsPath); } catch(_) {}
    process.exit(1);
}

const { processors } = app;

// Systematically test each processor function
const processorsList = [
    'merge', 'split', 'jpg2pdf', 'pdf2jpg', 'word2pdf', 'excel2pdf', 'pdf2word', 'pdf2excel',
    'pagenumbers', 'organizepages', 'watermark', 'rotate', 'protect', 'unlock', 'sign',
    'compress', 'html2pdf', 'crop', 'repair', 'ocr', 'ppt2pdf', 'pdf2ppt', 'edit',
    'redact', 'compare', 'scantopdf', 'pdf2pdfa'
];

let failedCount = 0;

async function runTests() {
    for (const name of processorsList) {
        app.setSelectedFiles(name === 'word2pdf' ? [mockDocx] : mockFiles);
        const procFn = processors[name];
        if (!procFn) {
            console.error(`✗ Missing processor mapping for: ${name}`);
            failedCount++;
            continue;
        }

        try {
            console.log(`Testing tool processor: ${name}...`);
            const res = await procFn();
            console.log(`  ✓ Success! Output file: ${res.filename}, URL: ${res.url}`);
        } catch (err) {
            console.error(`  ✗ FAILED: ${name} threw an error:`, err.stack || err.message);
            failedCount++;
        }
    }

    console.log("----------------------------------------------------");
    
    // Cleanup temporary file
    try { fs.unlinkSync(tempAppJsPath); } catch(_) {}

    if (failedCount === 0) {
        console.log("🎉 ALL 27 TOOL PROCESSORS PASSED SANITY TESTS SUCCESSFULLY!");
        process.exit(0);
    } else {
        console.error(`🚨 ${failedCount} processor sanity checks failed!`);
        process.exit(1);
    }
}

runTests();
