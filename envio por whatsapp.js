import { lastQuoteData } from './quotes.js';
import { buildPdfFile, downloadPdfFile, addLogToQuote } from './pdf.js';
import { getSignature } from './profile.js';
import { getQuotes, saveQuotes } from './utils.js';
import { currentUser } from './auth.js';

export function sendWhatsApp() {
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
    const msg = `Hola ${client}, te comparto el presupuesto para "${procedure}" con un total de $${total} USD.\n\n${signature}`;

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
        const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg + ' Te adjunto el PDF a continuación.')}`;
        window.open(url, '_blank');
        alert('📎 El PDF se descargó. Abre WhatsApp Web y adjunta el archivo desde tus descargas en el chat que se abrió.');
    }).catch(() => {});
}

// ---- SEGUIMIENTO (recordatorios por WhatsApp Web) ----
export function sendFollowUpReminder(quoteNumber) {
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
    const msg = `Hola ${client}, te recordamos el presupuesto para "${procedure}" con un total de $${total} USD. ¿Te gustaría avanzar con el trámite?\n\n${signature}`;

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