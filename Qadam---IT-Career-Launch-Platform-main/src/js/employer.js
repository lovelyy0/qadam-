// ==================== EMPLOYER DASHBOARD ====================
async function loadEmployerDashboard() {
    // ФИКС: был 'employerDashboardContent', но createEmployerSections создаёт 'dashboardContent'
    const container = document.getElementById('dashboardContent') || document.getElementById('employerDashboardContent');
    if (!container) return;

    try {
        // Параллельные запросы для скорости
        const [internshipsSnap, coursesSnap, eventsSnap] = await Promise.all([
            window.getDocs(window.query(window.collection(window.db, 'internships'), window.where('ownerId', '==', currentUser.id))),
            window.getDocs(window.query(window.collection(window.db, 'courses'),     window.where('ownerId', '==', currentUser.id))),
            window.getDocs(window.query(window.collection(window.db, 'events'),      window.where('ownerId', '==', currentUser.id)))
        ]);

        const myList = [];
        internshipsSnap.forEach(doc => myList.push({ id: doc.id, ...doc.data() }));
        const coursesCount = coursesSnap.size;
        const eventsCount  = eventsSnap.size;

        const myIds = myList.map(i => i.id);
        let totalApplicants = 0;
        let recentApps = [];

        // ФИКС: Firestore не принимает 'in' с пустым массивом — кидает ошибку
        // Проверка myIds.length > 0 уже есть, но добавляем ограничение в 10 элементов
        // (Firestore лимит для 'in' — максимум 10 значений)
        if (myIds.length > 0) {
            const batchIds = myIds.slice(0, 10); // Firestore 'in' limit
            const appQ    = window.query(window.collection(window.db, 'applications'), window.where('internshipId', 'in', batchIds));
            const appSnap = await window.getDocs(appQ);
            totalApplicants = appSnap.size;
            appSnap.forEach(doc => recentApps.push({ id: doc.id, ...doc.data() }));
            recentApps.sort((a, b) => new Date(b.date) - new Date(a.date));
            recentApps = recentApps.slice(0, 5);
        }

        // ФИКС: Единственный container.innerHTML (раньше был дубль)
        container.innerHTML = `
            <div class="dashboard-welcome">
                <h3>Welcome, ${escapeHtml(currentUser.companyName || currentUser.name)}! 👋</h3>
                <p>Manage hiring and development for your company</p>
            </div>
            <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem;">
                <div class="stat-card" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:1.5rem;border-radius:16px;">
                    <h3 style="font-size:2rem;">${myList.length}</h3><p>Internships</p>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;padding:1.5rem;border-radius:16px;">
                    <h3 style="font-size:2rem;">${totalApplicants}</h3><p>Applications</p>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#4facfe,#00f2fe);color:#fff;padding:1.5rem;border-radius:16px;">
                    <h3 style="font-size:2rem;">${coursesCount}</h3><p>Courses</p>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#43e97b,#38f9d7);color:#fff;padding:1.5rem;border-radius:16px;">
                    <h3 style="font-size:2rem;">${eventsCount}</h3><p>Events</p>
                </div>
            </div>
            <div class="dashboard-section" style="margin-bottom:2rem;">
                <h4>⚡ Quick actions</h4>
                <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem;">
                    <button class="btn btn-primary btn-small" onclick="openCreateInternshipModal()"><i class="fas fa-plus"></i> Create internship</button>
                    <button class="btn btn-outline btn-small" onclick="openCreateCourseModal()"><i class="fas fa-plus"></i> Create course</button>
                    <button class="btn btn-outline btn-small" onclick="openCreateEventModal()"><i class="fas fa-plus"></i> Create event</button>
                </div>
            </div>
            <h4 style="margin-bottom:1rem;">📋 Recent applications</h4>
            <div id="recentApplications">
                ${recentApps.length === 0
                    ? '<p style="color:var(--muted)">No applications yet</p>'
                    : recentApps.map(a => `
                        <div style="padding:1rem;margin-bottom:.75rem;border:1px solid var(--border);border-radius:12px;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <strong>${escapeHtml(a.studentName || 'Student')}</strong>
                                <span style="color:var(--muted);margin-left:.5rem;">— ${escapeHtml(a.internshipTitle || '')}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:.75rem;">
                                <span class="status-badge ${a.status}">${getStatusLabel(a.status)}</span>
                                <span style="color:var(--muted);font-size:.8rem;">${formatDate(a.date)}</span>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;
    } catch (err) {
        console.error('Error loading employer dashboard:', err);
        container.innerHTML = '<p style="color:var(--danger);">Error loading dashboard</p>';
    }
}

// ==================== СТАЖИРОВКИ ====================
async function loadEmployerInternships() {
    // ✅ Ищем ОБА контейнера
    const employerContainer = document.getElementById('employerInternshipsContent');
    const companyContainer = document.getElementById('companyInternshipsList');
    
    // ✅ Если нет ни одного контейнера — выходим
    if (!employerContainer && !companyContainer) return;
    
    try {
        const q = window.query(
            window.collection(window.db, 'internships'), 
            window.where('ownerId', '==', currentUser.id)
        );
        const snapshot = await window.getDocs(q);
        const myList = [];
        snapshot.forEach(doc => myList.push({ id: doc.id, ...doc.data() }));

        const html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
                <h3>My Internships (${myList.length})</h3>
                <button class="btn btn-primary" onclick="openCreateInternshipModal()">
                    <i class="fas fa-plus"></i> Create
                </button>
            </div>
            ${myList.length === 0
                ? '<div class="empty-state"><i class="fas fa-briefcase"></i><p>No internships yet</p></div>'
                : `<div class="internships-grid">
                    ${myList.map(i => `
                        <div class="internship-card">
                            <div class="internship-header">
                                <h3>${escapeHtml(i.title)}</h3>
                                <p>${escapeHtml(i.company)}</p>
                            </div>
                            <div class="internship-body">
                                <p>${escapeHtml(i.location)} | ${escapeHtml(i.salary)}</p>
                                <p>Deadline: ${escapeHtml(i.deadline)}</p>
                                <div class="detail-actions" style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                                    <button class="btn btn-outline btn-small" onclick="viewApplicants('${i.id}')">
                                        <i class="fas fa-users"></i> Applications
                                    </button>
                                    <button class="btn btn-ghost btn-small" onclick="editInternship('${i.id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-danger btn-small" onclick="deleteInternship('${i.id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`
            }
        `;
        
        // ✅ Загружаем в ОБА контейнера
        if (employerContainer) {
            employerContainer.innerHTML = html;
            console.log('✅ Loaded into employerInternshipsContent');
        }
        if (companyContainer) {
            companyContainer.innerHTML = html;
            console.log('✅ Loaded into companyInternshipsList');
        }
        
    } catch (err) {
        console.error('Error loading employer internships:', err);
        const errorHtml = '<p style="color:var(--danger);">Error loading internships</p>';
        if (employerContainer) employerContainer.innerHTML = errorHtml;
        if (companyContainer) companyContainer.innerHTML = errorHtml;
    }
}

// ==================== СОЗДАНИЕ СТАЖИРОВКИ ====================

function openCreateInternshipModal() {
    // ФИКС 1: Проверяем, нет ли уже открытой модалки, и закрываем её
    const existingModal = document.getElementById('createInternshipModal');
    if (existingModal) {
        if (typeof closeAndDestroyModal === 'function') {
            closeAndDestroyModal(existingModal);
        } else {
            existingModal.remove();
            document.body.style.overflow = '';
        }
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // ФИКС 2: Используем createModal если доступна
    if (typeof createModal === 'function') {
        createModal(`
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="closeAndDestroyModal(document.getElementById('createInternshipModal'))">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-header">
                    <h2>Create Internship</h2>
                </div>
                <form id="createInternshipForm" onsubmit="handleCreateInternship(event)">
                    <div class="form-group">
                        <label>Quick template (optional)</label>
                        <select id="templateSelect" class="form-control" onchange="fillFromTemplate(this.value)">
                            <option value="">— Choose template —</option>
                            <option value="frontend">Frontend Developer (React)</option>
                            <option value="backend">Python Backend Developer</option>
                            <option value="qa">QA Engineer</option>
                            <option value="design">UI/UX Designer</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Title *</label><input type="text" id="newInternshipTitle" class="form-control" required></div>
                    <div class="form-group"><label>Location *</label><input type="text" id="newInternshipLocation" class="form-control" required></div>
                    <div class="form-group"><label>Salary min (₸) *</label><input type="number" id="newInternshipSalaryMin" class="form-control" placeholder="150000" min="0" required></div>
                    <div class="form-group"><label>Salary max (₸) *</label><input type="number" id="newInternshipSalaryMax" class="form-control" placeholder="200000" min="0" required></div>
                    <div class="form-group"><label>Description *</label><textarea id="newInternshipDesc" class="form-control" rows="4" required></textarea></div>
                    <div class="form-group"><label>Requirements (comma separated) *</label><input type="text" id="newInternshipReqs" class="form-control" placeholder="React, TypeScript, Git" required></div>
                    <div class="form-group"><label>Deadline *</label><input type="date" id="newInternshipDeadline" class="form-control" min="${today}" required></div>
                    <div class="form-group"><label>Duration</label>
                        <select id="newInternshipDuration" class="form-control">
                            <option value="3-6">3-6 months</option><option value="6+">6+ months</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Direction</label>
                        <select id="newInternshipType" class="form-control">
                            <option>Frontend</option><option>Backend</option><option>Mobile</option>
                            <option>QA</option><option>Data Science</option><option>DevOps</option><option>UX/UI</option>
                        </select>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-plus"></i> Create
                        </button>
                        <button type="button" class="btn btn-outline btn-block" 
                                onclick="closeAndDestroyModal(document.getElementById('createInternshipModal'))">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `, 'createInternshipModal');
    } else {
        // ФИКС 3: Fallback если utils.js не загружен
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = 'createInternshipModal';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="closeCreateInternshipModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-header"><h2>Create Internship</h2></div>
                <form id="createInternshipForm" onsubmit="handleCreateInternship(event)">
                    <div class="form-group">
                        <label>Quick template (optional)</label>
                        <select id="templateSelect" class="form-control" onchange="fillFromTemplate(this.value)">
                            <option value="">— Choose template —</option>
                            <option value="frontend">Frontend Developer (React)</option>
                            <option value="backend">Python Backend Developer</option>
                            <option value="qa">QA Engineer</option>
                            <option value="design">UI/UX Designer</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Title *</label><input type="text" id="newInternshipTitle" class="form-control" required></div>
                    <div class="form-group"><label>Location *</label><input type="text" id="newInternshipLocation" class="form-control" required></div>
                    <div class="form-group"><label>Salary min (₸) *</label><input type="number" id="newInternshipSalaryMin" class="form-control" placeholder="150000" min="0" required></div>
                    <div class="form-group"><label>Salary max (₸) *</label><input type="number" id="newInternshipSalaryMax" class="form-control" placeholder="200000" min="0" required></div>
                    <div class="form-group"><label>Description *</label><textarea id="newInternshipDesc" class="form-control" rows="4" required></textarea></div>
                    <div class="form-group"><label>Requirements (comma separated) *</label><input type="text" id="newInternshipReqs" class="form-control" placeholder="React, TypeScript, Git" required></div>
                    <div class="form-group"><label>Deadline *</label><input type="date" id="newInternshipDeadline" class="form-control" min="${today}" required></div>
                    <div class="form-group"><label>Duration</label>
                        <select id="newInternshipDuration" class="form-control">
                            <option value="3-6">3-6 months</option><option value="6+">6+ months</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Direction</label>
                        <select id="newInternshipType" class="form-control">
                            <option>Frontend</option><option>Backend</option><option>Mobile</option>
                            <option>QA</option><option>Data Science</option><option>DevOps</option><option>UX/UI</option>
                        </select>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-plus"></i> Create
                        </button>
                        <button type="button" class="btn btn-outline btn-block" 
                                onclick="closeCreateInternshipModal()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Правильный обработчик закрытия
        const handleClose = (e) => {
            if (e.target === modal) closeCreateInternshipModal();
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') closeCreateInternshipModal();
        };
        
        modal.addEventListener('click', handleClose);
        document.addEventListener('keydown', handleEscape);
        
        // Сохраняем для очистки
        modal._handlers = { handleClose, handleEscape };
    }
}

// ФИКС: Функция закрытия модалки
// Для каждой модалки сохранять обработчики и удалять их:
function closeCreateInternshipModal() {
    const modal = document.getElementById('createInternshipModal');
    if (!modal) return;
    
    // Удаляем все обработчики событий
    const clone = modal.cloneNode(true);
    modal.parentNode.replaceChild(clone, modal);
    
    document.body.style.overflow = '';
    setTimeout(() => clone.remove(), 300);
}

async function handleCreateInternship(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
        await createInternship();
        // ✅ Закрываем модалку только после успешного создания
        closeCreateInternshipModal();
    } catch (err) {
        // ❌ Если ошибка валидации - НЕ закрываем модалку
        console.log('Create internship failed:', err.message);
        // Модалка остаётся открытой чтобы пользователь исправил ошибки
    } finally {
        // ✅ Всегда восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function fillFromTemplate(templateId) {
    const templates = {
        frontend: { title:'Frontend Developer (React)', location:'Almaty', salaryMin: 200000, salaryMax: 300000, desc:'We are looking for a frontend intern to work on real projects with React, TypeScript, and modern tools.', reqs:'React, TypeScript, HTML/CSS, Git', duration:'3-6', type:'Frontend' },
        backend:  { title:'Python Backend Developer', location:'Astana', salaryMin: 220000, salaryMax: 280000, desc:'Internship for Python developers. Work with Django, REST APIs, and databases.', reqs:'Python, Django, PostgreSQL, REST API', duration:'6+', type:'Backend' },
        qa:       { title:'QA Engineer', location:'Remote', salaryMin: 150000, salaryMax: 200000, desc:'Looking for a detail-oriented QA intern. Learn manual and automated testing.', reqs:'Manual Testing, SQL, Jira, Postman', duration:'3-6', type:'QA' },
        design:   { title:'UI/UX Designer', location:'Almaty', salaryMin: 180000, salaryMax: 250000, desc:'Design internship. Work on real products with experienced designers.', reqs:'Figma, Adobe XD, Prototyping, User Research', duration:'3-6', type:'UX/UI' }
    };
    const t = templates[templateId];
    if (!t) return;
    document.getElementById('newInternshipTitle').value    = t.title;
    document.getElementById('newInternshipLocation').value = t.location;
    document.getElementById('newInternshipSalaryMin').value = t.salaryMin;
    document.getElementById('newInternshipSalaryMax').value = t.salaryMax;
    document.getElementById('newInternshipDesc').value     = t.desc;
    document.getElementById('newInternshipReqs').value     = t.reqs;
    document.getElementById('newInternshipDuration').value = t.duration;
    document.getElementById('newInternshipType').value     = t.type;
}

async function createInternship() {
    const title    = document.getElementById('newInternshipTitle')?.value?.trim();
    const location = document.getElementById('newInternshipLocation')?.value?.trim();
    const salaryMin = parseInt(document.getElementById('newInternshipSalaryMin')?.value) || 0;
    const salaryMax = parseInt(document.getElementById('newInternshipSalaryMax')?.value) || 0;
    const desc     = document.getElementById('newInternshipDesc')?.value?.trim();
    const reqs     = document.getElementById('newInternshipReqs')?.value?.trim();
    const deadline = document.getElementById('newInternshipDeadline')?.value;

    // ---------- Валидация полей ----------
    if (!validateField('newInternshipTitle', v => {
        if (!v || v.trim().length < 5) return 'Title must be at least 5 characters';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) throw new Error('Invalid title');

    if (!validateField('newInternshipLocation', v => {
        if (!v || v.trim().length < 2) return 'Location is required';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) throw new Error('Invalid location');

    if (isNaN(salaryMin) || isNaN(salaryMax) || salaryMin < 0 || salaryMax < 0) {
        showNotification('Salary cannot be negative', 'warning');
        throw new Error('Negative salary');
    }
    if (salaryMin > salaryMax) {
        showNotification('Min salary cannot be greater than max', 'warning');
        throw new Error('Invalid salary range');
    }
    // убрано дублирующее условие

    if (!validateField('newInternshipDesc', v => {
        if (!v || v.trim().length < 20) return 'Description must be at least 20 characters';
        if (v.trim().length > 2000) return 'Description too long (max 2000 chars)';
        return null;
    })) throw new Error('Invalid description');

    const requirements = reqs.split(',').map(s => s.trim()).filter(Boolean);
    if (requirements.length < 2) {
        showNotification('Add at least 2 requirements', 'warning');
        throw new Error('Not enough requirements');
    }
    if (requirements.some(r => r.length < 2)) {
        showNotification('Each requirement must be at least 2 characters', 'warning');
        throw new Error('Invalid requirement');
    }

    if (!validateField('newInternshipDeadline', v => {
        if (!v) return 'Deadline is required';
        const d = new Date(v);
        if (isNaN(d.getTime())) return 'Invalid date';
        const today = new Date();
        today.setHours(0,0,0,0);
        if (d <= today) return 'Deadline must be in the future';
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 6);
        if (d > maxDate) return 'Deadline must be within 6 months';
        return null;
    })) throw new Error('Invalid deadline');

    // Проверка на дубликат
    const duplicateQuery = window.query(
        window.collection(window.db, 'internships'),
        window.where('ownerId', '==', currentUser.id),
        window.where('title', '==', title),
        window.where('company', '==', currentUser.companyName || 'My Company'),
        window.where('location', '==', location)
    );
    const duplicateSnap = await window.getDocs(duplicateQuery);
    if (!duplicateSnap.empty) {
        showNotification('You already have an internship with this title, company, and location', 'warning');
        throw new Error('Duplicate internship');
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const salary = `${salaryMin.toLocaleString()} – ${salaryMax.toLocaleString()} ₸`;

    const newDocRef = window.doc(window.collection(window.db, 'internships'));
    await window.setDoc(newDocRef, {
        id: newDocRef.id,
        title,
        company: currentUser.companyName || 'My Company',
        location,
        salary,
        description: desc,
        requirements: requirements,
        deadline,
        duration: document.getElementById('newInternshipDuration')?.value || '3-6',
        type: document.getElementById('newInternshipType')?.value || 'Frontend',
        ownerId: currentUser.id,
        ownerRole: 'employer',
        posted: today.toISOString().split('T')[0],
        applicantsCount: 0,
        views: 0,
        createdAt: new Date().toISOString()
    });

    await refreshAllEmployerViews();
    showNotification('Internship created! 🎉', 'success');
}

// ✅ Новая функция для обновления всех view работодателя
async function refreshAllEmployerViews() {
    console.log('🔄 Refreshing employer views...');
    
    // 1. Обновляем список "My Internships" на странице companyInternships
    const companyInternshipsList = document.getElementById('companyInternshipsList');
    if (companyInternshipsList && typeof loadCompanyInternships === 'function') {
        console.log('→ Refreshing companyInternshipsList');
        await loadCompanyInternships();
    }
    
    // 2. Обновляем "My Internships" в employerInternshipsContent (в профиле)
    const employerInternshipsContent = document.getElementById('employerInternshipsContent');
    const employerInternshipsTab = document.getElementById('employerInternshipsTab');
    if (employerInternshipsContent && employerInternshipsTab && 
        !employerInternshipsTab.classList.contains('hidden') &&
        typeof loadEmployerInternships === 'function') {
        console.log('→ Refreshing employerInternshipsContent');
        await loadEmployerInternships();
    }
    
    // 3. Обновляем Dashboard работодателя
    const employerDashboardContent = document.getElementById('employerDashboardContent');
    const employerDashboardTab = document.getElementById('employerDashboardTab');
    if (employerDashboardContent && employerDashboardTab && 
        !employerDashboardTab.classList.contains('hidden') &&
        typeof loadEmployerDashboard === 'function') {
        console.log('→ Refreshing employerDashboard');
        await loadEmployerDashboard();
    }
    
    // 4. Обновляем популярные стажировки на главной
    if (typeof renderPopularInternships === 'function') {
        console.log('→ Refreshing popular internships');
        await renderPopularInternships();
    }
    
    // 5. Обновляем статистику
    if (typeof updateStats === 'function') {
        console.log('→ Refreshing stats');
        await updateStats();
    }
    
    // 6. Обновляем главный список стажировок если открыт
    const internshipsSection = document.getElementById('internshipsSection');
    if (internshipsSection && !internshipsSection.classList.contains('hidden') &&
        typeof loadInternships === 'function') {
        console.log('→ Refreshing main internships list');
        await loadInternships();
    }
    
    console.log('✅ All employer views refreshed');
}

// ==================== РЕДАКТИРОВАНИЕ СТАЖИРОВКИ ====================
async function editInternship(id) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'internships', id));
        if (!docSnap.exists()) return;
        const internship = docSnap.data();

        const modal = document.createElement('div');
        modal.className  = 'modal show';
        modal.id         = `editInternshipModal_${id}`;
        modal.innerHTML  = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                <div class="modal-header"><h2>Edit Internship</h2></div>
                <form id="editInternshipForm_${id}">
                    <div class="form-group"><label>Title</label><input type="text" id="editInternshipTitle" class="form-control" value="${escapeHtml(internship.title)}" required></div>
                    <div class="form-group"><label>Location</label><input type="text" id="editInternshipLocation" class="form-control" value="${escapeHtml(internship.location)}" required></div>
                    <div class="form-group"><label>Salary</label><input type="text" id="editInternshipSalary" class="form-control" value="${escapeHtml(internship.salary)}" required></div>
                    <div class="form-group"><label>Description</label><textarea id="editInternshipDesc" class="form-control" rows="4" required>${escapeHtml(internship.description)}</textarea></div>
                    <div class="form-group"><label>Requirements (comma separated)</label><input type="text" id="editInternshipReqs" class="form-control" value="${(internship.requirements || []).join(', ')}" required></div>
                    <div class="form-group"><label>Deadline</label><input type="date" id="editInternshipDeadline" class="form-control" value="${internship.deadline}" required></div>
                    <button type="button" class="btn btn-primary btn-block" onclick="updateInternship('${id}')">Save</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error(err);
        showNotification('Error loading internship', 'error');
    }
}

// ==================== РЕДАКТИРОВАНИЕ СТАЖИРОВКИ (ОБНОВЛЕНИЕ) ====================
async function updateInternship(id) {
    const title    = document.getElementById('editInternshipTitle')?.value?.trim();
    const location = document.getElementById('editInternshipLocation')?.value?.trim();
    const salary   = document.getElementById('editInternshipSalary')?.value?.trim();
    const desc     = document.getElementById('editInternshipDesc')?.value?.trim();
    const reqs     = document.getElementById('editInternshipReqs')?.value?.trim();
    const deadline = document.getElementById('editInternshipDeadline')?.value;

    // Валидация Title
    if (!validateField('editInternshipTitle', v => {
        if (!v || v.trim().length < 5) return 'Title must be at least 5 characters';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) throw new Error('Invalid title');

    // Валидация Location
    if (!validateField('editInternshipLocation', v => {
        if (!v || v.trim().length < 2) return 'Location is required';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) throw new Error('Invalid location');

    // Валидация Salary
    if (!validateField('editInternshipSalary', v => {
        if (!v || v.trim().length < 1) return 'Salary is required';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        // Разрешены только цифры, пробелы, дефис, знак ₸ и точка
        if (!/^[\d\s\-–₸.]+$/.test(v.trim()))
            return 'Salary can only contain numbers, spaces, hyphen and ₸';
        // Обязательно должна быть хотя бы одна цифра
        if (!/\d/.test(v))
            return 'Salary must contain at least one number';
        return null;
    })) throw new Error('Invalid salary');

    // Валидация Description
    if (!validateField('editInternshipDesc', v => {
        if (!v || v.trim().length < 20) return 'Description must be at least 20 characters';
        if (v.trim().length > 2000) return 'Description too long';
        return null;
    })) throw new Error('Invalid description');

    // Requirements
    const requirements = reqs.split(',').map(s => s.trim()).filter(Boolean);
    if (requirements.length < 2) {
        showNotification('Add at least 2 requirements', 'warning');
        throw new Error('Not enough requirements');
    }

    // Deadline
    if (!validateField('editInternshipDeadline', v => {
        if (!v) return 'Deadline is required';
        const d = new Date(v);
        if (isNaN(d.getTime())) return 'Invalid date';
        if (d <= new Date()) return 'Deadline must be in the future';
        return null;
    })) throw new Error('Invalid deadline');

    // Обновление в Firestore
    try {
        await window.updateDoc(window.doc(window.db, 'internships', id), {
            title,
            location,
            salary,
            description: desc,
            requirements: requirements,
            deadline
        });
        const modal = document.getElementById(`editInternshipModal_${id}`);
        if (modal) modal.remove();
        showNotification('Internship updated! ✅', 'success');
        loadEmployerInternships();
    } catch (err) {
        console.error(err);
        showNotification('Error updating internship', 'error');
    }
}

async function deleteInternship(id) {
    if (!confirm('Delete this internship? All associated applications will remain in the database.')) return;
    try {
        await window.deleteDoc(window.doc(window.db, 'internships', id));
        showNotification('Internship deleted', 'info');
        loadEmployerInternships();
    } catch (err) {
        console.error(err);
        showNotification('Error deleting internship', 'error');
    }
}

// ==================== ПРОСМОТР ЗАЯВОК ====================
async function viewApplicants(internshipId) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'internships', internshipId));
        if (!docSnap.exists()) {
            showNotification('Internship not found', 'error');
            return;
        }
        const internship = docSnap.data();

        const q        = window.query(window.collection(window.db, 'applications'), window.where('internshipId', '==', internshipId));
        const snapshot = await window.getDocs(q);
        const apps     = [];
        snapshot.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                <div class="modal-header">
                    <h2>Applications for "${escapeHtml(internship.title)}"</h2>
                    <p>Total: ${apps.length}</p>
                </div>
                <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
                    ${apps.length === 0
                        ? '<p style="text-align:center;padding:2rem;color:var(--muted);">No applications yet</p>'
                        : apps.map(a => `
                            <div style="padding:1rem;margin-bottom:.75rem;border:1px solid var(--border);border-radius:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;">
                                    <div>
                                        <h4 style="margin:0;">${escapeHtml(a.studentName || 'Student')}</h4>
                                        <p style="margin:.25rem 0;color:var(--muted);font-size:.9rem;">${escapeHtml(a.studentEmail || '')}</p>
                                        <p style="margin:0;font-size:.8rem;color:var(--muted);">Applied: ${formatDate(a.date)}</p>
                                        <button class="btn btn-outline btn-small" style="margin-top:.5rem;"
                                            onclick="openChatWithStudent('${a.studentId}','${escapeHtml(a.studentName||'Student')}','${escapeHtml(a.studentEmail||'')}')">
                                            <i class="fas fa-comment"></i> Message
                                        </button>
                                    </div>
                                    <select onchange="updateApplicationStatus('${a.id}',this.value)" class="filter-select">
                                        <option value="pending"  ${a.status==='pending'  ?'selected':''}>Pending</option>
                                        <option value="reviewed" ${a.status==='reviewed' ?'selected':''}>Reviewed</option>
                                        <option value="interview"${a.status==='interview'?'selected':''}>Interview</option>
                                        <option value="accepted" ${a.status==='accepted' ?'selected':''}>Accepted</option>
                                        <option value="rejected" ${a.status==='rejected' ?'selected':''}>Rejected</option>
                                    </select>
                                </div>
                                ${a.coverLetter ? `<p style="margin:.5rem 0 0;font-size:.85rem;color:#374151;background:#f9fafb;padding:.5rem;border-radius:8px;">${escapeHtml(a.coverLetter)}</p>` : ''}
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error('Error viewing applicants:', err);
        showNotification('Error loading applicants', 'error');
    }
}

async function updateApplicationStatus(appId, newStatus) {
    try {
        await window.updateDoc(window.doc(window.db, 'applications', appId), { status: newStatus });
        showNotification(`Status updated to: ${getStatusLabel(newStatus)}`, 'success');
    } catch (err) {
        console.error('Error updating status:', err);
        showNotification('Error updating status', 'error');
    }
}

// ==================== КУРСЫ ====================
async function loadCompanyCourses() {
    const container = document.getElementById('companyCoursesList');
    const employerContainer = document.getElementById('employerCoursesContent'); // для профиля
    if (!container && !employerContainer) return;

    try {
        const q = window.query(window.collection(window.db, 'courses'), window.where('ownerId', '==', currentUser.id));
        const snapshot = await window.getDocs(q);
        const courses = [];
        snapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));

        const html = courses.length === 0
            ? '<div class="empty-state"><i class="fas fa-book-open"></i><p>No courses yet</p></div>'
            : `<div class="courses-grid">
                ${courses.map(c => `
                    <div class="course-card">
                        <div class="course-image"><span class="course-badge ${c.type}">${c.type === 'free' ? 'Free' : 'Paid'}</span></div>
                        <div class="course-content">
                            <h3>${escapeHtml(c.title)}</h3>
                            <p class="course-provider">${escapeHtml(c.provider)}</p>
                            <p>${escapeHtml((c.description||'').substring(0,70))}...</p>
                            <div class="course-meta">
                                <span><i class="fas fa-clock"></i> ${c.duration}</span>
                                <span><i class="fas fa-users"></i> ${c.students||0}</span>
                            </div>
                            <div style="margin-top:1rem;display:flex;gap:.5rem;">
                                <button class="btn btn-ghost btn-small" onclick="editCourse('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteCourse('${c.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        if (container) container.innerHTML = html;
        if (employerContainer) employerContainer.innerHTML = html;   // <-- заполняем профиль
    } catch (err) {
        console.error(err);
        const errorHtml = '<p style="color:var(--danger);">Error loading courses</p>';
        if (container) container.innerHTML = errorHtml;
        if (employerContainer) employerContainer.innerHTML = errorHtml;
    }
}

async function loadEmployerCourses() {
    return loadCompanyCourses();
}

function openCreateCourseModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'createCourseModal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>Create Course</h2></div>
            <form id="createCourseForm">
                <div class="form-group"><label>Title *</label><input type="text" id="newCourseTitle" class="form-control" required></div>
                <div class="form-group"><label>Duration *</label><input type="text" id="newCourseDuration" class="form-control" placeholder="8 weeks" required></div>
                <div class="form-group"><label>Level</label>
                    <select id="newCourseLevel" class="form-control"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
                </div>
                <div class="form-group"><label>Price</label><input type="text" id="newCoursePrice" class="form-control" placeholder="Free or 150,000 ₸"></div>
                <div class="form-group"><label>Type</label>
                    <select id="newCourseType" class="form-control"><option value="free">Free</option><option value="paid">Paid</option></select>
                </div>
                <div class="form-group">
                    <label>Course Image</label>
                    <input type="file" id="newCourseImageFile" accept="image/*" class="form-control">
                    <div id="imagePreview" style="margin-top: 10px; display: none;">
                        <img id="previewImg" style="max-width: 100%; max-height: 120px; border-radius: 8px;">
                    </div>
                </div>
                <div class="form-group"><label>Description *</label><textarea id="newCourseDesc" class="form-control" rows="4" required></textarea></div>
                <button type="button" class="btn btn-primary btn-block" onclick="createCourseWithImage()">Create</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Превью изображения
    const fileInput = document.getElementById('newCourseImageFile');
    const previewDiv = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImg.src = event.target.result;
                previewDiv.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewDiv.style.display = 'none';
        }
    });
}
async function createCourseWithImage() {
    const title = document.getElementById('newCourseTitle')?.value?.trim();
    const duration = document.getElementById('newCourseDuration')?.value?.trim();
    const desc = document.getElementById('newCourseDesc')?.value?.trim();

    if (!title || !duration || !desc) {
        showNotification('Please fill required fields', 'warning');
        return;
    }

    // For now, just create without image
    await createCourse();
}

async function createCourse() {
    const title    = document.getElementById('newCourseTitle')?.value?.trim();
    const duration = document.getElementById('newCourseDuration')?.value?.trim();
    const desc     = document.getElementById('newCourseDesc')?.value?.trim();

    if (!validateField('newCourseTitle', v => {
        if (!v || v.trim().length < 3) return 'Title must be at least 3 characters';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) { throw new Error('Invalid title'); }

    if (!validateField('newCourseDuration', v => {
        if (!v || v.trim().length < 2) return 'Duration is required';
        return null;
    })) { throw new Error('Invalid duration'); }

    if (!validateField('newCourseDesc', v => {
        if (!v || v.trim().length < 10) return 'Description must be at least 10 characters';
        return null;
    })) { throw new Error('Invalid description'); }

    const type = document.getElementById('newCourseType')?.value;
    if (type === 'paid') {
        const price = document.getElementById('newCoursePrice')?.value?.trim();
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            showNotification('Please enter a valid price for paid course', 'warning');
            throw new Error('Invalid price');
        }
    }

    const newDocRef = window.doc(window.collection(window.db, 'courses'));
    await window.setDoc(newDocRef, {
        id: newDocRef.id,
        title,
        provider: currentUser.companyName || 'My Company',
        duration,
        level: document.getElementById('newCourseLevel')?.value || 'Beginner',
        price: document.getElementById('newCoursePrice')?.value || 'Free',
        type: type || 'free',
        description: desc,
        students: 0,
        rating: 0,
        ownerId: currentUser.id,
        createdAt: new Date().toISOString()
    });

    const modal = document.getElementById('createCourseModal');
    if (modal) modal.remove();
    showNotification('Course created! 🎉', 'success');
    loadCompanyCourses();
}


// ФИКС: editCourse теперь загружает из Firestore, не из myCourses[]
async function editCourse(id) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'courses', id));
        if (!docSnap.exists()) { showNotification('Course not found', 'error'); return; }
        const course = docSnap.data();

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = `editCourseModal_${id}`;
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                <div class="modal-header"><h2>Edit Course</h2></div>
                <form id="editCourseForm_${id}">
                    <div class="form-group"><label>Title</label><input type="text" id="editCourseTitle" class="form-control" value="${escapeHtml(course.title)}" required></div>
                    <div class="form-group"><label>Duration</label><input type="text" id="editCourseDuration" class="form-control" value="${escapeHtml(course.duration)}" required></div>
                    <div class="form-group"><label>Description</label><textarea id="editCourseDesc" class="form-control" rows="4" required>${escapeHtml(course.description||'')}</textarea></div>
                    <button type="button" class="btn btn-primary btn-block" onclick="updateCourse('${id}')">Save</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error(err);
        showNotification('Error loading course', 'error');
    }
}


// ФИКС: deleteCourse теперь удаляет из Firestore
async function deleteCourse(id) {
    if (!confirm('Delete this course?')) return;
    try {
        await window.deleteDoc(window.doc(window.db, 'courses', id));
        showNotification('Course deleted', 'info');
        loadCompanyCourses();
    } catch (err) {
        console.error(err);
        showNotification('Error deleting course', 'error');
    }
}

// ==================== СОБЫТИЯ ====================
async function loadCompanyEvents() {
    const container = document.getElementById('companyEventsList');
    const employerContainer = document.getElementById('employerEventsContent'); // для профиля
    if (!container && !employerContainer) return;

    try {
        const q = window.query(window.collection(window.db, 'events'), window.where('ownerId', '==', currentUser.id));
        const snapshot = await window.getDocs(q);
        const ownerEventsList = [];
        snapshot.forEach(doc => ownerEventsList.push({ id: doc.id, ...doc.data() }));

        const html = ownerEventsList.length === 0
            ? '<div class="empty-state"><i class="fas fa-calendar"></i><p>No events yet</p></div>'
            : `<div class="events-grid">
                ${ownerEventsList.map(e => `
                    <div class="event-card">
                        <div class="event-date">
                            <span class="day">${new Date(e.date).getDate()}</span>
                            <span class="month">${MONTH_NAMES[new Date(e.date).getMonth()].slice(0,3)}</span>
                        </div>
                        <div class="event-info">
                            <h3>${escapeHtml(e.title)}</h3>
                            <p><i class="fas fa-clock"></i> ${e.time}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(e.location)}</p>
                            <p><i class="fas fa-users"></i> ${e.participants||0} participants</p>
                            <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                                <button class="btn btn-outline btn-small" onclick="viewEventApplicants('${e.id}')"><i class="fas fa-users"></i> Registrations</button>
                                <button class="btn btn-ghost btn-small" onclick="editEvent('${e.id}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-danger btn-small" onclick="deleteEvent('${e.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        if (container) container.innerHTML = html;
        if (employerContainer) employerContainer.innerHTML = html;   // <-- заполняем профиль
    } catch (err) {
        console.error(err);
        const errorHtml = '<p style="color:var(--danger);">Error loading events</p>';
        if (container) container.innerHTML = errorHtml;
        if (employerContainer) employerContainer.innerHTML = errorHtml;
    }
}

async function loadEmployerEvents() {
    return loadCompanyEvents();
}

function openCreateEventModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'createEventModal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>Create Event</h2></div>
            <form id="createEventForm">
                <div class="form-group"><label>Title *</label><input type="text" id="newEventTitle" class="form-control" required></div>
                <div class="form-group"><label>Date *</label><input type="date" id="newEventDate" class="form-control" required></div>
                <div class="form-group"><label>Time *</label><input type="time" id="newEventTime" class="form-control" required></div>
                <div class="form-group"><label>Location *</label><input type="text" id="newEventLocation" class="form-control" placeholder="Almaty, Tech Garden / Online" required></div>
                <div class="form-group"><label>Type</label>
                    <select id="newEventType" class="form-control">
                        <option value="meetup">Meetup</option><option value="workshop">Workshop</option>
                        <option value="hackathon">Hackathon</option><option value="conference">Conference</option>
                    </select>
                </div>
                <div class="form-group"><label>Description *</label><textarea id="newEventDesc" class="form-control" rows="4" required></textarea></div>
                <button type="button" class="btn btn-primary btn-block" onclick="window.createEvent()">Create</button>
            </form>
        </div>
    `;
    const today = new Date().toISOString().split('T')[0];
    document.body.appendChild(modal);
    document.getElementById('newEventDate').setAttribute('min', today);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function createEvent() {
    const title    = document.getElementById('newEventTitle')?.value?.trim();
    const date     = document.getElementById('newEventDate')?.value;
    const time     = document.getElementById('newEventTime')?.value;
    const location = document.getElementById('newEventLocation')?.value?.trim();
    const desc     = document.getElementById('newEventDesc')?.value?.trim();

    if (!validateField('newEventTitle', v => {
        if (!v || v.trim().length < 3) return 'Title must be at least 3 characters';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) { throw new Error('Invalid title'); }

    if (!validateField('newEventDate', v => {
        if (!v) return 'Date is required';
        const d = new Date(v);
        if (isNaN(d.getTime())) return 'Invalid date format';
        if (d <= new Date()) return 'Date must be in the future';
        return null;
    })) { throw new Error('Invalid date'); }

    if (!time) {
        showNotification('Time is required', 'warning');
        throw new Error('Invalid time');
    }

    if (!validateField('newEventLocation', v => {
        if (!v || v.trim().length < 2) return 'Location is required';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) { throw new Error('Invalid location'); }

    if (!validateField('newEventDesc', v => {
        if (!v || v.trim().length < 10) return 'Description must be at least 10 characters';
        return null;
    })) { throw new Error('Invalid description'); }

    const newDocRef = window.doc(window.collection(window.db, 'events'));
    await window.setDoc(newDocRef, {
        id: newDocRef.id,
        title,
        date,
        time,
        location,
        type: document.getElementById('newEventType')?.value || 'meetup',
        description: desc,
        participants: 0,
        organizer: currentUser.companyName || currentUser.name,
        ownerId: currentUser.id,
        createdAt: new Date().toISOString()
    });

    const modal = document.getElementById('createEventModal');
    if (modal) modal.remove();
    showNotification('Event created! 🎉', 'success');
    loadCompanyEvents();
}

async function updateEvent(id) {
    const title    = document.getElementById('editEventTitle')?.value?.trim();
    const date     = document.getElementById('editEventDate')?.value;
    const time     = document.getElementById('editEventTime')?.value;
    const location = document.getElementById('editEventLocation')?.value?.trim();
    const desc     = document.getElementById('editEventDesc')?.value?.trim();

    if (!validateField('editEventTitle', v => {
        if (!v || v.trim().length < 3) return 'Title must be at least 3 characters';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) return;

    if (!validateField('editEventDate', v => {
        if (!v) return 'Date is required';
        const d = new Date(v);
        if (isNaN(d.getTime())) return 'Invalid date';
        if (d <= new Date()) return 'Date must be in the future';
        return null;
    })) return;

    if (!time) {
        showNotification('Time is required', 'warning');
        return;
    }

    if (!validateField('editEventLocation', v => {
        if (!v || v.trim().length < 2) return 'Location is required';
        const sp = QadamValidators.noSpecialChars(v);
        if (sp) return sp;
        return null;
    })) return;

    if (!validateField('editEventDesc', v => {
        if (!v || v.trim().length < 10) return 'Description must be at least 10 characters';
        return null;
    })) return;

    try {
        await window.updateDoc(window.doc(window.db, 'events', id), {
            title,
            date,
            time,
            location,
            description: desc
        });
        const modal = document.getElementById(`editEventModal_${id}`);
        if (modal) modal.remove();
        showNotification('Event updated! ✅', 'success');
        loadCompanyEvents();
    } catch (err) {
        console.error(err);
        showNotification('Error updating event', 'error');
    }
}

async function editEvent(id) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'events', id));
        if (!docSnap.exists()) return;
        const event = docSnap.data();

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = `editEventModal_${id}`;
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                <div class="modal-header"><h2>Edit Event</h2></div>
                <form id="editEventForm_${id}">
                    <div class="form-group"><label>Title</label><input type="text" id="editEventTitle" class="form-control" value="${escapeHtml(event.title)}" required></div>
                    <div class="form-group"><label>Date</label><input type="date" id="editEventDate" class="form-control" value="${event.date}" required></div>
                    <div class="form-group"><label>Time</label><input type="time" id="editEventTime" class="form-control" value="${event.time}" required></div>
                    <div class="form-group"><label>Location</label><input type="text" id="editEventLocation" class="form-control" value="${escapeHtml(event.location)}" required></div>
                    <div class="form-group"><label>Description</label><textarea id="editEventDesc" class="form-control" rows="4" required>${escapeHtml(event.description||'')}</textarea></div>
                    <button type="button" class="btn btn-primary btn-block" onclick="updateEvent('${id}')">Save</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error(err);
        showNotification('Error loading event', 'error');
    }
}



async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    try {
        await window.deleteDoc(window.doc(window.db, 'events', id));
        showNotification('Event deleted', 'info');
        loadCompanyEvents();
    } catch (err) {
        console.error(err);
        showNotification('Error deleting event', 'error');
    }
}

async function viewEventApplicants(eventId) {
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'events', eventId));
        if (!docSnap.exists()) { showNotification('Event not found', 'error'); return; }
        const event = docSnap.data();

        const q        = window.query(window.collection(window.db, 'eventRegistrations'), window.where('eventId', '==', eventId));
        const snapshot = await window.getDocs(q);
        const registrations = [];
        snapshot.forEach(doc => registrations.push({ id: doc.id, ...doc.data() }));

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                <div class="modal-header">
                    <h2>Registrations: "${escapeHtml(event.title)}"</h2>
                    <p>Total: ${registrations.length}</p>
                </div>
                <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
                    ${registrations.length === 0
                        ? '<p style="text-align:center;padding:2rem;color:var(--muted);">No registrations yet</p>'
                        : registrations.map(r => `
                            <div style="padding:1rem;margin-bottom:.5rem;border:1px solid var(--border);border-radius:10px;">
                                <strong>${escapeHtml(r.studentName||'Student')}</strong>
                                <span style="color:var(--muted);margin-left:.5rem;">${escapeHtml(r.studentEmail||'')}</span>
                                <span style="float:right;font-size:.8rem;color:var(--muted);">${formatDate(r.date)}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch (err) {
        console.error(err);
        showNotification('Error loading registrations', 'error');
    }
}

// ==================== APPLICANTS TAB ====================
async function loadEmployerApplicants() {
    const container = document.getElementById('employerApplicantsContent');
    if (!container) return;
    try {
        const q        = window.query(window.collection(window.db, 'internships'), window.where('ownerId', '==', currentUser.id));
        const snapshot = await window.getDocs(q);
        const myList   = [];
        snapshot.forEach(doc => myList.push({ id: doc.id, ...doc.data() }));

        const myIds = myList.map(i => i.id);
        let allApps = [];
        if (myIds.length > 0) {
            // ФИКС: Firestore 'in' принимает максимум 10 значений
            const batchIds = myIds.slice(0, 10);
            const appQ    = window.query(window.collection(window.db, 'applications'), window.where('internshipId', 'in', batchIds));
            const appSnap = await window.getDocs(appQ);
            appSnap.forEach(doc => allApps.push({ id: doc.id, ...doc.data() }));
        }

        container.innerHTML = `
            <h3 style="margin-bottom:1.5rem;">All Applications (${allApps.length})</h3>
            ${allApps.length === 0
                ? '<div class="empty-state"><i class="fas fa-users"></i><p>No applications</p></div>'
                : allApps.map(a => `
                    <div style="padding:1.5rem;margin-bottom:.75rem;border:1px solid var(--border);border-radius:12px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
                        <div>
                            <h4 style="margin:0;">${escapeHtml(a.studentName||'Student')}</h4>
                            <p style="margin:.25rem 0;color:var(--muted);">${escapeHtml(a.studentEmail||'')}</p>
                            <p style="margin:.25rem 0;"><strong>Position:</strong> ${escapeHtml(a.internshipTitle||'')}</p>
                            <p style="margin:0;font-size:.85rem;color:var(--muted);">Applied: ${formatDate(a.date)}</p>
                        </div>
                        <select onchange="updateApplicationStatus('${a.id}',this.value)" class="filter-select">
                            <option value="pending"  ${a.status==='pending'  ?'selected':''}>Pending</option>
                            <option value="reviewed" ${a.status==='reviewed' ?'selected':''}>Reviewed</option>
                            <option value="interview"${a.status==='interview'?'selected':''}>Interview</option>
                            <option value="accepted" ${a.status==='accepted' ?'selected':''}>Accepted</option>
                            <option value="rejected" ${a.status==='rejected' ?'selected':''}>Rejected</option>
                        </select>
                    </div>
                `).join('')
            }
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:var(--danger);">Error loading applicants</p>';
    }
}

// ==================== ЭКСПОРТ ====================
window.loadEmployerDashboard    = loadEmployerDashboard;
window.loadEmployerInternships  = loadEmployerInternships;
window.loadEmployerCourses      = loadEmployerCourses;
window.loadEmployerEvents       = loadEmployerEvents;
window.loadEmployerApplicants   = loadEmployerApplicants;
window.loadCompanyInternships   = loadEmployerInternships;  // алиас
window.loadCompanyCourses       = loadCompanyCourses;
window.loadCompanyEvents        = loadCompanyEvents;
window.openCreateInternshipModal= openCreateInternshipModal;
window.openCreateCourseModal    = openCreateCourseModal;
window.openCreateEventModal     = openCreateEventModal;
window.createInternship         = createInternship;
window.editInternship           = editInternship;
window.updateInternship         = updateInternship;
window.deleteInternship         = deleteInternship;
window.viewApplicants           = viewApplicants;
window.updateApplicationStatus  = updateApplicationStatus;
window.createCourse             = createCourse;
window.editCourse               = editCourse;
window.updateCourse             = updateCourse;
window.deleteCourse             = deleteCourse;
window.createEvent              = createEvent;
window.editEvent                = editEvent;
window.updateEvent              = updateEvent;
window.deleteEvent              = deleteEvent;
window.viewEventApplicants      = viewEventApplicants;
window.fillFromTemplate         = fillFromTemplate;