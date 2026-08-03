import {
    getUsers, saveUsers, getSession, setSession, clearSession,
    hashPassword, verifyPassword, escapeHtml
} from './utils.js';

// Variables globales (compartidas con otros módulos)
export let currentUser = null;
export let currentRole = null;

// ---- LOGIN ----
export async function handleLogin() {
    console.log('🔐 Intentando login...');
    const username = document.getElementById('loginUserSelect').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username) { errorDiv.textContent = 'Seleccione un usuario.'; return; }
    if (!password) { errorDiv.textContent = 'Ingrese una contraseña.'; return; }

    const users = getUsers();
    const user = users[username];
    if (!user) { errorDiv.textContent = 'Usuario no válido.'; return; }

    try {
        if (user.password === null || user.password === undefined) {
            console.log(`🔑 Creando contraseña para ${username}...`);
            const { hash, salt } = await hashPassword(password);
            user.password = hash;
            user.salt = salt;
            saveUsers(users);
            console.log('✅ Contraseña creada y guardada.');
        } else {
            console.log(`🔍 Verificando contraseña para ${username}...`);
            const match = await verifyPassword(password, user.password, user.salt);
            if (!match) {
                errorDiv.textContent = 'Contraseña incorrecta.';
                console.warn('❌ Contraseña incorrecta.');
                return;
            }
            console.log('✅ Contraseña correcta.');
        }

        currentUser = username;
        currentRole = user.role;
        setSession(username, user.role);

        const loginScreen = document.getElementById('loginScreen');
        loginScreen.style.transform = 'scale(0)';
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            // Llamamos a showApp desde app.js (se importa después)
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: username, role: user.role } }));
        }, 300);
        errorDiv.textContent = '';
        console.log(`👤 Usuario ${username} logueado como ${currentRole}.`);
    } catch (err) {
        console.error('❌ Error en login:', err);
        errorDiv.textContent = 'Error inesperado. Revisa la consola.';
    }
}

// ---- LOGOUT ----
export function handleLogout() {
    currentUser = null;
    currentRole = null;
    clearSession();
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

// ---- USUARIOS (ADMIN) ----
export function openUsersModal() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    renderUsersList();
    document.getElementById('usersModal').classList.add('active');
}

export function closeUsersModal() {
    document.getElementById('usersModal').classList.remove('active');
}

export function renderUsersList() {
    const users = getUsers();
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    for (const [name, data] of Object.entries(users)) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '0.5rem';
        div.style.borderBottom = '1px solid var(--border)';
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

export function toggleUserRole(username, isAdmin) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    const users = getUsers();
    if (users[username]) {
        users[username].role = isAdmin ? 'admin' : 'executive';
        saveUsers(users);
        renderUsersList();
    }
}

export function deleteUser(username) {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    if (username === currentUser) { alert('No puedes eliminarte a ti mismo.'); return; }
    if (confirm(`¿Eliminar a ${username}?`)) {
        const users = getUsers();
        delete users[username];
        saveUsers(users);
        renderUsersList();
    }
}

export function addUser() {
    if (currentRole !== 'admin') { alert('Acceso denegado.'); return; }
    const name = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newUserRole').value;
    if (!name) { alert('Nombre requerido.'); return; }
    const users = getUsers();
    if (users[name]) { alert('El usuario ya existe.'); return; }
    users[name] = { password: null, salt: null, role: role, photo: '', signature: '' };
    saveUsers(users);
    renderUsersList();
    document.getElementById('newUsername').value = '';
}

// ---- RECUPERAR CONTRASEÑA ----
export function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordDisplay').textContent =
        'Selecciona un usuario y haz clic en "Mostrar contraseña".';
}

export function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

export function showPassword() {
    const username = document.getElementById('loginUserSelect').value;
    if (!username) {
        document.getElementById('passwordDisplay').textContent = '⚠️ Primero selecciona un usuario.';
        return;
    }
    const users = getUsers();
    const user = users[username];
    if (!user) {
        document.getElementById('passwordDisplay').textContent = '⚠️ Usuario no encontrado.';
        return;
    }
    document.getElementById('passwordDisplay').innerHTML = `
                🔐 La contraseña está encriptada por seguridad.<br>
                Si la olvidaste, un administrador puede restablecerla desde el panel de usuarios.<br>
                <button id="resetPasswordBtn" style="margin-top:0.5rem;">Restablecer contraseña</button>
            `;
    document.getElementById('resetPasswordBtn')?.addEventListener('click', function() {
        if (confirm(`¿Restablecer la contraseña de ${username}? Se pondrá en blanco para que pueda crear una nueva.`)) {
            const users = getUsers();
            users[username].password = null;
            users[username].salt = null;
            saveUsers(users);
            alert('Contraseña restablecida. El usuario podrá crear una nueva al iniciar sesión.');
            closePasswordModal();
        }
    });
}