import { getTemplates, saveTemplates, escapeHtml } from './utils.js';
import { getPriceFromInput, defaultServices } from './quotes.js';
import { autoSelectRequirements } from './quotes.js';

export function openTemplatesModal() {
    document.getElementById('templatesModal').classList.add('active');
    renderTemplates();
}

export function closeTemplatesModal() {
    document.getElementById('templatesModal').classList.remove('active');
}

export function renderTemplates() {
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

export function saveCurrentTemplate() {
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