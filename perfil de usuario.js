import { getUsers, saveUsers, hashPassword, escapeHtml } from './utils.js';
import { currentUser } from './auth.js';

// ---- ABRIR/CERRAR MODAL ----
export function openProfileModal() {
    const users = getUsers();
    const user = users[currentUser];
    document.getElementById('profileSignature').value = user.signature || '';
    updateSignaturePreview();
    document.getElementById('profileModal').classList.add('active');
}

export function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function updateSignaturePreview() {
    const sig = document.getElementById('profileSignature').value || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
    document.getElementById('signaturePreview').textContent = sig;
}

// ---- OPTIMIZAR IMAGEN ----
function optimizeProfileImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 200, 200);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ---- ACTUALIZAR PERFIL ----
export async function updateProfile() {
    const newPass = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;
    const errorDiv = document.getElementById('profileError');
    if (newPass && newPass !== confirm) {
        errorDiv.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    try {
        const users = getUsers();
        const signature = document.getElementById('profileSignature').value.trim();
        if (signature) {
            users[currentUser].signature = signature;
        } else {
            delete users[currentUser].signature;
        }

        const file = document.getElementById('profilePicInput').files[0];
        if (file) {
            const optimized = await optimizeProfileImage(file);
            users[currentUser].photo = optimized;
        }

        if (newPass) {
            const { hash, salt } = await hashPassword(newPass);
            users[currentUser].password = hash;
            users[currentUser].salt = salt;
        }

        saveUsers(users);
        updateProfilePic();
        closeProfileModal();
        alert('Perfil actualizado.');
        errorDiv.textContent = '';
    } catch (err) {
        errorDiv.textContent = 'Error al procesar la imagen: ' + err.message;
    }
}

// ---- ACTUALIZAR FOTO DE PERFIL ----
export function updateProfilePic() {
    const users = getUsers();
    const photo = users[currentUser]?.photo || '';
    const pic = document.getElementById('profilePicDisplay');
    const preview = document.getElementById('profilePicPreview');
    if (photo) {
        pic.src = photo;
        pic.style.display = 'inline-block';
        if (preview) preview.src = photo;
    } else {
        const defaultAvatar =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="35" r="25" fill="%23ccc"/%3E%3Cpath d="M25 80 Q50 95 75 80" fill="%23ccc"/%3E%3C/svg%3E';
        pic.src = defaultAvatar;
        pic.style.display = 'none';
        if (preview) preview.src = defaultAvatar;
    }
}

// ---- OBTENER FIRMA ----
export function getSignature() {
    const users = getUsers();
    const user = users[currentUser];
    return user.signature || 'Saludos cordiales,\nSQP LEGAL CONSULTING.';
}