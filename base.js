// ============================================================
//  SQP LEGAL CONSULTING - Cotizador Jurídico
// ============================================================

// ===== CLAVES LOCALSTORAGE =====
const USERS_KEY = 'sqp_users_v4';
const QUOTES_KEY = 'sqp_quotes';
const COUNTER_KEY = 'sqp_counter';
const TEMPLATES_KEY = 'sqp_templates';

// ===== FUNCIONES PERSISTENCIA =====
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

// ===== INICIALIZAR USUARIOS =====
(function initUsers() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const defaults = {
            "Lic. Susana Sabalza": { password: null, role: "admin", photo: "", signature: "" },
            "Lic. Eligmary Carrillo": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Santiago Sañudo": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Daryl Villa": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Nayibe Sabalza": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Linda Simmonds": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Antony Talla": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Oscaris Ugas": { password: null, role: "executive", photo: "", signature: "" },
            "Lic. Linoska Ugas": { password: null, role: "executive", photo: "", signature: "" }
        };
        saveUsers(defaults);
    }
})();

// ===== LOGO REAL DE SQP PARA EL PDF =====
let cachedPdfLogoDataUri = null;

function generatePdfLogoFallback() {
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

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentRole = null;
let lastQuoteData = null;

// ============================================================
//  LOGIN
// ============================================================
function handleLogin() {
    const username = document.getElementById('loginUserSelect').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    if (!username) { errorDiv.textContent = 'Seleccione un usuario.'; return; }
    if (!password) { errorDiv.textContent = 'Ingrese una contraseña.'; return; }
    const users = getUsers();
    const user = users[username];
    if (!user) { errorDiv.textContent = 'Usuario no válido.'; return; }
    if (user.password === null || user.password === undefined) {
        user.password = password;
        saveUsers(users);
    } else if (user.password !== password) {
        errorDiv.textContent = 'Contraseña incorrecta.';
        return;
    }
    currentUser = username;
    currentRole = user.role;
    sessionStorage.setItem('sqp_currentUser', username);
    sessionStorage.setItem('sqp_currentRole', currentRole);
    document.getElementById('loginScreen').style.transform = 'scale(0)';
    document.getElementById('loginScreen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loginScreen').style.display = 'none';
        showApp();
    }, 300);
    errorDiv.textContent = '';
}

function handleLogout() {
    currentUser = null;
    currentRole = null;
    sessionStorage.removeItem('sqp_currentUser');
    sessionStorage.removeItem('sqp_currentRole');
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

function showApp() {
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
}

// ============================================================
//  PERFIL (con firma personalizada)
// ============================================================
function openProfileModal() {
    const users = getUsers();
    const user = users[currentUser];
    document.getElementById('profileSignature').value = user.signature || '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }

function updateProfile() {
    const newPass = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;
    const errorDiv = document.getElementById('profileError');
    if (newPass && newPass !== confirm) { errorDiv.textContent = 'Las contraseñas no coinciden.'; return; }
    const users = getUsers();
    const signature = document.getElementById('profileSignature').value.trim();
    if (signature) {
        users[currentUser].signature = signature;
    } else {
        delete users[currentUser].signature;
    }
    const file = document.getElementById('profilePicInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            users[currentUser].photo = e.target.result;
            if (newPass) users[currentUser].password = newPass;
            saveUsers(users);
            updateProfilePic();
            closeProfileModal();
            alert('Perfil actualizado.');
        };
        reader.readAsDataURL(file);
    } else {
        if (newPass) users[currentUser].password = newPass;
        saveUsers(users);
        closeProfileModal();
        alert('Perfil actualizado.');
    }
    errorDiv.textContent = '';
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
        const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2235%22 r=%2225%22 fill=%22%23ccc%22/%3E%3Cpath d=%22M25 80 Q50 95 75 80%22 fill=%22%23ccc%22/%3E%3C/svg%3E';
        pic.src = defaultAvatar;
        pic.style.display = 'none';
        if (preview) preview.src = defaultAvatar;
    }
}

// ============================================================
//  USUARIOS (ADMIN)
// ============================================================
function openUsersModal() { renderUsersList(); document.getElementById('usersModal').classList.add('active'); }

function closeUsersModal() { document.getElementById('usersModal').classList.remove('active'); }

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
        div.style.borderBottom = '1px solid #eee';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = data.role === 'admin';
        checkbox.addEventListener('change', function() { toggleUserRole(name, this.checked); });
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        toggleLabel.appendChild(checkbox);
        const slider = document.createElement('span');
        slider.className = 'slider';
        toggleLabel.appendChild(slider);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', function() { deleteUser(name); });
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
    const users = getUsers();
    if (users[username]) { users[username].role = isAdmin ? 'admin' : 'executive'; saveUsers(users); renderUsersList(); }
}

function deleteUser(username) {
    if (username === currentUser) { alert('No puedes eliminarte a ti mismo.'); return; }
    if (confirm(`¿Eliminar a ${username}?`)) {
        const users = getUsers();
        delete users[username];
        saveUsers(users);
        renderUsersList();
    }
}

function addUser() {
    const name = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newUserRole').value;
    if (!name) { alert('Nombre requerido.'); return; }
    const users = getUsers();
    if (users[name]) { alert('El usuario ya existe.'); return; }
    users[name] = { password: null, role: role, photo: '', signature: '' };
    saveUsers(users);
    renderUsersList();
    document.getElementById('newUsername').value = '';
}

// ============================================================
//  DASHBOARD
// ============================================================
function openDashboard() { document.getElementById('dashboardModal').classList.add('active'); renderDashboard(); }

function closeDashboard() { document.getElementById('dashboardModal').classList.remove('active'); }

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

// ============================================================
//  HISTORIAL CON FILTROS
// ============================================================
let historyQuotes = [];

function openHistoryModal() {
    historyQuotes = getQuotes();
    document.getElementById('historyModal').classList.add('active');
    renderHistory(historyQuotes);
}

function closeHistoryModal() { document.getElementById('historyModal').classList.remove('active'); }

function renderHistory(quotes) {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay cotizaciones</td></tr>';
        return;
    }
    quotes.slice().reverse().forEach(q => {
        const statusClass = {
            'pendiente': 'status-pendiente',
            'aprobada': 'status-aprobada',
            'rechazada': 'status-rechazada',
            'convertida': 'status-convertida',
            'enviada': 'status-enviada'
        }[q.status] || 'status-pendiente';
        const statusLabel = {
            'pendiente': 'Pendiente',
            'aprobada': 'Aprobada',
            'rechazada': 'Rechazada',
            'convertida': 'Convertida',
            'enviada': 'Enviada'
        }[q.status] || 'Pendiente';
        tbody.innerHTML += `<tr>
                    <td>${q.quoteNumber || 'N/A'}</td>
                    <td>${new Date(q.date).toLocaleString()}</td>
                    <td>${q.executive}</td>
                    <td>${q.client}</td>
                    <td>${q.procedure}</td>
                    <td>$${q.total.toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>`;
    });
}

function applyFilters() {
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

// ============================================================
//  RECUPERAR CONTRASEÑA
// ============================================================
function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordDisplay').textContent = 'Selecciona un usuario y haz clic en "Mostrar contraseña".';
}

function closePasswordModal() { document.getElementById('passwordModal').classList.remove('active'); }

function showPassword() {
    const username = document.getElementById('loginUserSelect').value;
    if (!username) { document.getElementById('passwordDisplay').textContent = '⚠️ Primero selecciona un usuario.'; return; }
    const users = getUsers();
    const user = users[username];
    if (!user) { document.getElementById('passwordDisplay').textContent = '⚠️ Usuario no encontrado.'; return; }
    const pass = user.password;
    if (pass === null || pass === undefined || pass === '') {
        document.getElementById('passwordDisplay').textContent =
            `🔒 El usuario "${username}" aún no ha establecido una contraseña.`;
    } else {
        document.getElementById('passwordDisplay').innerHTML =
            `🔑 Contraseña para <strong>${username}</strong>: <span class="password-value">${pass}</span>`;
    }
}

// ============================================================
//  PLANTILLAS
// ============================================================
function openTemplatesModal() {
    document.getElementById('templatesModal').classList.add('active');
    renderTemplates();
}

function closeTemplatesModal() { document.getElementById('templatesModal').classList.remove('active'); }

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
                    <span><strong>${t.name}</strong> (${t.services.length} servicios)</span>
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

// ============================================================
//  SERVICIOS Y REQUISITOS
// ============================================================
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

// ============================================================
//  MANEJO DE PRECIOS
// ============================================================
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

// ============================================================
//  CÁLCULO Y GENERACIÓN DE COTIZACIÓN
// ============================================================
function calculateQuote() {
    const procedureText = document.getElementById('procedureSearch').value.trim();
    if (!procedureText) { alert('Seleccione un trámite.'); return null; }
    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    const services = [];
    let subtotal = 0, discount = 0;
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

function displayQuote(data) {
    const counter = incrementCounter();
    const year = new Date().getFullYear();
    const quoteNumber = `COT-${year}-${String(counter).padStart(4, '0')}`;

    lastQuoteData = {
        ...data,
        client: document.getElementById('clientName').value.trim(),
        idDoc: document.getElementById('clientId').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        quoteNumber: quoteNumber,
        date: new Date().toISOString()
    };

    document.getElementById('bannerTitle').textContent = `Presupuesto de ${data.procedure}`;
    document.getElementById('quoteNumber').textContent = `📄 ${quoteNumber}`;

    document.getElementById('clientInfoDisplay').innerHTML = `
                <strong>Cliente:</strong> ${lastQuoteData.client || 'No especificado'}<br>
                <strong>Cédula/Pasaporte:</strong> ${lastQuoteData.idDoc || '-'}<br>
                <strong>Correo:</strong> ${lastQuoteData.email || '-'}<br>
                <strong>Teléfono:</strong> ${lastQuoteData.phone || '-'}
            `;
    document.getElementById('executiveInfo').innerHTML = `<strong>Ejecutivo:</strong> ${data.executive}`;
    document.getElementById('requirementsInfo').innerHTML =
        data.requirements.length ? `<strong>Requisitos:</strong> ${data.requirements.join(', ')}` : '';

    const obsDiv = document.getElementById('observationsInfo');
    obsDiv.style.display = data.observations ? 'block' : 'none';
    obsDiv.innerHTML = data.observations ? `<strong>📝 Observaciones:</strong><br>${data.observations}` : '';

    const tbody = document.getElementById('breakdownBody');
    tbody.innerHTML = '';
    
    // SOLO se muestran los servicios adicionales seleccionados, NO el trámite principal
    if (data.services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No hay servicios adicionales seleccionados</td></tr>`;
    } else {
        data.services.forEach(s => {
            tbody.innerHTML +=
                `<tr><td>${s.name}</td><td>1</td><td>$${s.price.toFixed(2)}</td><td>$${s.price.toFixed(2)}</td></tr>`;
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
    document.querySelectorAll('.service-price-input').forEach(inp => { inp.value = ''; inp.setAttribute('data-raw', ''); });
    document.getElementById('clientName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('procedureSearch').value = '';
    document.getElementById('observations').value = '';
    lastQuoteData = null;
}

// ============================================================
//  CONSTRUIR EL PDF COMO ARCHIVO
// ============================================================
function buildPdfFile() {
    return new Promise((resolve, reject) => {
        if (!lastQuoteData) {
            reject('No hay cotización');
            return;
        }
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
            return html2pdf().set(opt).from(element).outputPdf('blob');
        })
        .then((blob) => {
            const file = new File([blob], filename, { type: 'application/pdf' });
            resolve(file);
        })
        .catch(err => {
            alert('❌ Error al generar el PDF: ' + err.message);
            reject(err);
        });
    });
}

// ===== Registrar la cotización en el historial =====
function recordQuoteInHistory() {
    const quotes = getQuotes();
    const exists = quotes.some(q => q.quoteNumber === lastQuoteData.quoteNumber);
    if (!exists) {
        quotes.push({ ...lastQuoteData, date: new Date().toISOString() });
        saveQuotes(quotes);
    } else {
        const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
        if (idx !== -1) {
            quotes[idx].status = lastQuoteData.status || 'pendiente';
            saveQuotes(quotes);
        }
    }
}

// ===== Forzar la descarga de un archivo PDF =====
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

// ============================================================
//  GENERAR Y DESCARGAR PDF
// ============================================================
function generateAndDownloadPDF(showAlert = true) {
    if (!lastQuoteData) {
        alert('Primero genere un presupuesto.');
        return Promise.reject('No hay cotización');
    }
    return buildPdfFile().then((file) => {
        downloadPdfFile(file);
        recordQuoteInHistory();
        if (showAlert) {
            alert('✅ Presupuesto guardado y descargado exitosamente.');
        }
    });
}

// ============================================================
//  ENVÍO WHATSAPP / EMAIL
// ============================================================
function getSignature() {
    const users = getUsers();
    const user = users[currentUser];
    return user.signature || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
}

function sendWhatsApp() {
    if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
    const phone = (lastQuoteData.phone || '').replace(/[^0-9+]/g, '');
    const client = lastQuoteData.client || 'Cliente';
    const total = lastQuoteData.total.toFixed(2);
    const procedure = lastQuoteData.procedure;
    const signature = getSignature();
    const msg = `Hola ${client}, te comparto el presupuesto para "${procedure}" con un total de $${total} USD.\n\n${signature}`;

    buildPdfFile().then((file) => {
        recordQuoteInHistory();

        if (confirm('¿Marcar esta cotización como ENVIADA en el historial?')) {
            const quotes = getQuotes();
            const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
            if (idx !== -1) {
                quotes[idx].status = 'enviada';
                saveQuotes(quotes);
            }
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: 'Presupuesto SQP Legal Consulting',
                text: msg
            }).catch(() => {});
        } else {
            downloadPdfFile(file);
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg + ' Te adjunto el PDF a continuación.')}`;
            window.open(url, '_blank');
            alert('📎 El PDF se descargó. Este navegador no permite adjuntarlo automáticamente a WhatsApp: adjúntalo desde tus descargas en el chat que se abrió.');
        }
    }).catch(() => {});
}

function sendEmail() {
    if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
    const email = lastQuoteData.email || '';
    const client = lastQuoteData.client || 'Cliente';
    const total = lastQuoteData.total.toFixed(2);
    const procedure = lastQuoteData.procedure;
    const signature = getSignature();
    const subject = `Presupuesto para ${procedure}`;
    const body = `Hola ${client},\n\nAdjunto encontrarás el presupuesto para "${procedure}" con un total de $${total} USD.\n\n${signature}`;

    buildPdfFile().then((file) => {
        recordQuoteInHistory();

        if (confirm('¿Marcar esta cotización como ENVIADA en el historial?')) {
            const quotes = getQuotes();
            const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
            if (idx !== -1) {
                quotes[idx].status = 'enviada';
                saveQuotes(quotes);
            }
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: subject,
                text: body
            }).catch(() => {});
        } else {
            downloadPdfFile(file);
            window.location.href =
                `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            alert('📎 El PDF se descargó. Este navegador no permite adjuntarlo automáticamente al correo: adjúntalo desde tus descargas en el mensaje que se abrió.');
        }
    }).catch(() => {});
}

// ============================================================
//  VISTA PREVIA PDF
// ============================================================
function openPreview() {
    if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
    const content = document.getElementById('printableQuote').cloneNode(true);
    const logoImg = content.querySelector('#pdfLogoImg');
    if (logoImg) {
        logoImg.src = document.getElementById('pdfLogoImg').src;
    }
    const previewContainer = document.getElementById('previewContent');
    previewContainer.innerHTML = '';
    previewContainer.appendChild(content);
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() { document.getElementById('previewModal').classList.remove('active'); }

function downloadFromPreview() {
    generateAndDownloadPDF(true)
        .then(() => closePreview())
        .catch(() => {});
}

// ============================================================
//  SEGUIMIENTO DE COTIZACIONES PENDIENTES ANTIGUAS
// ============================================================
const FOLLOW_UP_DAYS = 7;

function openFollowUp() {
    const quotes = getQuotes();
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - FOLLOW_UP_DAYS);

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
                        <td>${q.client}</td>
                        <td>${q.procedure}</td>
                        <td>${days} días</td>
                        <td><button class="btn-sm" data-quote="${q.quoteNumber}">📨 Marcar recordatorio enviado</button></td>
                    `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('button[data-quote]').forEach(btn => {
            btn.addEventListener('click', function() {
                const qNumber = this.dataset.quote;
                const quotes = getQuotes();
                const idx = quotes.findIndex(q => q.quoteNumber === qNumber);
                if (idx !== -1) {
                    quotes[idx].reminderSent = true;
                    saveQuotes(quotes);
                    openFollowUp();
                }
            });
        });
    }
    document.getElementById('followUpModal').classList.add('active');
}

function closeFollowUp() { document.getElementById('followUpModal').classList.remove('active'); }

// ============================================================
//  MODO OSCURO
// ============================================================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sqp_darkMode', isDark ? 'true' : 'false');
    document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
}

// ============================================================
//  AYUDA
// ============================================================
function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

// ============================================================
//  EVENTOS PRINCIPALES
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // === LIMPIEZA DE DATOS GENERADOS (SOLO UNA VEZ) ===
    if (!localStorage.getItem('sqp_cleaned')) {
        localStorage.removeItem(QUOTES_KEY);
        localStorage.removeItem(TEMPLATES_KEY);
        localStorage.removeItem(COUNTER_KEY);
        localStorage.setItem('sqp_cleaned', 'true');
        console.log('🧹 Datos de cotizaciones, plantillas y contador eliminados.');
    }

    console.log('🚀 Aplicación iniciada');

    // Logo PDF
    getPdfLogoDataUri().then((dataUri) => {
        document.getElementById('pdfLogoImg').src = dataUri;
    });

    // LOGIN
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
    });

    // RECUPERAR CONTRASEÑA
    document.getElementById('forgotPasswordLink').addEventListener('click', openPasswordModal);
    document.getElementById('showPasswordBtn').addEventListener('click', showPassword);
    document.getElementById('closePasswordModalBtn').addEventListener('click', closePasswordModal);

    // LOGOUT
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // PERFIL
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('closeProfileBtn').addEventListener('click', closeProfileModal);
    document.getElementById('updateProfileBtn').addEventListener('click', updateProfile);

    // ADMIN
    document.getElementById('adminDashboardBtn').addEventListener('click', openDashboard);
    document.getElementById('closeDashboardBtn').addEventListener('click', closeDashboard);
    document.getElementById('adminHistoryBtn').addEventListener('click', openHistoryModal);
    document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);
    document.getElementById('adminUsersBtn').addEventListener('click', openUsersModal);
    document.getElementById('closeUsersBtn').addEventListener('click', closeUsersModal);
    document.getElementById('addUserBtn').addEventListener('click', addUser);
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // PLANTILLAS
    document.getElementById('templatesBtn').addEventListener('click', openTemplatesModal);
    document.getElementById('closeTemplatesBtn').addEventListener('click', closeTemplatesModal);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveCurrentTemplate);

    // MODO OSCURO
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // SEGUIMIENTO
    document.getElementById('followUpBtn').addEventListener('click', openFollowUp);
    document.getElementById('closeFollowUpBtn').addEventListener('click', closeFollowUp);

    // AYUDA
    document.getElementById('helpBtn').addEventListener('click', openHelpModal);
    document.getElementById('closeHelpBtn').addEventListener('click', closeHelpModal);

    // CERRAR MODALES CON CLICK FUERA
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    // VERIFICAR SESIÓN
    const savedUser = sessionStorage.getItem('sqp_currentUser');
    const savedRole = sessionStorage.getItem('sqp_currentRole');
    if (savedUser && savedRole) {
        currentUser = savedUser;
        currentRole = savedRole;
        document.getElementById('loginScreen').style.display = 'none';
        showApp();
    } else {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    // CONSTRUIR LISTAS
    buildServicesList();
    buildRequirementsList();

    // VALIDAR TELÉFONO
    document.getElementById('clientPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+]/g, '');
    });

    // GENERAR COTIZACIÓN (con confirmación al reemplazar)
    document.getElementById('generateQuote').addEventListener('click', function() {
        const clientName = document.getElementById('clientName').value.trim();
        if (!clientName) { alert('Nombre del cliente obligatorio.'); return; }

        if (lastQuoteData) {
            if (!confirm(`Se actualizará la cotización ${lastQuoteData.quoteNumber}, ¿continuar?`)) {
                return;
            }
        }

        const data = calculateQuote();
        if (data) {
            if (lastQuoteData) {
                const quotes = getQuotes();
                const idx = quotes.findIndex(q => q.quoteNumber === lastQuoteData.quoteNumber);
                if (idx !== -1) {
                    const oldDate = quotes[idx].date;
                    quotes[idx] = { ...data, ...lastQuoteData, date: oldDate };
                    saveQuotes(quotes);
                }
            }
            displayQuote(data);
        }
    });

    // EDITAR Y NUEVO
    document.getElementById('editQuote').addEventListener('click', function() {
        if (lastQuoteData) {
            if (!confirm(`¿Editar la cotización ${lastQuoteData.quoteNumber}? Los cambios se aplicarán al regenerar.`)) {
                return;
            }
        }
        document.getElementById('formSection').style.display = 'block';
        document.getElementById('quoteResult').classList.remove('active');
    });
    document.getElementById('newQuote').addEventListener('click', resetForm);

    // ACCIONES DEL RESULTADO
    document.getElementById('whatsappBtn').addEventListener('click', sendWhatsApp);
    document.getElementById('emailBtn').addEventListener('click', sendEmail);
    document.getElementById('previewPdfBtn').addEventListener('click', openPreview);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('downloadPdfFromPreview').addEventListener('click', downloadFromPreview);
});

console.log('✅ Aplicación cargada correctamente');