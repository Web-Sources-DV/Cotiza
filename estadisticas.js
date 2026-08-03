import { getQuotes, getUsers } from './utils.js';
import { currentRole } from './auth.js';

export function openDashboard() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    document.getElementById('dashboardModal').classList.add('active');
    renderDashboard();
}

export function closeDashboard() {
    document.getElementById('dashboardModal').classList.remove('active');
}

export function renderDashboard() {
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