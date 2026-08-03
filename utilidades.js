// ================================================================
//  UTILIDADES - Funciones reutilizables
// ================================================================

// ---- PERSISTENCIA EN LOCALSTORAGE ----
export const USERS_KEY = 'sqp_users_v4';
export const QUOTES_KEY = 'sqp_quotes';
export const COUNTER_KEY = 'sqp_counter';
export const TEMPLATES_KEY = 'sqp_templates';
export const SESSION_KEY = 'sqp_session';
export const SUGGESTIONS_KEY = 'sqp_suggestions';

export function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
export function getQuotes() {
    try { return JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]'); } catch { return []; }
}
export function saveQuotes(quotes) {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}
export function getCounter() {
    try { return parseInt(localStorage.getItem(COUNTER_KEY) || '0'); } catch { return 0; }
}
export function incrementCounter() {
    const newVal = getCounter() + 1;
    localStorage.setItem(COUNTER_KEY, String(newVal));
    return newVal;
}
export function getTemplates() {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
export function saveTemplates(templates) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
export function getSuggestions() {
    try { return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]'); } catch { return []; }
}
export function saveSuggestions(suggestions) {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
}

// ---- HASH CON WEB CRYPTO API ----
export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function hashPassword(password, salt = null) {
    if (!salt) {
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        salt = bufferToBase64(saltBytes);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = bufferToBase64(hashBuffer);
    return { hash, salt };
}

export async function verifyPassword(password, storedHash, storedSalt) {
    const { hash } = await hashPassword(password, storedSalt);
    return hash === storedHash;
}

// ---- SANEAMIENTO ----
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

export function sanitizeObject(obj) {
    if (typeof obj === 'string') return escapeHtml(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeObject(value);
        }
        return result;
    }
    return obj;
}

// ---- SESIÓN ----
const SESSION_TIMEOUT_HOURS = 8;

export function setSession(user, role) {
    const session = { user, role, timestamp: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        const elapsed = (Date.now() - session.timestamp) / (1000 * 60 * 60);
        if (elapsed > SESSION_TIMEOUT_HOURS) {
            sessionStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

// ---- LOGO SVG ----
export let cachedPdfLogoDataUri = null;

export function generatePdfLogoFallback() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#166490';
    const radius = 20, x = 0, y = 0, w = 200, h = 200;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#D4B85C';
    ctx.font = 'bold 90px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SQP', 100, 105);
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('LEGAL', 100, 155);
    return canvas.toDataURL('image/png');
}

export function getPdfLogoDataUri() {
    if (cachedPdfLogoDataUri) {
        return Promise.resolve(cachedPdfLogoDataUri);
    }
    return new Promise((resolve) => {
        const sourceSvg = document.getElementById('sqpLogoSvg');
        if (!sourceSvg) {
            cachedPdfLogoDataUri = generatePdfLogoFallback();
            resolve(cachedPdfLogoDataUri);
            return;
        }
        const svgClone = sourceSvg.cloneNode(true);
        svgClone.removeAttribute('id');
        svgClone.setAttribute('width', '800');
        svgClone.setAttribute('height', '733');
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const svgMarkup = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 733;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 800, 733);
            URL.revokeObjectURL(blobUrl);
            try {
                cachedPdfLogoDataUri = canvas.toDataURL('image/png');
            } catch (e) {
                cachedPdfLogoDataUri = generatePdfLogoFallback();
            }
            resolve(cachedPdfLogoDataUri);
        };
        img.onerror = function() {
            URL.revokeObjectURL(blobUrl);
            cachedPdfLogoDataUri = generatePdfLogoFallback();
            resolve(cachedPdfLogoDataUri);
        };
        img.src = blobUrl;
    });
}

// ---- LOADER ----
export function showLoader(text = 'Generando PDF…') {
    document.getElementById('loaderText').textContent = text;
    document.getElementById('loaderOverlay').classList.add('active');
}

export function hideLoader() {
    document.getElementById('loaderOverlay').classList.remove('active');
}