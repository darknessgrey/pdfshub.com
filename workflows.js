/* PDFsHub workflows: build, save and run multi-step PDF pipelines entirely in the browser. */
(function () {
    'use strict';

    const LIBS = {
        pdflib: 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
        pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    };
    const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const TXT = {
        tr: {
            pageTitle: 'İş Akışları', pageDesc: 'Sık kullandığınız PDF işlemlerini zincirleyin, kaydedin ve tek tıkla çalıştırın. Dosyalarınız tarayıcınızdan çıkmaz.',
            loginTitle: 'İş akışları için giriş yapın', loginDesc: 'İş akışlarınızı kaydetmek ve her cihazdan kullanmak için ücretsiz hesap oluşturun.',
            login: 'Giriş Yap', register: 'Kayıt Ol',
            builder: 'İş Akışı Oluşturucu', nameLabel: 'İş akışı adı', namePh: 'Örn. Fatura hazırla',
            steps: 'Adımlar', addStep: 'Adım ekle', noSteps: 'Henüz adım yok. Yukarıdan bir adım ekleyin.',
            save: 'Kaydet', saveNew: 'Yeni olarak kaydet', reset: 'Temizle', saved: 'Kaydedildi.',
            mySaved: 'Kayıtlı İş Akışlarım', none: 'Henüz kayıtlı iş akışınız yok.',
            run: 'Çalıştır', edit: 'Düzenle', del: 'Sil', confirmDel: 'Bu iş akışı silinsin mi?',
            runTitle: 'Çalıştır', pickFiles: 'PDF dosyalarını seçin veya buraya bırakın', runBtn: 'İş Akışını Çalıştır',
            files: 'dosya', noFiles: 'Önce PDF dosyası seçin.', noSteps2: 'En az bir adım ekleyin.',
            askPass: 'Çalıştırma sırasında gerekli şifreler', passFor: 'Şifre', passMissing: 'Gerekli şifreyi girin.',
            passNote: 'Şifre kaydedilmez; çalıştırırken sorulur.',
            progress: 'İşleniyor', done: 'Tamamlandı', download: 'Sonucu İndir', failed: 'Hata',
            up: 'Yukarı', down: 'Aşağı', remove: 'Kaldır',
            needName: 'Bir ad girin.', needSteps: 'En az bir adım ekleyin.',
            limit: 'Kayıtlı iş akışı sınırına ulaştınız.', loadFail: 'İş akışları yüklenemedi.', saveFail: 'Kaydedilemedi.',
            optLevel: 'Seviye', optText: 'Filigran metni', optPos: 'Konum', optDeg: 'Döndürme',
            lvlExtreme: 'Ekstrem', lvlRecommended: 'Önerilen', lvlLow: 'Az sıkıştırma',
            posBR: 'Sağ alt', posBC: 'Orta alt', posTR: 'Sağ üst',
            deg90: 'Sağa 90°', deg180: '180°', deg270: 'Sola 90°',
            s: {
                merge: ['Birleştir', 'Tüm dosyaları tek PDF yapar'], compress: ['Sıkıştır', 'Dosya boyutunu küçültür'],
                watermark: ['Filigran', 'Her sayfaya metin filigranı ekler'], pagenumbers: ['Sayfa numarası', 'Sayfaları numaralandırır'],
                rotate: ['Döndür', 'Tüm sayfaları döndürür'], protect: ['Şifrele', 'PDF’i şifre ile korur'],
                unlock: ['Şifreyi kaldır', 'Şifreli PDF’i açar'], repair: ['Onar', 'Hasarlı PDF’i kurtarmayı dener'],
                metadata: ['Metadata temizle', 'Yazar, başlık gibi gizli bilgileri siler']
            }
        },
        en: {
            pageTitle: 'Workflows', pageDesc: 'Chain your favourite PDF actions, save them and run them in one click. Your files never leave your browser.',
            loginTitle: 'Log in to use workflows', loginDesc: 'Create a free account to save your workflows and use them on any device.',
            login: 'Log in', register: 'Sign up',
            builder: 'Workflow builder', nameLabel: 'Workflow name', namePh: 'e.g. Prepare invoice',
            steps: 'Steps', addStep: 'Add step', noSteps: 'No steps yet. Add a step above.',
            save: 'Save', saveNew: 'Save as new', reset: 'Clear', saved: 'Saved.',
            mySaved: 'My saved workflows', none: 'You have no saved workflows yet.',
            run: 'Run', edit: 'Edit', del: 'Delete', confirmDel: 'Delete this workflow?',
            runTitle: 'Run', pickFiles: 'Choose PDF files or drop them here', runBtn: 'Run workflow',
            files: 'files', noFiles: 'Select PDF files first.', noSteps2: 'Add at least one step.',
            askPass: 'Passwords needed for this run', passFor: 'Password', passMissing: 'Enter the required password.',
            passNote: 'Passwords are never saved; you are asked when running.',
            progress: 'Processing', done: 'Done', download: 'Download result', failed: 'Error',
            up: 'Move up', down: 'Move down', remove: 'Remove',
            needName: 'Enter a name.', needSteps: 'Add at least one step.',
            limit: 'You reached the saved workflow limit.', loadFail: 'Could not load workflows.', saveFail: 'Could not save.',
            optLevel: 'Level', optText: 'Watermark text', optPos: 'Position', optDeg: 'Rotation',
            lvlExtreme: 'Extreme', lvlRecommended: 'Recommended', lvlLow: 'Light',
            posBR: 'Bottom right', posBC: 'Bottom center', posTR: 'Top right',
            deg90: '90° right', deg180: '180°', deg270: '90° left',
            s: {
                merge: ['Merge', 'Combine all files into one PDF'], compress: ['Compress', 'Reduce file size'],
                watermark: ['Watermark', 'Add a text watermark to every page'], pagenumbers: ['Page numbers', 'Number every page'],
                rotate: ['Rotate', 'Rotate all pages'], protect: ['Protect', 'Encrypt with a password'],
                unlock: ['Unlock', 'Remove the password from a PDF'], repair: ['Repair', 'Try to recover a damaged PDF'],
                metadata: ['Clean metadata', 'Remove author, title and other hidden info']
            }
        }
    };
    const L = () => ((localStorage.getItem('pdfshub_lang') || document.documentElement.lang) === 'tr' ? TXT.tr : TXT.en);

    const STEP_DEFS = {
        merge: { opts: [] },
        compress: { opts: [{ key: 'level', type: 'select', label: 'optLevel', def: 'recommended', values: [['extreme', 'lvlExtreme'], ['recommended', 'lvlRecommended'], ['low', 'lvlLow']] }] },
        watermark: { opts: [{ key: 'text', type: 'text', label: 'optText', def: 'CONFIDENTIAL' }] },
        pagenumbers: { opts: [{ key: 'position', type: 'select', label: 'optPos', def: 'bottom-right', values: [['bottom-right', 'posBR'], ['bottom-center', 'posBC'], ['top-right', 'posTR']] }] },
        rotate: { opts: [{ key: 'degrees', type: 'select', label: 'optDeg', def: '90', values: [['90', 'deg90'], ['180', 'deg180'], ['270', 'deg270']] }] },
        protect: { password: true, opts: [] },
        unlock: { password: true, opts: [] },
        repair: { opts: [] },
        metadata: { opts: [] }
    };
    const STEP_ICONS = {
        merge: 'fa-layer-group', compress: 'fa-compress', watermark: 'fa-droplet', pagenumbers: 'fa-list-ol',
        rotate: 'fa-rotate-right', protect: 'fa-lock', unlock: 'fa-lock-open', repair: 'fa-wrench', metadata: 'fa-eraser'
    };

    const S = { workflows: [], editingId: null, name: '', steps: [], files: [], busy: false, resultUrl: null };
    const $ = (id) => document.getElementById(id);

    function el(tag, attrs, children) {
        const n = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'class') n.className = v;
            else if (k === 'text') n.textContent = v;
            else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
            else n.setAttribute(k, v);
        });
        (children || []).forEach(c => n.appendChild(c));
        return n;
    }

    /* ---------- library loading ---------- */
    const loading = {};
    function loadScript(url) {
        if (loading[url]) return loading[url];
        loading[url] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url; s.crossOrigin = 'anonymous';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load ' + url));
            document.head.appendChild(s);
        });
        return loading[url];
    }
    async function need(...names) {
        await Promise.all(names.map(n => loadScript(LIBS[n])));
        if (names.includes('pdfjs')) window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    }

    /* ---------- step implementations: Uint8Array -> Uint8Array ---------- */
    const IMPL = {
        async compress(bytes, o) {
            await need('pdflib', 'pdfjs');
            const quality = { extreme: 0.3, recommended: 0.6, low: 0.85 }[o.level] || 0.6;
            const maxW = { extreme: 800, recommended: 1200, low: 1600 }[o.level] || 1200;
            const pdf = await pdfjsLib.getDocument({ data: bytes.slice(), disableWorker: true }).promise;
            const out = await PDFLib.PDFDocument.create();
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const base = page.getViewport({ scale: 1 });
                const scale = Math.max(base.width > maxW ? maxW / base.width : 1, 0.5);
                const vp = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
                const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
                out.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
            }
            const result = await out.save();
            // Keep the original when re-rendering would make the file larger.
            return result.length < bytes.length ? result : bytes;
        },
        async watermark(bytes, o) {
            await need('pdflib');
            const text = (o.text || 'CONFIDENTIAL').slice(0, 100);
            const doc = await PDFLib.PDFDocument.load(bytes);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 72;
            ctx.font = `700 ${size}px Arial, sans-serif`;
            canvas.width = Math.ceil(ctx.measureText(text).width) + 32;
            canvas.height = size + 32;
            ctx.font = `700 ${size}px Arial, sans-serif`;
            ctx.fillStyle = 'rgba(128,128,128,0.3)';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 16, canvas.height / 2);
            const png = await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer();
            const mark = await doc.embedPng(png);
            doc.getPages().forEach(p => {
                const { width, height } = p.getSize();
                const tw = Math.min(width * 0.9, height * 1.1);
                const th = tw * mark.height / mark.width;
                p.drawImage(mark, { x: (width - tw) / 2, y: (height - th) / 2, width: tw, height: th, rotate: PDFLib.degrees(45) });
            });
            return doc.save();
        },
        async pagenumbers(bytes, o) {
            await need('pdflib');
            const doc = await PDFLib.PDFDocument.load(bytes);
            const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
            doc.getPages().forEach((p, i) => {
                const { width, height } = p.getSize();
                const text = String(i + 1);
                const w = font.widthOfTextAtSize(text, 12);
                let x = width - w - 30, y = 30;
                if (o.position === 'bottom-center') x = (width - w) / 2;
                else if (o.position === 'top-right') y = height - 30;
                p.drawText(text, { x, y, size: 12, font, color: PDFLib.rgb(0, 0, 0) });
            });
            return doc.save();
        },
        async rotate(bytes, o) {
            await need('pdflib');
            const deg = parseInt(o.degrees, 10) || 90;
            const doc = await PDFLib.PDFDocument.load(bytes);
            doc.getPages().forEach(p => p.setRotation(PDFLib.degrees((p.getRotation().angle + deg) % 360)));
            return doc.save();
        },
        async protect(bytes, o) {
            if (!o.password) throw new Error(L().passMissing);
            const { encryptPDF } = await import('https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt-lite/+esm');
            return encryptPDF(bytes, o.password);
        },
        async unlock(bytes, o) {
            await need('pdflib', 'pdfjs');
            if (!o.password) throw new Error(L().passMissing);
            const pdf = await pdfjsLib.getDocument({ data: bytes.slice(), password: o.password, disableWorker: true }).promise;
            const out = await PDFLib.PDFDocument.create();
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                const img = await out.embedPng(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer());
                const base = page.getViewport({ scale: 1 });
                out.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
            }
            return out.save();
        },
        async repair(bytes) {
            await need('pdflib');
            const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
            const out = await PDFLib.PDFDocument.create();
            let ok = 0;
            for (let i = 0; i < src.getPageCount(); i++) {
                try { const [p] = await out.copyPages(src, [i]); out.addPage(p); ok++; } catch (e) { /* skip unrecoverable page */ }
            }
            if (!ok) throw new Error('No pages could be recovered.');
            return out.save();
        },
        async metadata(bytes) {
            await need('pdflib');
            const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
            doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([]);
            doc.setCreator(''); doc.setProducer('');
            return doc.save({ updateFieldAppearances: false });
        }
    };

    async function mergeAll(files) {
        await need('pdflib');
        const out = await PDFLib.PDFDocument.create();
        for (const f of files) {
            const doc = await PDFLib.PDFDocument.load(f.bytes);
            (await out.copyPages(doc, doc.getPageIndices())).forEach(p => out.addPage(p));
        }
        return [{ name: 'merged.pdf', bytes: await out.save() }];
    }

    async function runPipeline(steps, files, onProgress) {
        let current = files;
        for (let si = 0; si < steps.length; si++) {
            const step = steps[si];
            if (step.type === 'merge') {
                onProgress(si, null);
                current = await mergeAll(current);
                continue;
            }
            const next = [];
            for (let fi = 0; fi < current.length; fi++) {
                onProgress(si, current[fi].name);
                const bytes = await IMPL[step.type](current[fi].bytes, step.options);
                next.push({ name: current[fi].name, bytes: new Uint8Array(bytes) });
            }
            current = next;
        }
        return current;
    }

    function triggerDownload(blob, name) {
        if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
        S.resultUrl = URL.createObjectURL(blob);
        const a = el('a', { href: S.resultUrl, download: name });
        document.body.appendChild(a);
        a.click();
        a.remove();
        return S.resultUrl;
    }

    /* ---------- UI ---------- */
    function applyStaticText() {
        const t = L();
        $('wf-title').textContent = t.pageTitle;
        $('wf-desc').textContent = t.pageDesc;
        $('wf-login-title').textContent = t.loginTitle;
        $('wf-login-desc').textContent = t.loginDesc;
        $('wf-login-btn').textContent = t.login;
        $('wf-register-btn').textContent = t.register;
        $('wf-builder-title').textContent = t.builder;
        $('wf-name-label').textContent = t.nameLabel;
        $('wf-name').placeholder = t.namePh;
        $('wf-steps-title').textContent = t.steps;
        $('wf-save-new').textContent = t.saveNew;
        $('wf-reset').textContent = t.reset;
        $('wf-saved-title').textContent = t.mySaved;
        $('wf-run-title').textContent = t.runTitle;
        $('wf-drop-text').textContent = t.pickFiles;
        $('wf-run-btn').textContent = t.runBtn;
        $('wf-save').textContent = t.save;
        const sel = $('wf-add-step');
        const cur = sel.value;
        sel.replaceChildren(el('option', { value: '', text: '+ ' + t.addStep }));
        Object.keys(STEP_DEFS).forEach(k => sel.appendChild(el('option', { value: k, text: t.s[k][0] })));
        sel.value = cur || '';
    }

    function defaultOptions(type) {
        const o = {};
        STEP_DEFS[type].opts.forEach(d => { o[d.key] = d.def; });
        return o;
    }

    function renderSteps() {
        const t = L();
        const box = $('wf-steps');
        box.replaceChildren();
        if (!S.steps.length) {
            box.appendChild(el('p', { class: 'wf-empty', text: t.noSteps }));
            return;
        }
        S.steps.forEach((step, i) => {
            const def = STEP_DEFS[step.type];
            const info = t.s[step.type];
            const head = el('div', { class: 'wf-step-head' }, [
                el('span', { class: 'wf-step-num', text: String(i + 1) }),
                el('i', { class: 'fa-solid ' + STEP_ICONS[step.type] }),
                el('div', { class: 'wf-step-name' }, [el('strong', { text: info[0] }), el('small', { text: info[1] })]),
                el('div', { class: 'wf-step-actions' }, [
                    el('button', { type: 'button', title: t.up, 'aria-label': t.up, onclick: () => moveStep(i, -1), ...(i === 0 ? { disabled: '' } : {}) }, [el('i', { class: 'fa-solid fa-arrow-up' })]),
                    el('button', { type: 'button', title: t.down, 'aria-label': t.down, onclick: () => moveStep(i, 1), ...(i === S.steps.length - 1 ? { disabled: '' } : {}) }, [el('i', { class: 'fa-solid fa-arrow-down' })]),
                    el('button', { type: 'button', title: t.remove, 'aria-label': t.remove, onclick: () => { S.steps.splice(i, 1); renderSteps(); } }, [el('i', { class: 'fa-solid fa-xmark' })])
                ])
            ]);
            const body = el('div', { class: 'wf-step-opts' });
            def.opts.forEach(d => {
                let input;
                if (d.type === 'select') {
                    input = el('select', {}, d.values.map(([v, lk]) => el('option', { value: v, text: t[lk] })));
                    input.value = step.options[d.key] ?? d.def;
                    input.addEventListener('change', () => { step.options[d.key] = input.value; });
                } else {
                    input = el('input', { type: 'text', maxlength: '100' });
                    input.value = step.options[d.key] ?? d.def;
                    input.addEventListener('input', () => { step.options[d.key] = input.value; });
                }
                body.appendChild(el('label', { class: 'wf-opt' }, [el('span', { text: t[d.label] }), input]));
            });
            if (def.password) body.appendChild(el('small', { class: 'wf-note', text: t.passNote }));
            box.appendChild(el('div', { class: 'wf-step' }, [head, ...(body.childNodes.length ? [body] : [])]));
        });
        renderPasswordInputs();
    }

    function moveStep(i, d) {
        const j = i + d;
        if (j < 0 || j >= S.steps.length) return;
        [S.steps[i], S.steps[j]] = [S.steps[j], S.steps[i]];
        renderSteps();
    }

    // Run-time password fields live outside the saved options so they are never sent to the server.
    const runPasswords = {};
    function renderPasswordInputs() {
        const t = L();
        const box = $('wf-pass-box');
        box.replaceChildren();
        const needing = S.steps.map((s, i) => ({ s, i })).filter(x => STEP_DEFS[x.s.type].password);
        if (!needing.length) return;
        box.appendChild(el('strong', { text: t.askPass }));
        needing.forEach(({ s, i }) => {
            const input = el('input', { type: 'password', autocomplete: 'off', maxlength: '200' });
            input.value = runPasswords[i] || '';
            input.addEventListener('input', () => { runPasswords[i] = input.value; });
            box.appendChild(el('label', { class: 'wf-opt' }, [el('span', { text: `${i + 1}. ${t.s[s.type][0]} – ${t.passFor}` }), input]));
        });
    }

    function renderSaved() {
        const t = L();
        const box = $('wf-saved');
        box.replaceChildren();
        if (!S.workflows.length) {
            box.appendChild(el('p', { class: 'wf-empty', text: t.none }));
            return;
        }
        S.workflows.forEach(w => {
            const chain = w.steps.map(s => (t.s[s.type] || [s.type])[0]).join(' → ');
            box.appendChild(el('div', { class: 'wf-saved-item' + (w.id === S.editingId ? ' active' : '') }, [
                el('div', { class: 'wf-saved-info' }, [el('strong', { text: w.name }), el('small', { text: chain })]),
                el('div', { class: 'wf-saved-actions' }, [
                    el('button', { type: 'button', class: 'wf-mini wf-mini-primary', text: t.edit, onclick: () => loadWorkflow(w) }),
                    el('button', { type: 'button', class: 'wf-mini wf-mini-danger', text: t.del, onclick: () => deleteWorkflow(w) })
                ])
            ]));
        });
    }

    function loadWorkflow(w) {
        S.editingId = w.id;
        $('wf-name').value = w.name;
        S.steps = w.steps
            .filter(s => STEP_DEFS[s.type])
            .map(s => ({ type: s.type, options: Object.assign(defaultOptions(s.type), s.options || {}) }));
        Object.keys(runPasswords).forEach(k => delete runPasswords[k]);
        renderSteps();
        renderSaved();
        setMessage('');
        window.scrollTo({ top: $('wf-builder').offsetTop - 80, behavior: 'smooth' });
    }

    function resetBuilder() {
        S.editingId = null;
        $('wf-name').value = '';
        S.steps = [];
        Object.keys(runPasswords).forEach(k => delete runPasswords[k]);
        renderSteps();
        renderSaved();
        setMessage('');
    }

    function setMessage(text, isError) {
        const m = $('wf-message');
        m.textContent = text;
        m.className = 'wf-message' + (isError ? ' error' : text ? ' ok' : '');
    }

    function apiError(e) {
        const t = L();
        if (e && e.code === 'limit_reached') return t.limit;
        return (e && PDFsHubAuth.t().errors[e.code]) || t.saveFail;
    }

    function serializeSteps() {
        return S.steps.map(s => ({ type: s.type, options: s.options }));
    }

    async function save(asNew) {
        const t = L();
        const name = $('wf-name').value.trim();
        if (!name) return setMessage(t.needName, true);
        if (!S.steps.length) return setMessage(t.needSteps, true);
        try {
            const body = { name, steps: serializeSteps() };
            if (S.editingId && !asNew) {
                await PDFsHubAuth.api('workflows.php?id=' + S.editingId, 'PUT', body);
            } else {
                const r = await PDFsHubAuth.api('workflows.php', 'POST', body);
                S.editingId = r.id;
            }
            await refreshList();
            setMessage(t.saved);
        } catch (e) {
            setMessage(apiError(e), true);
        }
    }

    async function deleteWorkflow(w) {
        if (!confirm(L().confirmDel)) return;
        try {
            await PDFsHubAuth.api('workflows.php?id=' + w.id, 'DELETE');
            if (S.editingId === w.id) S.editingId = null;
            await refreshList();
        } catch (e) {
            setMessage(apiError(e), true);
        }
    }

    async function refreshList() {
        try {
            const r = await PDFsHubAuth.api('workflows.php');
            S.workflows = r.workflows;
        } catch (e) {
            S.workflows = [];
            setMessage(L().loadFail, true);
        }
        renderSaved();
    }

    function setFiles(list) {
        const pdfs = Array.from(list).filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
        S.files = pdfs;
        const t = L();
        $('wf-file-list').textContent = pdfs.length ? `${pdfs.length} ${t.files}: ${pdfs.map(f => f.name).join(', ')}` : '';
    }

    async function run() {
        const t = L();
        if (S.busy) return;
        const out = $('wf-run-status');
        const dl = $('wf-download');
        dl.hidden = true;
        if (!S.steps.length) return (out.textContent = t.noSteps2, out.className = 'wf-message error');
        if (!S.files.length) return (out.textContent = t.noFiles, out.className = 'wf-message error');

        const steps = S.steps.map((s, i) => ({ type: s.type, options: Object.assign({}, s.options, STEP_DEFS[s.type].password ? { password: runPasswords[i] || '' } : {}) }));
        if (steps.some(s => STEP_DEFS[s.type].password && !s.options.password)) {
            out.textContent = t.passMissing; out.className = 'wf-message error';
            return;
        }

        S.busy = true;
        $('wf-run-btn').disabled = true;
        out.className = 'wf-message';
        try {
            const files = [];
            for (const f of S.files) files.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
            const results = await runPipeline(steps, files, (si, name) => {
                out.textContent = `${t.progress}: ${si + 1}/${steps.length} – ${t.s[steps[si].type][0]}${name ? ' (' + name + ')' : ''}`;
            });
            let blob, name;
            if (results.length === 1) {
                blob = new Blob([results[0].bytes], { type: 'application/pdf' });
                name = results[0].name.replace(/\.pdf$/i, '') + '_workflow.pdf';
            } else {
                await need('jszip');
                const zip = new JSZip();
                const used = {};
                results.forEach(r => {
                    let n = r.name;
                    if (used[n]) n = n.replace(/(\.pdf)?$/i, ` (${used[n]}).pdf`);
                    used[r.name] = (used[r.name] || 0) + 1;
                    zip.file(n, r.bytes);
                });
                blob = await zip.generateAsync({ type: 'blob' });
                name = 'workflow_results.zip';
            }
            const url = triggerDownload(blob, name);
            dl.href = url; dl.download = name; dl.textContent = t.download; dl.hidden = false;
            out.textContent = t.done;
            out.className = 'wf-message ok';
        } catch (e) {
            out.textContent = `${t.failed}: ${e.message || e}`;
            out.className = 'wf-message error';
        } finally {
            S.busy = false;
            $('wf-run-btn').disabled = false;
        }
    }

    function showForUser(user) {
        $('wf-login').hidden = !!user;
        $('wf-app').hidden = !user;
        if (user) refreshList();
    }

    function init() {
        applyStaticText();
        renderSteps();
        $('wf-add-step').addEventListener('change', (e) => {
            const type = e.target.value;
            if (!type) return;
            S.steps.push({ type, options: defaultOptions(type) });
            e.target.value = '';
            renderSteps();
        });
        $('wf-save').addEventListener('click', () => save(false));
        $('wf-save-new').addEventListener('click', () => save(true));
        $('wf-reset').addEventListener('click', resetBuilder);
        $('wf-run-btn').addEventListener('click', run);
        $('wf-login-btn').addEventListener('click', () => PDFsHubAuth.openModal('login'));
        $('wf-register-btn').addEventListener('click', () => PDFsHubAuth.openModal('register'));

        const drop = $('wf-drop');
        const input = $('wf-files');
        input.addEventListener('change', () => setFiles(input.files));
        ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
        ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
        drop.addEventListener('drop', (e) => setFiles(e.dataTransfer.files));

        document.addEventListener('pdfshub:auth', (e) => showForUser(e.detail.user));
        PDFsHubAuth.ready.then(() => showForUser(PDFsHubAuth.user));

        $('lang-select').value = localStorage.getItem('pdfshub_lang') || 'tr';
        $('lang-select').addEventListener('change', (e) => {
            localStorage.setItem('pdfshub_lang', e.target.value);
            document.documentElement.lang = e.target.value;
            applyStaticText();
            renderSteps();
            renderSaved();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
