/**
 * ================================================================
 *  SQP LEGAL CONSULTING - Cotizador Jurídico (v5)
 *  - Todo el código en un solo archivo
 *  - Envío por WhatsApp Web
 *  - Buzón de sugerencias
 *  - Métodos de pago fijos en el PDF
 * ================================================================
 */

// ================================================================
//  UTILIDADES - Funciones reutilizables
// ================================================================

// ---- PERSISTENCIA EN LOCALSTORAGE ----
const USERS_KEY = 'sqp_users_v4';
const QUOTES_KEY = 'sqp_quotes';
const COUNTER_KEY = 'sqp_counter';
const TEMPLATES_KEY = 'sqp_templates';
const SESSION_KEY = 'sqp_session';
const SUGGESTIONS_KEY = 'sqp_suggestions';

function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getQuotes() {
    try { return JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]'); } catch { return []; }
}
function saveQuotes(quotes) {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}
function getCounter() {
    try { return parseInt(localStorage.getItem(COUNTER_KEY) || '0'); } catch { return 0; }
}
function incrementCounter() {
    const newVal = getCounter() + 1;
    localStorage.setItem(COUNTER_KEY, String(newVal));
    return newVal;
}
function getTemplates() {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
function saveTemplates(templates) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
function getSuggestions() {
    try { return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]'); } catch { return []; }
}
function saveSuggestions(suggestions) {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
}

// ---- HASH CON WEB CRYPTO API ----
function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function hashPassword(password, salt = null) {
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

async function verifyPassword(password, storedHash, storedSalt) {
    const { hash } = await hashPassword(password, storedSalt);
    return hash === storedHash;
}

// ---- SANEAMIENTO ----
function escapeHtml(text) {
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

function sanitizeObject(obj) {
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

function setSession(user, role) {
    const session = { user, role, timestamp: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
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

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

// ---- LOGO SVG (convertir a PNG para favicon y PDF) ----
let cachedPdfLogoDataUri = null;

function generatePdfLogoFallback() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#166490';
    const radius = 20,
        x = 0,
        y = 0,
        w = 200,
        h = 200;
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

function getPdfLogoDataUri() {
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
function showLoader(text = 'Generando PDF…') {
    document.getElementById('loaderText').textContent = text;
    document.getElementById('loaderOverlay').classList.add('active');
}

function hideLoader() {
    document.getElementById('loaderOverlay').classList.remove('active');
}

// ================================================================
//  DATOS ESTÁTICOS
// ================================================================
const defaultServices = [
    { name: 'Impuesto Al Estado', price: 0 },
    { name: 'Honorarios', price: 0 },
    { name: 'Gastos Administrativos', price: 0 },
    { name: 'Notificación', price: 0 },
    { name: 'Tribunal', price: 0 },
    { name: 'Honorarios + Membresia', price: 0 },
    { name: 'Multa', price: 0 },
    { name: 'Descuento', price: 0 }
];

const requirementsList = [
    'Pasaporte vigente',
    'Fotos tamaño carnet',
    'Copia de cédula',
    'Comprobante de solvencia económica',
    'Recibo de domicilio/contrato de arrendamiento a su nombre'
];

const procedureRequirements = {
    'Visa de turista.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Comprobante de solvencia económica'],
    'Visa de tránsito.': ['Pasaporte vigente', 'Fotos tamaño carnet'],
    'Extensión de visa de turista.': ['Pasaporte vigente', 'Comprobante de solvencia económica'],
    'Visa múltiple.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula'],
    'Visa para marinos.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula'],
    'Estudiantes.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
    'Reagrupación familiar.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Recibo de domicilio/contrato de arrendamiento a su nombre'],
    'Inversionista macroempresa.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
    'Inversión en bienes inmuebles.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
    'Rentista retirado.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
    'Jubilado o pensionado.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
    'Naturalización.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Recibo de domicilio/contrato de arrendamiento a su nombre'],
    'Profesional extranjero.': ['Pasaporte vigente', 'Fotos tamaño carnet', 'Copia de cédula', 'Comprobante de solvencia económica'],
};

// ================================================================
//  VARIABLES GLOBALES DE LA APLICACIÓN
// ================================================================
let currentUser = null;
let currentRole = null;
let lastQuoteData = null;
let pendingGenerate = null;
let historyQuotes = [];

// ================================================================
//  INICIALIZACIÓN DE USUARIOS
// ================================================================
(function initUsers() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const defaults = {
            "Lic. Susana Sabalza": { password: null, salt: null, role: "admin", photo: "", signature: "" },
            "Lic. Eligmary Carrillo": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Santiago Sañudo": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Daryl Villa": { password: null, salt: null, role: "admin", photo: "", signature: "" },
            "Lic. Nayibe Sabalza": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Linda Simmonds": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Antony Talla": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Oscaris Ugas": { password: null, salt: null, role: "executive", photo: "", signature: "" },
            "Lic. Linoska Ugas": { password: null, salt: null, role: "executive", photo: "", signature: "" }
        };
        saveUsers(defaults);
        console.log('👤 Usuarios por defecto creados.');
    }
})();

// ================================================================
//  AUTENTICACIÓN (LOGIN, LOGOUT, USUARIOS)
// ================================================================

// ---- LOGIN ----
async function handleLogin() {
    console.log('🔐 Intentando login...');
    const username = document.getElementById('loginUserSelect').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username) { errorDiv.textContent = 'Seleccione un usuario.'; return; }
    if (!password) { errorDiv.textContent = 'Ingrese una contraseña.'; return; }

    const users = getUsers();
    const user = users[username];
    if (!user) { errorDiv.textContent = 'Usuario no válido.'; return; }

    try {
        if (user.password === null || user.password === undefined) {
            console.log(`🔑 Creando contraseña para ${username}...`);
            const { hash, salt } = await hashPassword(password);
            user.password = hash;
            user.salt = salt;
            saveUsers(users);
            console.log('✅ Contraseña creada y guardada.');
        } else {
            console.log(`🔍 Verificando contraseña para ${username}...`);
            const match = await verifyPassword(password, user.password, user.salt);
            if (!match) {
                errorDiv.textContent = 'Contraseña incorrecta.';
                console.warn('❌ Contraseña incorrecta.');
                return;
            }
            console.log('✅ Contraseña correcta.');
        }

        currentUser = username;
        currentRole = user.role;
        setSession(username, user.role);

        const loginScreen = document.getElementById('loginScreen');
        loginScreen.style.transform = 'scale(0)';
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            showApp();
        }, 300);
        errorDiv.textContent = '';
        console.log(`👤 Usuario ${username} logueado como ${currentRole}.`);
    } catch (err) {
        console.error('❌ Error en login:', err);
        errorDiv.textContent = 'Error inesperado. Revisa la consola.';
    }
}

// ---- LOGOUT ----
function handleLogout() {
    currentUser = null;
    currentRole = null;
    clearSession();
    const mainApp = document.getElementById('mainApp');
    mainApp.style.transform = 'scale(0)';
    mainApp.style.opacity = '0';
    setTimeout(() => {
        mainApp.style.display = 'none';
        const loginScreen = document.getElementById('loginScreen');
        loginScreen.style.display = 'block';
        loginScreen.style.transform = 'scale(1)';
        loginScreen.style.opacity = '1';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').textContent = '';
    }, 300);
}

// ---- USUARIOS (ADMIN) ----
function openUsersModal() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    renderUsersList();
    document.getElementById('usersModal').classList.add('active');
}

function closeUsersModal() {
    document.getElementById('usersModal').classList.remove('active');
}

function renderUsersList() {
    const users = getUsers();
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    for (const [name, data] of Object.entries(users)) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '0.5rem';
        div.style.borderBottom = '1px solid var(--border)';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = data.role === 'admin';
        checkbox.addEventListener('change', function() {
            toggleUserRole(name, this.checked);
        });
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        toggleLabel.appendChild(checkbox);
        const slider = document.createElement('span');
        slider.className = 'slider';
        toggleLabel.appendChild(slider);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', function() {
            deleteUser(name);
        });
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '0.5rem';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.appendChild(toggleLabel);
        actionsDiv.appendChild(deleteBtn);
        div.innerHTML = `<span>${name} (${data.role})</span>`;
        div.appendChild(actionsDiv);
        container.appendChild(div);
    }
}

function toggleUserRole(username, isAdmin) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    const users = getUsers();
    if (users[username]) {
        users[username].role = isAdmin ? 'admin' : 'executive';
        saveUsers(users);
        renderUsersList();
    }
}

function deleteUser(username) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    if (username === currentUser) { alert('No puedes eliminarte a ti mismo.'); return; }
    if (confirm(`¿Eliminar a ${username}?`)) {
        const users = getUsers();
        delete users[username];
        saveUsers(users);
        renderUsersList();
    }
}

function addUser() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    const name = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newUserRole').value;
    if (!name) { alert('Nombre requerido.'); return; }
    const users = getUsers();
    if (users[name]) { alert('El usuario ya existe.'); return; }
    users[name] = { password: null, salt: null, role: role, photo: '', signature: '' };
    saveUsers(users);
    renderUsersList();
    document.getElementById('newUsername').value = '';
}

// ---- RECUPERAR CONTRASEÑA ----
function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordDisplay').textContent =
        'Selecciona un usuario y haz clic en "Mostrar contraseña".';
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

function showPassword() {
    const username = document.getElementById('loginUserSelect').value;
    if (!username) {
        document.getElementById('passwordDisplay').textContent = '⚠️ Primero selecciona un usuario.';
        return;
    }
    const users = getUsers();
    const user = users[username];
    if (!user) {
        document.getElementById('passwordDisplay').textContent = '⚠️ Usuario no encontrado.';
        return;
    }
    document.getElementById('passwordDisplay').innerHTML = `
                🔐 La contraseña está encriptada por seguridad.<br>
                Si la olvidaste, un administrador puede restablecerla desde el panel de usuarios.<br>
                <button id="resetPasswordBtn" style="margin-top:0.5rem;">Restablecer contraseña</button>
            `;
    document.getElementById('resetPasswordBtn')?.addEventListener('click', function() {
        if (confirm(`¿Restablecer la contraseña de ${username}? Se pondrá en blanco para que pueda crear una nueva.`)) {
            const users = getUsers();
            users[username].password = null;
            users[username].salt = null;
            saveUsers(users);
            alert('Contraseña restablecida. El usuario podrá crear una nueva al iniciar sesión.');
            closePasswordModal();
        }
    });
}

// ================================================================
//  PERFIL DE USUARIO
// ================================================================

function openProfileModal() {
    const users = getUsers();
    const user = users[currentUser];
    document.getElementById('profileSignature').value = user.signature || '';
    updateSignaturePreview();
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function updateSignaturePreview() {
    const sig = document.getElementById('profileSignature').value || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
    document.getElementById('signaturePreview').textContent = sig;
}

function optimizeProfileImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 200, 200);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function updateProfile() {
    const newPass = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;
    const errorDiv = document.getElementById('profileError');
    if (newPass && newPass !== confirm) {
        errorDiv.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    try {
        const users = getUsers();
        const signature = document.getElementById('profileSignature').value.trim();
        if (signature) {
            users[currentUser].signature = signature;
        } else {
            delete users[currentUser].signature;
        }

        const file = document.getElementById('profilePicInput').files[0];
        if (file) {
            const optimized = await optimizeProfileImage(file);
            users[currentUser].photo = optimized;
        }

        if (newPass) {
            const { hash, salt } = await hashPassword(newPass);
            users[currentUser].password = hash;
            users[currentUser].salt = salt;
        }

        saveUsers(users);
        updateProfilePic();
        closeProfileModal();
        alert('Perfil actualizado.');
        errorDiv.textContent = '';
    } catch (err) {
        errorDiv.textContent = 'Error al procesar la imagen: ' + err.message;
    }
}

function updateProfilePic() {
    const users = getUsers();
    const photo = users[currentUser]?.photo || '';
    const pic = document.getElementById('profilePicDisplay');
    const preview = document.getElementById('profilePicPreview');
    if (photo) {
        pic.src = photo;
        pic.style.display = 'inline-block';
        if (preview) preview.src = photo;
    } else {
        const defaultAvatar =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="35" r="25" fill="%23ccc"/%3E%3Cpath d="M25 80 Q50 95 75 80" fill="%23ccc"/%3E%3C/svg%3E';
        pic.src = defaultAvatar;
        pic.style.display = 'none';
        if (preview) preview.src = defaultAvatar;
    }
}

function getSignature() {
    const users = getUsers();
    const user = users[currentUser];
    return user.signature || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
}

// ================================================================
//  DASHBOARD (ESTADÍSTICAS)
// ================================================================

function openDashboard() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    document.getElementById('dashboardModal').classList.add('active');
    renderDashboard();
}

function closeDashboard() {
    document.getElementById('dashboardModal').classList.remove('active');
}

function renderDashboard() {
    const quotes = getQuotes();
    const counts = {};
    quotes.forEach(q => { counts[q.executive] = (counts[q.executive] || 0) + 1; });
    const tbody = document.getElementById('dashboardBody');
    tbody.innerHTML = '';
    const users = getUsers();
    Object.keys(users).filter(u => users[u].role === 'executive').forEach(exec => {
        tbody.innerHTML += `<tr><td>${exec}</td><td>${counts[exec] || 0}</td></tr>`;
    });
}

// ================================================================
//  HISTORIAL
// ================================================================

function openHistoryModal() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    historyQuotes = getQuotes();
    document.getElementById('historyModal').classList.add('active');
    renderHistory(historyQuotes);
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

function renderHistory(quotes) {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay cotizaciones</td></tr>';
        return;
    }
    quotes.slice().reverse().forEach(q => {
        const statusClass = {
            'pendiente': 'status-pendiente',
            'aprobada': 'status-aprobada',
            'rechazada': 'status-rechazada',
            'convertida': 'status-convertida',
            'enviada': 'status-enviada'
        } [q.status] || 'status-pendiente';
        const statusLabel = {
            'pendiente': 'Pendiente',
            'aprobada': 'Aprobada',
            'rechazada': 'Rechazada',
            'convertida': 'Convertida',
            'enviada': 'Enviada'
        } [q.status] || 'Pendiente';

        const tr = document.createElement('tr');
        tr.innerHTML = `
                    <td>${q.quoteNumber || 'N/A'}</td>
                    <td>${new Date(q.date).toLocaleString()}</td>
                    <td>${q.executive}</td>
                    <td>${escapeHtml(q.client)}</td>
                    <td>${escapeHtml(q.procedure)}</td>
                    <td>$${q.total.toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <select class="status-select" data-quote="${q.quoteNumber}">
                            <option value="pendiente" ${q.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="enviada" ${q.status === 'enviada' ? 'selected' : ''}>Enviada</option>
                            <option value="aprobada" ${q.status === 'aprobada' ? 'selected' : ''}>Aprobada</option>
                            <option value="rechazada" ${q.status === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                            <option value="convertida" ${q.status === 'convertida' ? 'selected' : ''}>Convertida</option>
                        </select>
                        <button class="btn-sm delete-quote-btn" data-quote="${q.quoteNumber}" style="background:#d0103a;color:white;border:none;border-radius:6px;padding:0.2rem 0.6rem;margin-left:0.3rem;">🗑️</button>
                    </td>
                `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', function() {
            const quoteNum = this.dataset.quote;
            const newStatus = this.value;
            changeQuoteStatus(quoteNum, newStatus);
        });
    });

    document.querySelectorAll('.delete-quote-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const quoteNum = this.dataset.quote;
            deleteQuote(quoteNum);
        });
    });
}

function changeQuoteStatus(quoteNumber, newStatus) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    const quotes = getQuotes();
    const idx = quotes.findIndex(q => q.quoteNumber === quoteNumber);
    if (idx !== -1) {
        const oldStatus = quotes[idx].status;
        quotes[idx].status = newStatus;
        if (!quotes[idx].logs) quotes[idx].logs = [];
        quotes[idx].logs.push({
            action: 'status_change',
            from: oldStatus,
            to: newStatus,
            by: currentUser,
            date: new Date().toISOString()
        });
        saveQuotes(quotes);
        const filtered = applyFiltersSilent();
        renderHistory(filtered);
    }
}

function deleteQuote(quoteNumber) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    if (!confirm(`¿Eliminar la cotización ${quoteNumber}?`)) return;
    let quotes = getQuotes();
    quotes = quotes.filter(q => q.quoteNumber !== quoteNumber);
    saveQuotes(quotes);
    const filtered = applyFiltersSilent();
    renderHistory(filtered);
}

function applyFiltersSilent() {
    const client = document.getElementById('filterClient').value.toLowerCase().trim();
    const exec = document.getElementById('filterExecutive').value.toLowerCase().trim();
    const proc = document.getElementById('filterProcedure').value.toLowerCase().trim();
    const from = document.getElementById('filterDateFrom').value;
    const to = document.getElementById('filterDateTo').value;
    let filtered = getQuotes().filter(q => {
        if (client && !q.client.toLowerCase().includes(client)) return false;
        if (exec && !q.executive.toLowerCase().includes(exec)) return false;
        if (proc && !q.procedure.toLowerCase().includes(proc)) return false;
        if (from) {
            const d = new Date(q.date);
            const f = new Date(from);
            if (d < f) return false;
        }
        if (to) {
            const d = new Date(q.date);
            const t = new Date(to);
            t.setHours(23, 59, 59);
            if (d > t) return false;
        }
        return true;
    });
    return filtered;
}

function applyFilters() {
    const filtered = applyFiltersSilent();
    renderHistory(filtered);
}

function clearFilters() {
    document.getElementById('filterClient').value = '';
    document.getElementById('filterExecutive').value = '';
    document.getElementById('filterProcedure').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    renderHistory(getQuotes());
}

function exportCsv() {
    const filtered = applyFiltersSilent();
    if (filtered.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    const headers = ['Número', 'Fecha', 'Ejecutivo', 'Cliente', 'Trámite', 'Total', 'Estado'];
    const rows = filtered.map(q => [
        q.quoteNumber || '',
        new Date(q.date).toLocaleString(),
        q.executive,
        q.client,
        q.procedure,
        q.total.toFixed(2),
        q.status || 'pendiente'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_cotizaciones_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ================================================================
//  PLANTILLAS DE SERVICIOS
// ================================================================

function openTemplatesModal() {
    document.getElementById('templatesModal').classList.add('active');
    renderTemplates();
}

function closeTemplatesModal() {
    document.getElementById('templatesModal').classList.remove('active');
}

function renderTemplates() {
    const templates = getTemplates();
    const container = document.getElementById('templatesList');
    container.innerHTML = '';
    if (templates.length === 0) {
        container.innerHTML = '<p>No hay plantillas guardadas.</p>';
        return;
    }
    templates.forEach((t, idx) => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
                    <span><strong>${escapeHtml(t.name)}</strong> (${t.services.length} servicios)</span>
                    <div>
                        <button data-idx="${idx}" class="loadTemplateBtn" title="Cargar">📂</button>
                        <button data-idx="${idx}" class="deleteTemplateBtn" title="Eliminar">🗑️</button>
                    </div>
                `;
        container.appendChild(div);
    });
    document.querySelectorAll('.loadTemplateBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.idx);
            loadTemplate(idx);
        });
    });
    document.querySelectorAll('.deleteTemplateBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.idx);
            if (confirm('¿Eliminar esta plantilla?')) {
                const templates = getTemplates();
                templates.splice(idx, 1);
                saveTemplates(templates);
                renderTemplates();
            }
        });
    });
}

function saveCurrentTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) { alert('Ingrese un nombre para la plantilla.'); return; }
    const services = [];
    document.querySelectorAll('.extra-service-check:checked').forEach((cb, idx) => {
        const priceInput = document.getElementById(`price_${idx}`);
        const price = getPriceFromInput(priceInput);
        services.push({ name: cb.value, price: price });
    });
    if (services.length === 0) { alert('Seleccione al menos un servicio.'); return; }
    const procedure = document.getElementById('procedureSearch').value.trim() || '';
    const requirements = Array.from(document.querySelectorAll('.requirement-check:checked')).map(cb => cb.value);
    const templates = getTemplates();
    templates.push({ name, services, procedure, requirements });
    saveTemplates(templates);
    document.getElementById('templateName').value = '';
    renderTemplates();
    alert('Plantilla guardada.');
}

function loadTemplate(idx) {
    const templates = getTemplates();
    const template = templates[idx];
    if (!template) return;
    document.querySelectorAll('.extra-service-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.service-price-input').forEach(inp => {
        inp.value = '';
        inp.setAttribute('data-raw', '');
    });
    document.querySelectorAll('.requirement-check').forEach(cb => cb.checked = false);
    const serviceNames = defaultServices.map(s => s.name);
    template.services.forEach(s => {
        const index = serviceNames.indexOf(s.name);
        if (index !== -1) {
            const cb = document.getElementById(`service_${index}`);
            if (cb) cb.checked = true;
            const priceInput = document.getElementById(`price_${index}`);
            if (priceInput) {
                priceInput.value = s.price.toFixed(2);
                priceInput.setAttribute('data-raw', s.price.toString());
            }
        }
    });
    if (template.procedure) {
        document.getElementById('procedureSearch').value = template.procedure;
        autoSelectRequirements(template.procedure);
    }
    if (template.requirements && template.requirements.length > 0) {
        document.querySelectorAll('.requirement-check').forEach(cb => {
            if (template.requirements.includes(cb.value)) {
                cb.checked = true;
            }
        });
    }
    closeTemplatesModal();
}

// ================================================================
//  COTIZACIONES (GENERACIÓN)
// ================================================================

function buildServicesList() {
    const container = document.getElementById('servicesList');
    container.innerHTML = '';
    defaultServices.forEach((service, index) => {
        const div = document.createElement('div');
        div.className = 'service-item';
        div.innerHTML = `
                    <input type="checkbox" class="extra-service-check" id="service_${index}" value="${service.name}">
                    <span>${service.name}</span>
                    <input type="text" class="service-price-input" id="price_${index}" placeholder="$0.00" inputmode="decimal">
                `;
        container.appendChild(div);
    });
    document.querySelectorAll('.service-price-input').forEach(input => {
        input.addEventListener('focus', handlePriceFocus);
        input.addEventListener('blur', handlePriceBlur);
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9.\-]/g, '');
        });
    });
}

function buildRequirementsList() {
    const grid = document.getElementById('requirementsGrid');
    grid.innerHTML = '';
    requirementsList.forEach(req => {
        const label = document.createElement('label');
        label.className = 'requirement-option';
        label.innerHTML = `<input type="checkbox" class="requirement-check" value="${req}"> ${req}`;
        grid.appendChild(label);
    });
}

function autoSelectRequirements(procedure) {
    const reqs = procedureRequirements[procedure] || [];
    document.querySelectorAll('.requirement-check').forEach(cb => {
        cb.checked = reqs.includes(cb.value);
    });
}

function handlePriceFocus(e) {
    const raw = e.target.getAttribute('data-raw');
    e.target.value = raw || e.target.value.replace(/,/g, '');
}

function handlePriceBlur(e) {
    let val = e.target.value.trim();
    if (val === '') { e.target.value = ''; e.target.setAttribute('data-raw', ''); return; }
    let num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) { e.target.value = ''; return; }
    e.target.setAttribute('data-raw', num.toString());
    e.target.value = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPriceFromInput(input) {
    let val = input.value.trim();
    if (val === '') return 0;
    let num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

function calculateQuote() {
    const procedureText = document.getElementById('procedureSearch').value.trim();
    if (!procedureText) { alert('Seleccione un trámite.'); return null; }
    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    const services = [];
    let subtotal = 0,
        discount = 0;
    document.querySelectorAll('.extra-service-check').forEach((cb, idx) => {
        if (cb.checked) {
            const priceInput = document.getElementById(`price_${idx}`);
            const price = getPriceFromInput(priceInput);
            if (cb.value === 'Descuento') {
                discount = Math.abs(price);
            } else {
                services.push({ name: cb.value, price });
                subtotal += price;
            }
        }
    });
    const total = subtotal - discount;
    const reqs = Array.from(document.querySelectorAll('.requirement-check:checked')).map(cb => cb.value);
    return {
        procedure: procedureText,
        people: people,
        services: services,
        subtotal: subtotal,
        discount: discount,
        total: total,
        requirements: reqs,
        observations: document.getElementById('observations').value.trim(),
        executive: currentUser,
        status: 'pendiente'
    };
}

function showSummary() {
    const clientName = document.getElementById('clientName').value.trim();
    if (!clientName) { alert('Nombre del cliente obligatorio.'); return; }

    if (lastQuoteData) {
        if (!confirm(`Se actualizará la cotización ${lastQuoteData.quoteNumber}, ¿continuar?`)) {
            return;
        }
    }

    const data = calculateQuote();
    if (!data) return;

    pendingGenerate = data;

    const summaryDiv = document.getElementById('summaryContent');
    let html = `
                <p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
                <p><strong>Trámite:</strong> ${escapeHtml(data.procedure)}</p>
                <p><strong>Cantidad de personas:</strong> ${data.people}</p>
                <p><strong>Servicios adicionales:</strong></p>
                <ul style="margin-left:1.5rem;">
            `;
    if (data.services.length === 0) {
        html += '<li>Ninguno seleccionado</li>';
    } else {
        data.services.forEach(s => {
            html += `<li>${escapeHtml(s.name)}: $${s.price.toFixed(2)}</li>`;
        });
        if (data.discount > 0) {
            html += `<li>🔻 Descuento: $${data.discount.toFixed(2)}</li>`;
        }
    }
    html += `</ul><p><strong>Total a pagar:</strong> $${data.total.toFixed(2)} USD</p>`;
    if (data.requirements.length > 0) {
        html += `<p><strong>Requisitos:</strong> ${data.requirements.join(', ')}</p>`;
    }
    summaryDiv.innerHTML = html;
    document.getElementById('summaryModal').classList.add('active');
}

function confirmGenerate() {
    if (!pendingGenerate) return;
    const data = pendingGenerate;
    const clientName = document.getElementById('clientName').value.trim();
    const idDoc = document.getElementById('clientId').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();

    const sanitizedData = sanitizeObject(data);

    if (lastQuoteData) {
        const quotes = getQuotes();
        const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
        if (idx !== -1) {
            const oldDate = quotes[idx].date;
            const oldLogs = quotes[idx].logs || [];
            const newQuote = {
                ...sanitizedData,
                client: clientName,
                idDoc: idDoc,
                email: email,
                phone: phone,
                quoteNumber: lastQuoteData.quoteNumber,
                date: oldDate,
                executive: currentUser,
                logs: [...oldLogs, { action: 'regenerated', by: currentUser, date: new Date().toISOString() }]
            };
            quotes[idx] = newQuote;
            saveQuotes(quotes);
            lastQuoteData = newQuote;
            displayQuote(newQuote);
            document.getElementById('summaryModal').classList.remove('active');
            pendingGenerate = null;
            return;
        }
    }

    const counter = incrementCounter();
    const year = new Date().getFullYear();
    const quoteNumber = `COT-${year}-${String(counter).padStart(4, '0')}`;

    const quoteData = {
        ...sanitizedData,
        client: clientName,
        idDoc: idDoc,
        email: email,
        phone: phone,
        quoteNumber: quoteNumber,
        date: new Date().toISOString(),
        executive: currentUser,
        logs: [{ action: 'generated', by: currentUser, date: new Date().toISOString() }],
        reminderSent: false
    };

    const quotes = getQuotes();
    quotes.push(quoteData);
    saveQuotes(quotes);

    lastQuoteData = quoteData;
    displayQuote(quoteData);
    document.getElementById('summaryModal').classList.remove('active');
    pendingGenerate = null;
}

function cancelGenerate() {
    document.getElementById('summaryModal').classList.remove('active');
    pendingGenerate = null;
}

function displayQuote(data) {
    document.getElementById('bannerTitle').textContent = `Presupuesto de ${data.procedure}`;
    document.getElementById('quoteNumber').textContent = `📄 ${data.quoteNumber}`;

    document.getElementById('clientInfoDisplay').innerHTML = `
                <strong>Cliente:</strong> ${escapeHtml(data.client) || 'No especificado'}<br>
                <strong>Cédula/Pasaporte:</strong> ${escapeHtml(data.idDoc) || '-'}<br>
                <strong>Correo:</strong> ${escapeHtml(data.email) || '-'}<br>
                <strong>Teléfono:</strong> ${escapeHtml(data.phone) || '-'}
            `;
    document.getElementById('executiveInfo').innerHTML = `<strong>Ejecutivo:</strong> ${data.executive}`;
    document.getElementById('requirementsInfo').innerHTML =
        data.requirements.length ? `<strong>Requisitos:</strong> ${data.requirements.join(', ')}` : '';

    const obsDiv = document.getElementById('observationsInfo');
    obsDiv.style.display = data.observations ? 'block' : 'none';
    obsDiv.innerHTML = data.observations ? `<strong>📝 Observaciones:</strong><br>${escapeHtml(data.observations)}` : '';

    const tbody = document.getElementById('breakdownBody');
    tbody.innerHTML = '';

    if (data.services.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="4" style="text-align:center; color:#888;">No hay servicios adicionales seleccionados</td></tr>`;
    } else {
        data.services.forEach(s => {
            tbody.innerHTML +=
                `<tr><td>${escapeHtml(s.name)}</td><td>1</td><td>$${s.price.toFixed(2)}</td><td>$${s.price.toFixed(2)}</td></tr>`;
        });
        if (data.discount > 0) {
            tbody.innerHTML +=
                `<tr><td>🔻 Descuento</td><td>1</td><td>$${data.discount.toFixed(2)}</td><td>$${data.discount.toFixed(2)}</td></tr>`;
        }
    }

    tbody.innerHTML +=
        `<tr class="total-row"><td colspan="3"><strong>TOTAL</strong></td><td><strong>$${data.total.toFixed(2)}</strong></td></tr>`;
    document.getElementById('finalTotal').textContent = `Total a pagar: $${data.total.toFixed(2)} USD`;

    document.getElementById('formSection').style.display = 'none';
    document.getElementById('quoteResult').classList.add('active');
}

function resetForm() {
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('quoteResult').classList.remove('active');
    document.querySelectorAll('.extra-service-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.requirement-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.service-price-input').forEach(inp => { inp.value = '';
        inp.setAttribute('data-raw', ''); });
    document.getElementById('clientName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('procedureSearch').value = '';
    document.getElementById('observations').value = '';
    lastQuoteData = null;
    pendingGenerate = null;
}

// ================================================================
//  GENERACIÓN DE PDF (CON MÉTODOS DE PAGO INCLUIDOS)
// ================================================================

function buildPdfFile() {
    return new Promise((resolve, reject) => {
        if (!lastQuoteData) {
            reject('No hay cotización');
            return;
        }
        showLoader('Generando PDF…');
        const element = document.getElementById('printableQuote');
        const clientName = lastQuoteData.client || 'SQP';
        const sanitized = clientName.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s]/g, '').trim().replace(/\s+/g, '_');
        const filename = `Presupuesto_${sanitized}.pdf`;

        const logoImg = document.getElementById('pdfLogoImg');

        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                allowTaint: false,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight
            },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        getPdfLogoDataUri().then((dataUri) => {
            if (logoImg.src === dataUri && logoImg.complete && logoImg.naturalWidth > 0) {
                return Promise.resolve();
            }
            return new Promise((res) => {
                logoImg.addEventListener('load', res, { once: true });
                logoImg.addEventListener('error', res, { once: true });
                logoImg.src = dataUri;
            });
        }).then(() => {
            return (logoImg.decode ? logoImg.decode().catch(() => {}) : Promise.resolve());
        }).then(() => {
            // Asegurarse de que el apartado de pagos esté visible en el PDF (ya está en el HTML)
            return html2pdf().set(opt).from(element).outputPdf('blob');
        }).then((blob) => {
            hideLoader();
            const file = new File([blob], filename, { type: 'application/pdf' });
            resolve(file);
        }).catch(err => {
            hideLoader();
            alert('❌ Error al generar el PDF: ' + err.message);
            reject(err);
        });
    });
}

function addLogToQuote(quoteNumber, action) {
    const quotes = getQuotes();
    const idx = quotes.findIndex(q => q.quoteNumber === quoteNumber);
    if (idx !== -1) {
        if (!quotes[idx].logs) quotes[idx].logs = [];
        quotes[idx].logs.push({ action, by: currentUser, date: new Date().toISOString() });
        saveQuotes(quotes);
    }
}

function downloadPdfFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function generateAndDownloadPDF(showAlert = true) {
    if (!lastQuoteData) {
        alert('Primero genere un presupuesto.');
        return Promise.reject('No hay cotización');
    }
    return buildPdfFile().then((file) => {
        downloadPdfFile(file);
        addLogToQuote(lastQuoteData.quoteNumber, 'downloaded_pdf');
        if (showAlert) {
            alert('✅ Presupuesto guardado y descargado exitosamente.');
        }
    });
}

// ================================================================
//  ENVÍO POR WHATSAPP WEB
// ================================================================

function sendWhatsApp() {
    if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
    const phone = (lastQuoteData.phone || '').replace(/[^0-9+]/g, '');
    let cleanPhone = phone.replace(/^\+/, '').replace(/\s/g, '');
    if (!cleanPhone) {
        alert('El cliente no tiene un número de teléfono válido.');
        return;
    }
    if (!phone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
    }

    const client = lastQuoteData.client || 'Cliente';
    const total = lastQuoteData.total.toFixed(2);
    const procedure = lastQuoteData.procedure;
    const signature = getSignature();
    const msg =
        `Hola ${client}, te comparto el presupuesto para "${procedure}" con un total de $${total} USD.\n\n${signature}`;

    const markSent = confirm('¿Marcar esta cotización como ENVIADA en el historial?');

    buildPdfFile().then((file) => {
        if (markSent) {
            const quotes = getQuotes();
            const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
            if (idx !== -1) {
                quotes[idx].status = 'enviada';
                if (!quotes[idx].logs) quotes[idx].logs = [];
                quotes[idx].logs.push({ action: 'sent_whatsapp', by: currentUser, date: new Date().toISOString() });
                saveQuotes(quotes);
                lastQuoteData.status = 'enviada';
            }
        }

        downloadPdfFile(file);
        const url =
            `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg + ' Te adjunto el PDF a continuación.')}`;
        window.open(url, '_blank');
        alert('📎 El PDF se descargó. Abre WhatsApp Web y adjunta el archivo desde tus descargas en el chat que se abrió.');
    }).catch(() => {});
}

function sendFollowUpReminder(quoteNumber) {
    const quotes = getQuotes();
    const q = quotes.find(q => q.quoteNumber === quoteNumber);
    if (!q) { alert('Cotización no encontrada.'); return; }

    const originalLast = lastQuoteData;
    // Sobrescribimos temporalmente para usar las funciones de envío
    window.lastQuoteData = q;

    const client = q.client || 'Cliente';
    const total = q.total.toFixed(2);
    const procedure = q.procedure;
    const signature = getSignature();
    const msg =
        `Hola ${client}, te recordamos el presupuesto para "${procedure}" con un total de $${total} USD. ¿Te gustaría avanzar con el trámite?\n\n${signature}`;

    const idx = quotes.findIndex(q => q.quoteNumber === quoteNumber);
    if (idx !== -1) {
        quotes[idx].reminderSent = true;
        if (!quotes[idx].logs) quotes[idx].logs = [];
        quotes[idx].logs.push({ action: 'reminder_sent', by: currentUser, date: new Date().toISOString() });
        saveQuotes(quotes);
    }

    const phone = (q.phone || '').replace(/[^0-9+]/g, '');
    let cleanPhone = phone.replace(/^\+/, '').replace(/\s/g, '');
    if (!cleanPhone) {
        alert('El cliente no tiene número de teléfono.');
        window.lastQuoteData = originalLast;
        return;
    }
    if (!phone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
    }

    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    alert('📨 Recordatorio enviado por WhatsApp Web.');

    window.lastQuoteData = originalLast;
}

// ================================================================
//  SEGUIMIENTO (MODAL)
// ================================================================

function openFollowUp() {
    const quotes = getQuotes();
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - 7);

    const pendingOld = quotes.filter(q => {
        const date = new Date(q.date);
        return q.status === 'pendiente' && date < threshold && !q.reminderSent;
    });

    const tbody = document.getElementById('followUpBody');
    tbody.innerHTML = '';
    if (pendingOld.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">✅ No hay cotizaciones pendientes antiguas.</td></tr>';
    } else {
        pendingOld.forEach(q => {
            const days = Math.floor((now - new Date(q.date)) / (1000 * 60 * 60 * 24));
            const tr = document.createElement('tr');
            tr.innerHTML = `
                        <td>${q.quoteNumber}</td>
                        <td>${escapeHtml(q.client)}</td>
                        <td>${escapeHtml(q.procedure)}</td>
                        <td>${days} días</td>
                        <td><button class="btn-sm follow-up-send" data-quote="${q.quoteNumber}" style="background:#25D366;color:white;border:none;border-radius:6px;padding:0.3rem 0.8rem;">📨 Enviar recordatorio (WhatsApp Web)</button></td>
                    `;
            tbody.appendChild(tr);
        });
        document.querySelectorAll('.follow-up-send').forEach(btn => {
            btn.addEventListener('click', function() {
                const qNumber = this.dataset.quote;
                sendFollowUpReminder(qNumber);
                openFollowUp(); // refrescar
            });
        });
    }
    document.getElementById('followUpModal').classList.add('active');
}

function closeFollowUp() {
    document.getElementById('followUpModal').classList.remove('active');
}

// ================================================================
//  VISTA PREVIA DEL PDF
// ================================================================

function openPreview() {
    if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
    showLoader('Generando vista previa…');
    buildPdfFile().then((file) => {
        hideLoader();
        const url = URL.createObjectURL(file);
        const iframe = document.getElementById('previewIframe');
        iframe.src = url;
        document.getElementById('previewModal').classList.add('active');
        const closeHandler = function() {
            if (iframe.src) URL.revokeObjectURL(iframe.src);
            iframe.src = 'about:blank';
            document.getElementById('closePreviewBtn').removeEventListener('click', closeHandler);
        };
        document.getElementById('closePreviewBtn').addEventListener('click', closeHandler);
    }).catch(() => {
        hideLoader();
    });
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

function downloadFromPreview() {
    generateAndDownloadPDF(true)
        .then(() => closePreview())
        .catch(() => {});
}

// ================================================================
//  BUZÓN DE SUGERENCIAS
// ================================================================

function renderSuggestions() {
    const suggestions = getSuggestions();
    const list = document.getElementById('suggestionList');
    list.innerHTML = '';
    if (suggestions.length === 0) {
        list.innerHTML = '<p>No hay sugerencias aún.</p>';
        return;
    }
    suggestions.slice().reverse().forEach(s => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
                    <div><strong>${escapeHtml(s.name || 'Anónimo')}</strong> ${s.email ? '&lt;' + escapeHtml(s.email) + '&gt;' : ''}</div>
                    <div>${escapeHtml(s.message)}</div>
                    <div class="meta">${new Date(s.timestamp).toLocaleString()}</div>
                `;
        list.appendChild(div);
    });
}

function checkProgrammerAccess() {
    const area = document.getElementById('programmerArea');
    if (currentUser === 'Lic. Daryl Villa') {
        area.style.display = 'block';
        renderSuggestions();
    } else {
        area.style.display = 'none';
    }
}

// ================================================================
//  CONFIGURACIÓN (MODO OSCURO, AYUDA)
// ================================================================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sqp_darkMode', isDark ? 'true' : 'false');
    document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
}

function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
    if (currentUser === 'Lic. Daryl Villa') {
        renderSuggestions();
    }
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

// ================================================================
//  MOSTRAR APLICACIÓN PRINCIPAL
// ================================================================

function showApp() {
    if (!currentUser) {
        console.error('❌ No hay usuario actual.');
        return;
    }
    const mainApp = document.getElementById('mainApp');
    mainApp.style.display = 'block';
    mainApp.style.transform = 'scale(1)';
    mainApp.style.opacity = '1';
    document.getElementById('currentUserDisplay').textContent =
        `${currentUser} (${currentRole === 'admin' ? 'Administrador' : 'Ejecutivo'})`;
    const isAdmin = (currentRole === 'admin');
    document.getElementById('adminDashboardBtn').style.display = isAdmin ? 'inline-flex' : 'none';
    document.getElementById('adminHistoryBtn').style.display = isAdmin ? 'inline-flex' : 'none';
    document.getElementById('adminUsersBtn').style.display = isAdmin ? 'inline-flex' : 'none';
    updateProfilePic();
    resetForm();
    if (localStorage.getItem('sqp_darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    }
    getPdfLogoDataUri().then((dataUri) => {
        document.getElementById('faviconLink').href = dataUri;
        document.getElementById('pdfLogoImg').src = dataUri;
    }).catch(() => {
        document.getElementById('faviconLink').href =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="12" fill="%23166490"/%3E%3Ctext x="32" y="42" font-family="Arial, sans-serif" font-weight="900" font-size="32" text-anchor="middle" fill="%23D4B85C" letter-spacing="2"%3ESQP%3C/text%3E%3C/svg%3E';
    });
    checkProgrammerAccess();

    // Cargar procedimientos desde data/procedures.json (opcional)
    fetch('data/procedures.json')
        .then(res => res.json())
        .then(data => {
            const datalist = document.getElementById('proceduresList');
            datalist.innerHTML = '';
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                datalist.appendChild(opt);
            });
        })
        .catch(() => console.warn('No se pudo cargar procedures.json, usando lista por defecto.'));
}

// ================================================================
//  EVENTOS PRINCIPALES
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicación iniciada (v5 - todo en un solo archivo)');

    // ---- LOGIN ----
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault();
            handleLogin(); }
    });

    // ---- RECUPERAR CONTRASEÑA ----
    document.getElementById('forgotPasswordLink').addEventListener('click', openPasswordModal);
    document.getElementById('showPasswordBtn').addEventListener('click', showPassword);
    document.getElementById('closePasswordModalBtn').addEventListener('click', closePasswordModal);

    // ---- LOGOUT ----
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // ---- PERFIL ----
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('closeProfileBtn').addEventListener('click', closeProfileModal);
    document.getElementById('updateProfileBtn').addEventListener('click', updateProfile);
    document.getElementById('profileSignature').addEventListener('input', updateSignaturePreview);

    // ---- ADMIN ----
    document.getElementById('adminDashboardBtn').addEventListener('click', openDashboard);
    document.getElementById('closeDashboardBtn').addEventListener('click', closeDashboard);
    document.getElementById('adminHistoryBtn').addEventListener('click', openHistoryModal);
    document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);
    document.getElementById('adminUsersBtn').addEventListener('click', openUsersModal);
    document.getElementById('closeUsersBtn').addEventListener('click', closeUsersModal);
    document.getElementById('addUserBtn').addEventListener('click', addUser);
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    // ---- PLANTILLAS ----
    document.getElementById('templatesBtn').addEventListener('click', openTemplatesModal);
    document.getElementById('closeTemplatesBtn').addEventListener('click', closeTemplatesModal);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveCurrentTemplate);

    // ---- MODO OSCURO ----
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // ---- SEGUIMIENTO ----
    document.getElementById('followUpBtn').addEventListener('click', openFollowUp);
    document.getElementById('closeFollowUpBtn').addEventListener('click', closeFollowUp);

    // ---- AYUDA ----
    document.getElementById('helpBtn').addEventListener('click', openHelpModal);
    document.getElementById('closeHelpBtn').addEventListener('click', closeHelpModal);

    // ---- CERRAR MODALES CON CLICK FUERA ----
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    // ---- VERIFICAR SESIÓN ----
    const session = getSession();
    if (session) {
        currentUser = session.user;
        currentRole = session.role;
        document.getElementById('loginScreen').style.display = 'none';
        showApp();
    } else {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    // ---- CONSTRUIR LISTAS ----
    buildServicesList();
    buildRequirementsList();

    // ---- VALIDAR TELÉFONO ----
    document.getElementById('clientPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+]/g, '');
    });

    // ---- AUTO-SELECCIONAR REQUISITOS ----
    document.getElementById('procedureSearch').addEventListener('change', function() {
        autoSelectRequirements(this.value);
    });
    document.getElementById('procedureSearch').addEventListener('input', function() {
        const options = document.getElementById('proceduresList').options;
        for (let opt of options) {
            if (opt.value === this.value) {
                autoSelectRequirements(this.value);
                break;
            }
        }
    });

    // ---- GENERAR COTIZACIÓN (con resumen) ----
    document.getElementById('generateQuote').addEventListener('click', showSummary);
    document.getElementById('confirmGenerateBtn').addEventListener('click', confirmGenerate);
    document.getElementById('cancelGenerateBtn').addEventListener('click', cancelGenerate);

    // ---- EDITAR Y NUEVO ----
    document.getElementById('editQuote').addEventListener('click', function() {
        if (lastQuoteData) {
            if (!confirm(
                    `¿Editar la cotización ${lastQuoteData.quoteNumber}? Los cambios se aplicarán al regenerar.`)) {
                return;
            }
        }
        document.getElementById('formSection').style.display = 'block';
        document.getElementById('quoteResult').classList.remove('active');
    });
    document.getElementById('newQuote').addEventListener('click', resetForm);

    // ---- ACCIONES DEL RESULTADO ----
    document.getElementById('whatsappBtn').addEventListener('click', sendWhatsApp);
    document.getElementById('previewPdfBtn').addEventListener('click', openPreview);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('downloadPdfFromPreview').addEventListener('click', downloadFromPreview);

    // ---- BUZÓN DE SUGERENCIAS ----
    document.getElementById('suggestionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const message = document.getElementById('suggestionMessage').value.trim();
        if (!message) {
            alert('Por favor escribe un mensaje.');
            return;
        }
        const name = document.getElementById('suggestionName').value.trim() || 'Anónimo';
        const email = document.getElementById('suggestionEmail').value.trim() || '';
        const suggestions = getSuggestions();
        suggestions.push({
            name: name,
            email: email,
            message: message,
            timestamp: Date.now()
        });
        saveSuggestions(suggestions);
        document.getElementById('suggestionMessage').value = '';
        document.getElementById('suggestionName').value = '';
        document.getElementById('suggestionEmail').value = '';
        document.getElementById('suggestionStatus').textContent = '✅ Sugerencia enviada, ¡gracias!';
        setTimeout(() => {
            document.getElementById('suggestionStatus').textContent = '';
        }, 3000);
        if (currentUser === 'Lic. Daryl Villa') {
            renderSuggestions();
        }
    });

    document.getElementById('exportSuggestionsBtn')?.addEventListener('click', function() {
        const suggestions = getSuggestions();
        if (suggestions.length === 0) {
            alert('No hay sugerencias para exportar.');
            return;
        }
        const blob = new Blob([JSON.stringify(suggestions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sugerencias_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('clearSuggestionsBtn')?.addEventListener('click', function() {
        if (confirm('¿Borrar todas las sugerencias?')) {
            saveSuggestions([]);
            renderSuggestions();
        }
    });

    console.log('✅ Aplicación lista.');
});