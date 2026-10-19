/* PDFsHub account: navbar button, login/register modal, Google sign-in. */
(function () {
    'use strict';

    const T = {
        tr: {
            login: 'Giriş Yap', register: 'Kayıt Ol', logout: 'Çıkış Yap', workflows: 'İş Akışlarım',
            name: 'Ad Soyad', email: 'E-posta', password: 'Şifre', passwordHint: 'En az 8 karakter',
            submitLogin: 'Giriş Yap', submitRegister: 'Hesap Oluştur', or: 'veya', close: 'Kapat',
            titleLogin: 'Tekrar hoş geldiniz', titleRegister: 'Ücretsiz hesap oluşturun',
            noAccount: 'Hesabınız yok mu?', haveAccount: 'Zaten hesabınız var mı?',
            googleMissing: 'Google ile giriş şu an yapılandırılmamış.',
            errors: {
                invalid_credentials: 'E-posta veya şifre hatalı.', email_taken: 'Bu e-posta ile zaten bir hesap var.',
                invalid_email: 'Geçerli bir e-posta girin.', invalid_name: 'Adınızı girin.',
                weak_password: 'Şifre en az 8 karakter olmalı.', too_many_attempts: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.',
                google_failed: 'Google girişi doğrulanamadı.', network: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.',
                server_error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.', server_not_configured: 'Üyelik sistemi henüz yapılandırılmadı.'
            }
        },
        en: {
            login: 'Log in', register: 'Sign up', logout: 'Log out', workflows: 'My workflows',
            name: 'Full name', email: 'Email', password: 'Password', passwordHint: 'At least 8 characters',
            submitLogin: 'Log in', submitRegister: 'Create account', or: 'or', close: 'Close',
            titleLogin: 'Welcome back', titleRegister: 'Create a free account',
            noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
            googleMissing: 'Google sign-in is not configured yet.',
            errors: {
                invalid_credentials: 'Incorrect email or password.', email_taken: 'An account with this email already exists.',
                invalid_email: 'Enter a valid email.', invalid_name: 'Enter your name.',
                weak_password: 'Password must be at least 8 characters.', too_many_attempts: 'Too many attempts. Please try again later.',
                google_failed: 'Google sign-in could not be verified.', network: 'Could not reach the server. Please try again.',
                server_error: 'Server error. Please try again later.', server_not_configured: 'The account system is not configured yet.'
            }
        }
    };
    const lang = () => (localStorage.getItem('pdfshub_lang') || document.documentElement.lang || 'tr');
    const t = () => (lang() === 'tr' ? T.tr : T.en);

    const state = { user: null, googleClientId: null, modal: null, mode: 'login' };

    async function api(path, method, body) {
        let res;
        try {
            res = await fetch('api/' + path, {
                method: method || 'GET',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'pdfshub' },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (e) {
            throw { code: 'network' };
        }
        let data = {};
        try { data = await res.json(); } catch (e) { /* non-JSON response */ }
        if (!res.ok) throw { code: data.error || 'server_error', status: res.status };
        return data;
    }

    function errText(e) {
        return t().errors[e && e.code] || t().errors.server_error;
    }

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

    function setUser(user) {
        state.user = user;
        renderNav();
        document.dispatchEvent(new CustomEvent('pdfshub:auth', { detail: { user } }));
    }

    function renderNav() {
        const host = document.querySelector('.nav-right');
        if (!host) return;
        let box = document.getElementById('account-nav');
        if (!box) {
            box = el('div', { id: 'account-nav', class: 'account-nav' });
            const sw = host.querySelector('.lang-switcher');
            host.insertBefore(box, sw || null);
        }
        box.replaceChildren();
        if (!state.user) {
            box.appendChild(el('a', { class: 'acc-link', href: 'workflows.html', text: t().workflows }));
            box.appendChild(el('button', { class: 'acc-btn acc-btn-ghost', type: 'button', text: t().login, onclick: () => openModal('login') }));
            box.appendChild(el('button', { class: 'acc-btn acc-btn-primary', type: 'button', text: t().register, onclick: () => openModal('register') }));
            return;
        }
        const initial = (state.user.name || state.user.email || '?').trim().charAt(0).toUpperCase();
        const menu = el('div', { class: 'acc-menu', hidden: '' }, [
            el('div', { class: 'acc-menu-head' }, [
                el('strong', { text: state.user.name }),
                el('span', { text: state.user.email })
            ]),
            el('a', { href: 'workflows.html', text: t().workflows }),
            el('button', { type: 'button', text: t().logout, onclick: logout })
        ]);
        const trigger = el('button', {
            class: 'acc-avatar', type: 'button', 'aria-label': state.user.name,
            onclick: (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; }
        }, [el('span', { text: initial })]);
        box.appendChild(trigger);
        box.appendChild(menu);
    }

    document.addEventListener('click', (e) => {
        const menu = document.querySelector('#account-nav .acc-menu');
        if (menu && !e.target.closest('#account-nav')) menu.hidden = true;
    });

    async function logout() {
        try { await api('auth.php?action=logout', 'POST', {}); } catch (e) { /* ignore */ }
        if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
        setUser(null);
        if (location.pathname.endsWith('workflows.html') || location.pathname.endsWith('/workflows')) location.href = 'index.html';
    }

    function loadGoogle() {
        if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
        if (window.__gsiPromise) return window.__gsiPromise;
        window.__gsiPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return window.__gsiPromise;
    }

    async function onGoogleCredential(resp) {
        const err = document.getElementById('acc-error');
        try {
            const data = await api('auth.php?action=google', 'POST', { credential: resp.credential });
            setUser(data.user);
            closeModal();
        } catch (e) {
            if (err) err.textContent = errText(e);
        }
    }

    async function renderGoogleButton(container) {
        if (!state.googleClientId) {
            container.appendChild(el('p', { class: 'acc-muted', text: t().googleMissing }));
            return;
        }
        try {
            await loadGoogle();
            google.accounts.id.initialize({ client_id: state.googleClientId, callback: onGoogleCredential });
            google.accounts.id.renderButton(container, {
                theme: 'outline', size: 'large', width: 320, text: state.mode === 'login' ? 'signin_with' : 'signup_with',
                locale: lang()
            });
        } catch (e) {
            container.appendChild(el('p', { class: 'acc-muted', text: t().googleMissing }));
        }
    }

    function closeModal() {
        if (state.modal) { state.modal.remove(); state.modal = null; }
        document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') closeModal(); }

    function openModal(mode) {
        closeModal();
        state.mode = mode === 'register' ? 'register' : 'login';
        const isReg = state.mode === 'register';
        const L = t();

        const err = el('p', { id: 'acc-error', class: 'acc-error', role: 'alert' });
        const nameIn = el('input', { type: 'text', name: 'name', autocomplete: 'name', maxlength: '100', required: '' });
        const emailIn = el('input', { type: 'email', name: 'email', autocomplete: 'email', maxlength: '190', required: '' });
        const passIn = el('input', {
            type: 'password', name: 'password', required: '', minlength: isReg ? '8' : '1', maxlength: '200',
            autocomplete: isReg ? 'new-password' : 'current-password'
        });
        const field = (label, input, hint) => el('label', { class: 'acc-field' }, [
            el('span', { text: label }), input, ...(hint ? [el('small', { text: hint })] : [])
        ]);
        const submit = el('button', { class: 'acc-btn acc-btn-primary acc-btn-block', type: 'submit', text: isReg ? L.submitRegister : L.submitLogin });

        const form = el('form', { class: 'acc-form', novalidate: '' }, [
            ...(isReg ? [field(L.name, nameIn)] : []),
            field(L.email, emailIn),
            field(L.password, passIn, isReg ? L.passwordHint : null),
            err, submit
        ]);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            err.textContent = '';
            submit.disabled = true;
            try {
                const body = { email: emailIn.value, password: passIn.value };
                if (isReg) body.name = nameIn.value;
                const data = await api('auth.php?action=' + (isReg ? 'register' : 'login'), 'POST', body);
                setUser(data.user);
                closeModal();
            } catch (ex) {
                err.textContent = errText(ex);
            } finally {
                submit.disabled = false;
            }
        });

        const gbox = el('div', { class: 'acc-google' });
        const card = el('div', { class: 'acc-card', role: 'dialog', 'aria-modal': 'true' }, [
            el('button', { class: 'acc-close', type: 'button', 'aria-label': L.close, text: '×', onclick: closeModal }),
            el('h3', { text: isReg ? L.titleRegister : L.titleLogin }),
            gbox,
            el('div', { class: 'acc-sep' }, [el('span', { text: L.or })]),
            form,
            el('p', { class: 'acc-switch' }, [
                document.createTextNode((isReg ? L.haveAccount : L.noAccount) + ' '),
                el('a', { href: '#', text: isReg ? L.login : L.register, onclick: (e) => { e.preventDefault(); openModal(isReg ? 'login' : 'register'); } })
            ])
        ]);
        const overlay = el('div', { class: 'acc-overlay', onclick: (e) => { if (e.target === overlay) closeModal(); } }, [card]);
        document.body.appendChild(overlay);
        state.modal = overlay;
        document.addEventListener('keydown', onKey);
        renderGoogleButton(gbox);
        (isReg ? nameIn : emailIn).focus();
    }

    const ready = api('auth.php?action=me').then(d => {
        state.googleClientId = d.google_client_id;
        setUser(d.user);
    }).catch(() => { setUser(null); });

    window.PDFsHubAuth = {
        ready,
        api,
        openModal,
        logout,
        t,
        get user() { return state.user; }
    };

    function init() { renderNav(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
