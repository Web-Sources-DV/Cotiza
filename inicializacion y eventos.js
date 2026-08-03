import {
    getSession, getPdfLogoDataUri, showLoader, hideLoader,
    getUsers, getQuotes, saveQuotes, getSuggestions, saveSuggestions
} from './utils.js';
import {
    currentUser, currentRole, handleLogin, handleLogout,
    openUsersModal, closeUsersModal, addUser,
    openPasswordModal, closePasswordModal, showPassword
} from './auth.js';
import {
    openProfileModal, closeProfileModal, updateProfile, updateProfilePic
} from './profile.js';
import { openDashboard, closeDashboard } from './dashboard.js';
import {
    openHistoryModal, closeHistoryModal, applyFilters, clearFilters, exportCsv
} from './history.js';
import {
    openTemplatesModal, closeTemplatesModal, saveCurrentTemplate
} from './templates.js';
import {
    buildServicesList, buildRequirementsList, autoSelectRequirements,
    showSummary, confirmGenerate, cancelGenerate,
    resetForm, lastQuoteData, displayQuote
} from './quotes.js';
import { generateAndDownloadPDF } from './pdf.js';
import { sendWhatsApp, sendFollowUpReminder } from './whatsapp.js';
import { toggleDarkMode, openHelpModal, closeHelpModal } from './settings.js';

// ---- FUNCIONES ESPECÍFICAS DE SUGERENCIAS (no en otros módulos) ----
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

// ---- MOSTRAR APLICACIÓN ----
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

    // Cargar procedimientos desde data/procedures.json (ejemplo)
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

// ---- EVENTOS ----
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicación iniciada (v5 - modular)');

    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
    });

    // Recuperar contraseña
    document.getElementById('forgotPasswordLink').addEventListener('click', openPasswordModal);
    document.getElementById('showPasswordBtn').addEventListener('click', showPassword);
    document.getElementById('closePasswordModalBtn').addEventListener('click', closePasswordModal);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Perfil
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('closeProfileBtn').addEventListener('click', closeProfileModal);
    document.getElementById('updateProfileBtn').addEventListener('click', updateProfile);
    document.getElementById('profileSignature').addEventListener('input', function() {
        const sig = this.value || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
        document.getElementById('signaturePreview').textContent = sig;
    });

    // Admin
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

    // Plantillas
    document.getElementById('templatesBtn').addEventListener('click', openTemplatesModal);
    document.getElementById('closeTemplatesBtn').addEventListener('click', closeTemplatesModal);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveCurrentTemplate);

    // Modo oscuro
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Seguimiento
    document.getElementById('followUpBtn').addEventListener('click', function() {
        // Mostrar modal de seguimiento (se define aquí por simplicidad)
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
                    // Refrescar
                    document.getElementById('followUpBtn').click();
                });
            });
        }
        document.getElementById('followUpModal').classList.add('active');
    });
    document.getElementById('closeFollowUpBtn').addEventListener('click', function() {
        document.getElementById('followUpModal').classList.remove('active');
    });

    // Ayuda
    document.getElementById('helpBtn').addEventListener('click', openHelpModal);
    document.getElementById('closeHelpBtn').addEventListener('click', closeHelpModal);

    // Cerrar modales con click fuera
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    // Verificar sesión
    const session = getSession();
    if (session) {
        window.currentUser = session.user;
        window.currentRole = session.role;
        // Sincronizar variables globales de auth.js
        import('./auth.js').then(module => {
            module.currentUser = session.user;
            module.currentRole = session.role;
        });
        document.getElementById('loginScreen').style.display = 'none';
        showApp();
    } else {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    // Construir listas de servicios y requisitos
    buildServicesList();
    buildRequirementsList();

    // Validar teléfono
    document.getElementById('clientPhone').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+]/g, '');
    });

    // Auto-seleccionar requisitos al cambiar trámite
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

    // Generar cotización (con resumen)
    document.getElementById('generateQuote').addEventListener('click', showSummary);
    document.getElementById('confirmGenerateBtn').addEventListener('click', confirmGenerate);
    document.getElementById('cancelGenerateBtn').addEventListener('click', cancelGenerate);

    // Editar y nuevo
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

    // Acciones del resultado
    document.getElementById('whatsappBtn').addEventListener('click', sendWhatsApp);
    document.getElementById('previewPdfBtn').addEventListener('click', function() {
        if (!lastQuoteData) { alert('Genere una cotización primero.'); return; }
        showLoader('Generando vista previa…');
        import('./pdf.js').then(module => {
            module.buildPdfFile().then((file) => {
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
            }).catch(() => hideLoader());
        });
    });
    document.getElementById('closePreviewBtn').addEventListener('click', function() {
        document.getElementById('previewModal').classList.remove('active');
    });
    document.getElementById('downloadPdfFromPreview').addEventListener('click', function() {
        generateAndDownloadPDF(true).then(() => {
            document.getElementById('previewModal').classList.remove('active');
        }).catch(() => {});
    });

    // Buzón de sugerencias
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

    // Exponer renderSuggestions globalmente para usarlo en helpModal
    window.renderSuggestions = renderSuggestions;

    console.log('✅ Aplicación lista.');
});

// Escuchar evento de login para mostrar la app
window.addEventListener('userLoggedIn', function(e) {
    window.currentUser = e.detail.user;
    window.currentRole = e.detail.role;
    showApp();
});