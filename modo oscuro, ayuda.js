export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sqp_darkMode', isDark ? 'true' : 'false');
    document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
}

export function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
    // Si el programador está logueado, actualizar sugerencias (desde app.js)
    if (window.currentUser === 'Lic. Daryl Villa') {
        window.renderSuggestions?.();
    }
}

export function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}