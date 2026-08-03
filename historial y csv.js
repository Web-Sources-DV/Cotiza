import { getQuotes, saveQuotes, escapeHtml } from './utils.js';
import { currentUser, currentRole } from './auth.js';

let historyQuotes = [];

export function openHistoryModal() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    historyQuotes = getQuotes();
    document.getElementById('historyModal').classList.add('active');
    renderHistory(historyQuotes);
}

export function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

export function renderHistory(quotes) {
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

export function applyFilters() {
    const filtered = applyFiltersSilent();
    renderHistory(filtered);
}

export function clearFilters() {
    document.getElementById('filterClient').value = '';
    document.getElementById('filterExecutive').value = '';
    document.getElementById('filterProcedure').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    renderHistory(getQuotes());
}

export function exportCsv() {
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