
// ==================== ГЛОБАЛЬНЫЙ ЛОАДЕР (создаём если нет) ====================
(function ensureGlobalLoader() {
    if (!document.getElementById('globalLoader')) {
        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.7); z-index: 9999;
            align-items: center; justify-content: center;
        `;
        loader.innerHTML = `<div style="
            width: 48px; height: 48px; border: 4px solid #e5e7eb;
            border-top-color: #6366f1; border-radius: 50%;
            animation: spin 0.8s linear infinite;
        "></div>`;
        // Добавляем стиль анимации если нет
        if (!document.getElementById('loaderStyle')) {
            const style = document.createElement('style');
            style.id = 'loaderStyle';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        document.body.appendChild(loader);
    }
})();

// ==================== ЛОАДЕР ====================
function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// ==================== ФОРМАТИРОВАНИЕ ====================
function formatDate(s) {
    if (!s) return 'N/A';
    return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDaysUntil(s) {
    return Math.max(0, Math.ceil((new Date(s) - new Date()) / (1000 * 60 * 60 * 24)));
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(msg, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error:   'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info:    'fa-info-circle'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    const container = document.getElementById('toastContainer');
    if (!container) return;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ==================== СТАТУСЫ ====================
function getStatusLabel(status) {
    const labels = {
        pending:  'Pending',
        reviewed: 'Reviewed',
        interview:'Interview',
        accepted: 'Accepted',
        rejected: 'Rejected'
    };
    return labels[status] || status;
}

function getStatusIcon(status) {
    const icons = {
        pending:  'fa-clock',
        reviewed: 'fa-eye',
        interview:'fa-users',
        accepted: 'fa-check-circle',
        rejected: 'fa-times-circle'
    };
    return icons[status] || 'fa-info-circle';
}

// ==================== UI УТИЛИТЫ ====================
function toggleUserMenu() {
    document.getElementById('userMenu').classList.toggle('open');
}

function toggleMobileMenu() {
    document.getElementById('mainNav').classList.toggle('show');
}

const debouncedSearch = debounce(() => {
    currentPage = 1;
    loadInternships().catch(e => console.error(e));
}, 300);

// ==================== МОДАЛКИ ====================
function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function switchModal(type) {
    closeModal(type === 'login' ? 'register' : 'login');
    openModal(type);
}

// ==================== FIRESTORE ХЕЛПЕРЫ ====================
// ФИКС: Явно используем window.* для Firebase функций
async function fetchAllInternshipsFromFirestore() {
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, 'internships'));
        const internships = [];
        querySnapshot.forEach(doc => {
            internships.push({ id: doc.id, ...doc.data() });
        });
        return internships;
    } catch (error) {
        console.error('Error fetching internships:', error);
        return [];
    }
}

async function fetchInternshipByIdFromFirestore(id) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'internships', id));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching internship:', error);
        return null;
    }
}