// ============================================================
//  SOP LEGAL CONSULTING - Cotizador Jurídico
//  Versión final con PDF mejorado
// ============================================================

// ===== CLAVES DE LOCALSTORAGE =====
const USERS_KEY = 'sqp_users_v4';
const QUOTES_KEY = 'sqp_quotes';

// ===== FUNCIONES DE PERSISTENCIA =====
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getQuotes() {
    try {
        return JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveQuotes(quotes) {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

// ===== INICIALIZAR USUARIOS POR DEFECTO =====
(function initUsers() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const defaults = {
            "Lic. Susana Sabalza": { password: null, role: "admin", photo: "" },
            "Lic. Eligmary Carrillo": { password: null, role: "executive", photo: "" },
            "Lic. Santiago Sañudo": { password: null, role: "executive", photo: "" },
            "Lic. Daryl Villa": { password: null, role: "executive", photo: "" },
            "Lic. Nayibe Sabalza": { password: null, role: "executive", photo: "" },
            "Lic. Linda Simmonds": { password: null, role: "executive", photo: "" },
            "Lic. Antony Talla": { password: null, role: "executive", photo: "" }
        };
        saveUsers(defaults);
        console.log('✅ Usuarios inicializados');
    }
})();

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentRole = null;
let lastQuoteData = null;

// ============================================================
//  FUNCIONES DE LOGIN
// ============================================================

function handleLogin() {
    const username = document.getElementById('loginUserSelect').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username) {
        errorDiv.textContent = 'Seleccione un usuario.';
        return;
    }
    if (!password) {
        errorDiv.textContent = 'Ingrese una contraseña.';
        return;
    }

    const users = getUsers();
    const user = users[username];

    if (!user) {
        errorDiv.textContent = 'Usuario no válido.';
        return;
    }

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

    const loginScreen = document.getElementById('loginScreen');
    loginScreen.style.transform = 'scale(0)';
    loginScreen.style.opacity = '0';

    setTimeout(() => {
        loginScreen.style.display = 'none';
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

// ===== MOSTRAR APLICACIÓN =====
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
}

// ============================================================
//  PERFIL
// ============================================================

function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function updateProfile() {
    const newPass = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;
    const errorDiv = document.getElementById('profileError');

    if (newPass && newPass !== confirm) {
        errorDiv.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    const users = getUsers();
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
        alert('Contraseña actualizada.');
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
//  ADMINISTRACIÓN DE USUARIOS
// ============================================================

function openUsersModal() {
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
        div.style.borderBottom = '1px solid #eee';

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
    const users = getUsers();
    if (users[username]) {
        users[username].role = isAdmin ? 'admin' : 'executive';
        saveUsers(users);
        renderUsersList();
    }
}

function deleteUser(username) {
    if (username === currentUser) {
        alert('No puedes eliminarte a ti mismo.');
        return;
    }
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

    if (!name) {
        alert('Nombre requerido.');
        return;
    }

    const users = getUsers();
    if (users[name]) {
        alert('El usuario ya existe.');
        return;
    }

    users[name] = { password: null, role: role, photo: '' };
    saveUsers(users);
    renderUsersList();
    document.getElementById('newUsername').value = '';
}

// ============================================================
//  DASHBOARD
// ============================================================

function openDashboard() {
    document.getElementById('dashboardModal').classList.add('active');
    renderDashboard();
}

function closeDashboard() {
    document.getElementById('dashboardModal').classList.remove('active');
}

function renderDashboard() {
    const quotes = getQuotes();
    const counts = {};
    quotes.forEach(q => {
        counts[q.executive] = (counts[q.executive] || 0) + 1;
    });

    const tbody = document.getElementById('dashboardBody');
    tbody.innerHTML = '';

    const users = getUsers();
    Object.keys(users)
        .filter(u => users[u].role === 'executive')
        .forEach(exec => {
            tbody.innerHTML += `<tr><td>${exec}</td><td>${counts[exec] || 0}</td></tr>`;
        });
}

// ============================================================
//  HISTORIAL
// ============================================================

function openHistoryModal() {
    document.getElementById('historyModal').classList.add('active');
    renderHistory();
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

function renderHistory() {
    const quotes = getQuotes();
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay cotizaciones registradas</td></tr>';
        return;
    }

    quotes.forEach(q => {
        tbody.innerHTML += `<tr>
                    <td>${new Date(q.date).toLocaleString()}</td>
                    <td>${q.executive}</td>
                    <td>${q.client}</td>
                    <td>${q.procedure}</td>
                    <td>$${q.total.toFixed(2)}</td>
                </tr>`;
    });
}

// ============================================================
//  SERVICIOS Y REQUISITOS PREDEFINIDOS
// ============================================================

const defaultServices = [
    { name: 'Impuesto Al Estado', price: 0 },
    { name: 'Honorarios', price: 0 },
    { name: 'Gastos Administrativos', price: 0 },
    { name: 'Notificación', price: 0 },
    { name: 'Tribunal', price: 0 },
    { name: 'Honorarios + Membresia', price: 0 },
    { name: 'Multa', price: 0 },
    { name: 'Descuento de honorarios', price: 0 }
];

const requirementsList = [
    'Pasaporte vigente',
    'Fotos tamaño carnet',
    'Certificado de antecedentes penales',
    'Certificado médico',
    'Copia de cédula',
    'Comprobante de solvencia económica',
    'Contrato de trabajo / carta laboral',
    'Declaración jurada'
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
//  MANEJO DE PRECIOS (formato y almacenamiento)
// ============================================================

function handlePriceFocus(e) {
    const raw = e.target.getAttribute('data-raw');
    e.target.value = raw || e.target.value.replace(/,/g, '');
}

function handlePriceBlur(e) {
    let val = e.target.value.trim();
    if (val === '') {
        e.target.value = '';
        e.target.setAttribute('data-raw', '');
        return;
    }
    let num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) {
        e.target.value = '';
        return;
    }
    e.target.setAttribute('data-raw', num.toString());
    e.target.value = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getPriceFromInput(input) {
    let val = input.value.trim();
    if (val === '') return 0;
    let num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// ============================================================
//  CÁLCULO Y GENERACIÓN DE COTIZACIÓN (MEJORADO)
// ============================================================

function calculateQuote() {
    const procedureText = document.getElementById('procedureSearch').value.trim();
    if (!procedureText) {
        alert('Seleccione un trámite.');
        return null;
    }

    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    const services = [];
    let subtotal = 0;
    let discount = 0;

    document.querySelectorAll('.extra-service-check').forEach((cb, idx) => {
        if (cb.checked) {
            const priceInput = document.getElementById(`price_${idx}`);
            const price = getPriceFromInput(priceInput);
            if (cb.value === 'Descuento de honorarios') {
                discount = Math.abs(price);
            } else {
                services.push({ name: cb.value, price });
                subtotal += price;
            }
        }
    });

    const total = subtotal - discount;
    const reqs = Array.from(document.querySelectorAll('.requirement-check:checked'))
        .map(cb => cb.value);

    return {
        procedure: procedureText,
        people: people,
        services: services,
        subtotal: subtotal,
        discount: discount,
        total: total,
        requirements: reqs,
        observations: document.getElementById('observations').value.trim(),
        executive: currentUser
    };
}

function displayQuote(data) {
    lastQuoteData = {
        ...data,
        client: document.getElementById('clientName').value.trim(),
        idDoc: document.getElementById('clientId').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim()
    };

    document.getElementById('bannerTitle').textContent = `Presupuesto de ${data.procedure}`;

    // Información del cliente
    document.getElementById('clientInfoDisplay').innerHTML = `
                <strong>Cliente:</strong> ${lastQuoteData.client || 'No especificado'}<br>
                <strong>Cédula/Pasaporte:</strong> ${lastQuoteData.idDoc || '-'}<br>
                <strong>Correo:</strong> ${lastQuoteData.email || '-'}<br>
                <strong>Teléfono:</strong> ${lastQuoteData.phone || '-'}
            `;

    document.getElementById('executiveInfo').innerHTML =
        `<strong>Ejecutivo:</strong> ${data.executive}`;

    document.getElementById('requirementsInfo').innerHTML =
        data.requirements.length ? `<strong>Requisitos:</strong> ${data.requirements.join(', ')}` : '';

    const obsDiv = document.getElementById('observationsInfo');
    obsDiv.style.display = data.observations ? 'block' : 'none';
    obsDiv.innerHTML = data.observations ? `<strong>📝 Observaciones:</strong><br>${data.observations}` : '';

    // Construir tabla
    const tbody = document.getElementById('breakdownBody');
    tbody.innerHTML = '';

    // Fila del trámite principal
    tbody.innerHTML += `<tr>
                <td>${data.procedure}</td>
                <td>${data.people} persona(s)</td>
                <td>$0.00</td>
                <td>$0.00</td>
            </tr>`;

    // Servicios adicionales
    data.services.forEach(s => {
        const priceFormatted = s.price.toFixed(2);
        const subtotalFormatted = s.price.toFixed(2);
        tbody.innerHTML += `<tr>
                    <td>${s.name}</td>
                    <td>1</td>
                    <td>$${priceFormatted}</td>
                    <td>$${subtotalFormatted}</td>
                </tr>`;
    });

    // Descuento
    if (data.discount > 0) {
        tbody.innerHTML += `<tr>
                    <td>🔻 Descuento</td>
                    <td>1</td>
                    <td>$${data.discount.toFixed(2)}</td>
                    <td>$${data.discount.toFixed(2)}</td>
                </tr>`;
    }

    // Fila de TOTAL (con estilo)
    const totalFormatted = data.total.toFixed(2);
    tbody.innerHTML += `<tr class="total-row">
                <td colspan="3"><strong>TOTAL</strong></td>
                <td><strong>$${totalFormatted}</strong></td>
            </tr>`;

    // Mostrar total fuera de la tabla (más visible)
    document.getElementById('finalTotal').textContent = `Total a pagar: $${totalFormatted} USD`;

    // Ocultar formulario y mostrar resultado
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('quoteResult').classList.add('active');
}

function resetForm() {
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('quoteResult').classList.remove('active');

    document.querySelectorAll('.extra-service-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.requirement-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.service-price-input').forEach(inp => {
        inp.value = '';
        inp.setAttribute('data-raw', '');
    });

    document.getElementById('clientName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('procedureSearch').value = '';
    document.getElementById('observations').value = '';
}

// ============================================================
//  GUARDAR PDF (MEJORADO)
// ============================================================

function savePDF() {
    if (!lastQuoteData) {
        alert('Primero genere un presupuesto.');
        return;
    }

    const element = document.getElementById('printableQuote');
    const clientName = lastQuoteData.client || 'SOP';
    const sanitized = clientName.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const filename = `Presupuesto_${sanitized}.pdf`;

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            allowTaint: false
        },
        jsPDF: {
            unit: 'in',
            format: 'letter',
            orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const btn = document.getElementById('savePdfBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Generando PDF...';
    btn.disabled = true;

    html2pdf().set(opt).from(element).save()
        .then(() => {
            const quotes = getQuotes();
            quotes.push({
                date: new Date().toISOString(),
                executive: lastQuoteData.executive,
                client: lastQuoteData.client,
                procedure: lastQuoteData.procedure,
                total: lastQuoteData.total,
                details: lastQuoteData
            });
            saveQuotes(quotes);
            alert('✅ Presupuesto guardado y descargado exitosamente.');
        })
        .catch(err => {
            alert('❌ Error al generar el PDF: ' + err.message);
            console.error('Error PDF:', err);
        })
        .finally(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        });
}

// ============================================================
//  CONFIGURACIÓN DE EVENTOS - TODOS CON addEventListener
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicación iniciada');

    // ---- LOGIN ----
    document.getElementById('loginBtn').addEventListener('click', handleLogin);

    // ---- FUNCIÓN: Presionar Enter en el campo de contraseña ----
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });

    // ---- LOGOUT ----
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // ---- PERFIL ----
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('closeProfileBtn').addEventListener('click', closeProfileModal);
    document.getElementById('updateProfileBtn').addEventListener('click', updateProfile);

    // ---- ADMIN ----
    document.getElementById('adminDashboardBtn').addEventListener('click', openDashboard);
    document.getElementById('closeDashboardBtn').addEventListener('click', closeDashboard);

    document.getElementById('adminHistoryBtn').addEventListener('click', openHistoryModal);
    document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);

    document.getElementById('adminUsersBtn').addEventListener('click', openUsersModal);
    document.getElementById('closeUsersBtn').addEventListener('click', closeUsersModal);
    document.getElementById('addUserBtn').addEventListener('click', addUser);

    // ---- CERRAR MODALES CON CLICK FUERA ----
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    // ---- VERIFICAR SESIÓN ----
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

    // ---- CONSTRUIR LISTAS ----
    buildServicesList();
    buildRequirementsList();

    // ---- VALIDAR TELÉFONO ----
    document.getElementById('clientPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+]/g, '');
    });

    // ---- GENERAR COTIZACIÓN ----
    document.getElementById('generateQuote').addEventListener('click', function() {
        const clientName = document.getElementById('clientName').value.trim();
        if (!clientName) {
            alert('Nombre del cliente obligatorio.');
            return;
        }
        const data = calculateQuote();
        if (data) {
            displayQuote(data);
        }
    });

    // ---- EDITAR Y NUEVO ----
    document.getElementById('editQuote').addEventListener('click', function() {
        document.getElementById('formSection').style.display = 'block';
        document.getElementById('quoteResult').classList.remove('active');
    });

    document.getElementById('newQuote').addEventListener('click', resetForm);

    // ---- GUARDAR PDF ----
    document.getElementById('savePdfBtn').addEventListener('click', savePDF);
});

console.log('✅ Aplicación cargada correctamente');