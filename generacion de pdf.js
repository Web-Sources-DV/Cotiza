import { lastQuoteData, displayQuote } from './quotes.js';
import { getPdfLogoDataUri, showLoader, hideLoader } from './utils.js';
import { getQuotes, saveQuotes } from './utils.js';
import { currentUser } from './auth.js';

export function buildPdfFile() {
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

export function addLogToQuote(quoteNumber, action) {
    const quotes = getQuotes();
    const idx = quotes.findIndex(q => q.quoteNumber === quoteNumber);
    if (idx !== -1) {
        if (!quotes[idx].logs) quotes[idx].logs = [];
        quotes[idx].logs.push({ action, by: currentUser, date: new Date().toISOString() });
        saveQuotes(quotes);
    }
}

export function downloadPdfFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function generateAndDownloadPDF(showAlert = true) {
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