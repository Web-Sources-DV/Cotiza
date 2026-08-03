import {
    getQuotes, saveQuotes, getCounter, incrementCounter,
    escapeHtml, sanitizeObject, getPdfLogoDataUri
} from './utils.js';
import { currentUser } from './auth.js';
import { showLoader, hideLoader } from './utils.js';

// ---- DATOS ESTÁTICOS ----
export const defaultServices = [
    { name: 'Impuesto Al Estado', price: 0 },
    { name: 'Honorarios', price: 0 },
    { name: 'Gastos Administrativos', price: 0 },
    { name: 'Notificación', price: 0 },
    { name: 'Tribunal', price: 0 },
    { name: 'Honorarios + Membresia', price: 0 },
    { name: 'Multa', price: 0 },
    { name: 'Descuento', price: 0 }
];

export const requirementsList = [
    'Pasaporte vigente',
    'Fotos tamaño carnet',
    'Copia de cédula',
    'Comprobante de solvencia económica',
    'Recibo de domicilio/contrato de arrendamiento a su nombre'
];

export const procedureRequirements = {
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

// ---- VARIABLES GLOBALES (compartidas) ----
export let lastQuoteData = null;
export let pendingGenerate = null;

// ---- CONSTRUIR LISTAS ----
export function buildServicesList() {
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

export function buildRequirementsList() {
    const grid = document.getElementById('requirementsGrid');
    grid.innerHTML = '';
    requirementsList.forEach(req => {
        const label = document.createElement('label');
        label.className = 'requirement-option';
        label.innerHTML = `<input type="checkbox" class="requirement-check" value="${req}"> ${req}`;
        grid.appendChild(label);
    });
}

export function autoSelectRequirements(procedure) {
    const reqs = procedureRequirements[procedure] || [];
    document.querySelectorAll('.requirement-check').forEach(cb => {
        cb.checked = reqs.includes(cb.value);
    });
}

// ---- MANEJO DE PRECIOS ----
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

export function getPriceFromInput(input) {
    let val = input.value.trim();
    if (val === '') return 0;
    let num = parseFloat(val.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// ---- CÁLCULO ----
export function calculateQuote() {
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

// ---- RESUMEN Y CONFIRMACIÓN ----
export function showSummary() {
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

export function confirmGenerate() {
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

export function cancelGenerate() {
    document.getElementById('summaryModal').classList.remove('active');
    pendingGenerate = null;
}

// ---- MOSTRAR COTIZACIÓN ----
export function displayQuote(data) {
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
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No hay servicios adicionales seleccionados</td></tr>`;
    } else {
        data.services.forEach(s => {
            tbody.innerHTML += `<tr><td>${escapeHtml(s.name)}</td><td>1</td><td>$${s.price.toFixed(2)}</td><td>$${s.price.toFixed(2)}</td></tr>`;
        });
        if (data.discount > 0) {
            tbody.innerHTML += `<tr><td>🔻 Descuento</td><td>1</td><td>$${data.discount.toFixed(2)}</td><td>$${data.discount.toFixed(2)}</td></tr>`;
        }
    }

    tbody.innerHTML += `<tr class="total-row"><td colspan="3"><strong>TOTAL</strong></td><td><strong>$${data.total.toFixed(2)}</strong></td></tr>`;
    document.getElementById('finalTotal').textContent = `Total a pagar: $${data.total.toFixed(2)} USD`;

    document.getElementById('formSection').style.display = 'none';
    document.getElementById('quoteResult').classList.add('active');
}

export function resetForm() {
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
    pendingGenerate = null;
}