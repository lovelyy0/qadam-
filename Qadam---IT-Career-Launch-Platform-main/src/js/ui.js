// ==================== UI FUNCTIONS ====================


// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

function createParticles() {
    const c = document.getElementById('particles');
    if (!c) return;
    for (let i = 0; i < 45; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 5 + 2;
        p.style.cssText = `width:${size}px;height:${size}px;background:rgba(99,102,241,${Math.random() * .25});top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-duration:${Math.random() * 12 + 10}s;animation-name:particleFloat;animation-iteration-count:infinite;`;
        c.appendChild(p);
    }
}

async function updateStats() {
    try {
        // Проверяем что Firebase готов
        if (!window.db) {
            console.warn('Firebase not ready for updateStats');
            return;
        }
        
        const allInternships = await window.fetchAllInternshipsFromFirestore();
        const statInternships = document.getElementById('statInternships');
        const statCompanies = document.getElementById('statCompanies');
        const statCourses = document.getElementById('statCourses');
        const statEvents = document.getElementById('statEvents');
        
        if (statInternships) statInternships.textContent = allInternships.length + '+';
        
        const companies = new Set(allInternships.map(i => i.company));
        if (statCompanies) statCompanies.textContent = companies.size + '+';
        
        // Загружаем из Firestore с защитой от ошибок
        try {
            const coursesSnap = await window.getDocs(window.collection(window.db, 'courses'));
            if (statCourses) statCourses.textContent = coursesSnap.size + '+';
        } catch (e) {
            if (statCourses) statCourses.textContent = '0+';
        }
        
        try {
            const eventsSnap = await window.getDocs(window.collection(window.db, 'events'));
            if (statEvents) statEvents.textContent = eventsSnap.size + '+';
        } catch (e) {
            if (statEvents) statEvents.textContent = '0+';
        }
    } catch (e) {
        console.error('Error updating stats:', e);
        // Безопасный fallback — не падает если элементы не найдены
        ['statInternships', 'statCompanies', 'statCourses', 'statEvents'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0+';
        });
    }
}

function updateNavigation() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    
    if (currentUser && currentUser.role === 'employer') {
        nav.innerHTML = `
            <a class="nav__link active" onclick="showSection('home')"><i class="fas fa-home"></i> Home</a>
            <a class="nav__link" onclick="showSection('dashboard')"><i class="fas fa-chart-pie"></i> Dashboard</a>
            <a class="nav__link" onclick="showSection('companyInternships')"><i class="fas fa-briefcase"></i> My Internships</a>
            <a class="nav__link" onclick="showSection('companyCourses')"><i class="fas fa-book-open"></i> My Courses</a>
            <a class="nav__link" onclick="showSection('companyEvents')"><i class="fas fa-calendar-plus"></i> My Events</a>
        `;
    }
}

function showSection(section) {
    if (['dashboard', 'companyInternships', 'companyCourses', 'companyEvents'].includes(section)) {
        if (!document.getElementById('dashboardSection')) {
            createEmployerSections();
        }
    }
    
    const sections = ['home', 'internships', 'courses', 'events', 'resources', 'profile', 'saved', 'applications', 'dashboard', 'companyInternships', 'companyCourses', 'companyEvents'];
    sections.forEach(s => {
        const el = document.getElementById(s + 'Section');
        if (el) el.classList.add('hidden');
    });
    
    const el = document.getElementById(section + 'Section');
    if (el) el.classList.remove('hidden');
    
    document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`.nav__link[onclick*="${section}"]`);
    if (active) active.classList.add('active');
    
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Небольшая задержка перед загрузкой контента
    setTimeout(() => {
        switch (section) {
            case 'internships': loadInternships().catch(e => console.error(e)); break;
            case 'courses': loadCourses(); break;
            case 'events': loadEvents(); break;
            case 'resources': loadResources(); break;
            case 'profile': loadProfile(); break;
            // case 'saved': loadSavedItemsPage(); break;
            // case 'applications': loadApplicationsPage(); break;
            // ФИКС: Правильная загрузка dashboard в зависимости от роли
            case 'dashboard': 
                if (currentUser?.role === 'employer' && typeof loadEmployerDashboard === 'function') {
                    loadEmployerDashboard();
                } else if (typeof loadStudentDashboard === 'function') {
                    loadStudentDashboard();
                }
                break;
            case 'companyInternships': 
                if (typeof loadCompanyInternships === 'function') loadCompanyInternships(); 
                break;
            case 'companyCourses': 
                if (typeof loadCompanyCourses === 'function') loadCompanyCourses(); 
                break;
            case 'companyEvents': 
                if (typeof loadCompanyEvents === 'function') loadCompanyEvents(); 
                break;
            case 'saved':
                // перенаправляем в профиль и активируем вкладку Saved
                showSection('profile');
                setTimeout(() => showProfileTab('saved'), 150);
                break;
            case 'applications':
                // перенаправляем в профиль и активируем вкладку Applications
                showSection('profile');
                setTimeout(() => showProfileTab('applications'), 150);
                break;    
        }
    }, 100);
}

function createEmployerSections() {
    const main = document.querySelector('main');
    if (!main) return;
    
    const dashboardSection = document.createElement('div');
    dashboardSection.id = 'dashboardSection';
    dashboardSection.className = 'hidden';
    dashboardSection.innerHTML = `
        <section class="page-header"><div class="container"><h1>Employer Dashboard</h1><p>Manage vacancies and applications</p></div></section>
        <div class="container section"><div id="dashboardContent"></div></div>
    `;
    main.appendChild(dashboardSection);
    
    const companyInternshipsSection = document.createElement('div');
    companyInternshipsSection.id = 'companyInternshipsSection';
    companyInternshipsSection.className = 'hidden';
    companyInternshipsSection.innerHTML = `
        <section class="page-header"><div class="container"><h1>My Internships</h1><p>Manage internships and applications</p></div></section>
        <div class="container section">
            <button class="btn btn-primary" onclick="openCreateInternshipModal()" style="margin-bottom: 2rem;"><i class="fas fa-plus"></i> Create Internship</button>
            <div id="companyInternshipsList"></div>
        </div>
    `;
    main.appendChild(companyInternshipsSection);
    
    const companyCoursesSection = document.createElement('div');
    companyCoursesSection.id = 'companyCoursesSection';
    companyCoursesSection.className = 'hidden';
    companyCoursesSection.innerHTML = `
        <section class="page-header"><div class="container"><h1>My Courses</h1><p>Manage courses and students</p></div></section>
        <div class="container section">
            <button class="btn btn-primary" onclick="openCreateCourseModal()" style="margin-bottom: 2rem;"><i class="fas fa-plus"></i> Create Course</button>
            <div id="companyCoursesList"></div>
        </div>
    `;
    main.appendChild(companyCoursesSection);
    
    const companyEventsSection = document.createElement('div');
    companyEventsSection.id = 'companyEventsSection';
    companyEventsSection.className = 'hidden';
    companyEventsSection.innerHTML = `
        <section class="page-header"><div class="container"><h1>My Events</h1><p>Manage events and participants</p></div></section>
        <div class="container section">
            <button class="btn btn-primary" onclick="openCreateEventModal()" style="margin-bottom: 2rem;"><i class="fas fa-plus"></i> Create Event</button>
            <div id="companyEventsList"></div>
        </div>
    `;
    main.appendChild(companyEventsSection);
}


// ==================== СТАЖИРОВКИ ====================

// Асинхронный рендер популярных стажировок (первые 3)
async function renderPopularInternships() {
    const c = document.getElementById('popularInternships');
    if (!c) return;
    try {
        const q = window.query(window.collection(window.db, 'internships'), window.orderBy('posted', 'desc'), window.limit(3));
        const snapshot = await window.getDocs(q);
        const internships = [];
        snapshot.forEach(doc => internships.push({ id: doc.id, ...doc.data() }));
        c.innerHTML = internships.map(i => createInternshipCardHTML(i)).join('');
    } catch (e) {
        console.error('Error loading popular internships:', e);
        c.innerHTML = '<p style="color:var(--muted)">Unable to load popular internships</p>';
    }
}

function renderTestimonials() {
    const c = document.getElementById('testimonialsSlider');
    if (!c) return;
    c.innerHTML = data.testimonials.map(t => `
        <div class="testimonial-card">
            <div class="testimonial-content"><i class="fas fa-quote-left"></i><p>${t.text}</p></div>
            <div class="testimonial-author"><div class="author-avatar">${t.avatar}</div><div class="author-info"><h4>${t.name}</h4><p>${t.position}</p></div></div>
        </div>
    `).join('');
}

// Основная функция загрузки стажировок (асинхронная)
async function loadInternships() {
    const c = document.getElementById('internshipsContainer');
    if (!c) return;

    showLoader();

    const internships = await window.fetchAllInternshipsFromFirestore();
    let filtered = filterInternshipsArray(internships);

    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) resultsCount.textContent = `Found ${filtered.length} internships`;

    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="fas fa-search"></i><p>Nothing found</p><button class="btn btn-outline" onclick="resetFilters()">Reset filters</button></div>`;
        const loadMore = document.getElementById('loadMoreWrap');
        if (loadMore) loadMore.style.display = 'none';
        hideLoader();
        return;
    }

    const paginated = filtered.slice(0, currentPage * itemsPerPage);
    c.innerHTML = paginated.map(i => createInternshipCardHTML(i)).join('');
    const loadMore = document.getElementById('loadMoreWrap');
    if (loadMore) loadMore.style.display = paginated.length >= filtered.length ? 'none' : 'block';

    hideLoader();
}

function createInternshipCardHTML(internship) {
    const isSaved = savedItems.includes(internship.id);
    const daysLeft = getDaysUntil(internship.deadline);
    return `
        <div class="internship-card" onclick="openInternshipDetail('${internship.id}')">
            ${internship.match ? `<div class="match-badge" style="background:var(--primary)">🔥 ${internship.match}% match</div>` : ''}
            <div class="internship-header"><h3>${escapeHtml(internship.title)}</h3><div class="company"><i class="fas fa-building"></i><span>${escapeHtml(internship.company)}</span></div></div>
            <div class="internship-body">
                <div class="internship-meta"><span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(internship.location)}</span><span class="salary"><i class="fas fa-tenge"></i> ${escapeHtml(internship.salary)}</span></div>
                <p class="internship-description">${escapeHtml((internship.description || '').substring(0, 110))}...</p>
                <div class="internship-requirements">
                    ${(internship.requirements || []).slice(0, 3).map(r => `<span class="requirement-tag">${escapeHtml(r)}</span>`).join('')}
                    ${(internship.requirements || []).length > 3 ? `<span class="requirement-tag">+${internship.requirements.length - 3}</span>` : ''}
                </div>
                <div class="internship-footer">
                    <span class="deadline ${daysLeft < 7 ? 'urgent' : ''}"><i class="fas fa-clock"></i> ${daysLeft} days left</span>
                    ${currentUser && currentUser.role === 'student' ? `<button class="btn-save ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation();toggleSave('${internship.id}')"><i class="fas fa-star"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function filterInternshipsArray(internships) {
    let f = [...internships];
    if (currentFilter.city) f = f.filter(i => i.location === currentFilter.city);
    if (currentFilter.direction) f = f.filter(i => i.type === currentFilter.direction);
    if (currentFilter.salary) {
        if (currentFilter.salary.includes('+')) {
            const min = parseInt(currentFilter.salary);
            f = f.filter(i => (i.salaryMin || 0) >= min);
        } else {
            const [min, max] = currentFilter.salary.split('-').map(Number);
            f = f.filter(i => (i.salaryMin || 0) >= min && (i.salaryMin || 0) <= max);
        }
    }
    const q = document.getElementById('internshipSearch')?.value.toLowerCase().trim();
    if (q) f = f.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.company.toLowerCase().includes(q) || 
        (Array.isArray(i.requirements) && i.requirements.some(r => r.toLowerCase().includes(q)))
    );
    return f;
}

function applyFilters() {
    currentFilter = {
        city: document.getElementById('cityFilter').value,
        direction: document.getElementById('directionFilter').value,
        salary: document.getElementById('salaryFilter').value,
    };
    currentPage = 1;
    loadInternships().catch(e => console.error(e));
    showNotification('Filters applied', 'success');
}

function resetFilters() {
    document.getElementById('internshipSearch').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('directionFilter').value = '';
    document.getElementById('salaryFilter').value = '';
    currentFilter = { city: '', direction: '', salary: '' };
    currentPage = 1;
    loadInternships().catch(e => console.error(e));
}

function loadMoreInternships() {
    if (isLoading) return;
    isLoading = true;
    const btn = document.querySelector('#loadMoreWrap .btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    currentPage++;
    loadInternships().then(() => {
        isLoading = false;
        btn.innerHTML = '<span>Load more</span><i class="fas fa-chevron-down"></i>';
    }).catch(() => {
        isLoading = false;
        btn.innerHTML = '<span>Load more</span><i class="fas fa-chevron-down"></i>';
    });
}

function changeView(view, btn) {
    currentView = view;
    document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('internshipsContainer').className = view === 'grid' ? 'internships-grid' : 'internships-list';
}

async function openInternshipDetail(id) {
    const i = await fetchInternshipByIdFromFirestore(id);
    if (!i) {
        showNotification('Internship not found', 'error');
        return;
    }
    
    const isSaved = savedItems.includes(id);
    const daysLeft = getDaysUntil(i.deadline);
    
    let applicantsCount = 0;
    try {
        const q = window.query(window.collection(window.db, 'applications'), window.where('internshipId', '==', id));
        const snapshot = await window.getDocs(q);
        applicantsCount = snapshot.size;
    } catch (e) {
        console.error('Error fetching applicants count:', e);
    }
    
    let actionsHtml = '';
    if (!currentUser) {
        actionsHtml = `<button class="btn btn-primary btn-large" onclick="openModal('login');closeModal('internship')"><i class="fas fa-sign-in-alt"></i> Sign in to apply</button>`;
    } else if (currentUser.role === 'student') {
        const employerId = i.ownerId;
        actionsHtml = `
            <div class="form-group" style="margin-bottom:1rem;">
                <label>Cover Letter (optional)</label>
                <textarea id="coverLetterInput" class="form-control" rows="3" placeholder="Briefly explain why you're a good fit..."></textarea>
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary btn-large" id="applyBtn" onclick="applyForInternship('${i.id}')">
                    <i class="fas fa-paper-plane"></i><span>Apply</span>
                </button>
                <button class="btn btn-outline btn-large" onclick="openChatWithEmployer('${employerId}', '${escapeHtml(i.company)}', '${escapeHtml(i.company)}')">
                    <i class="fas fa-comment"></i><span>Message</span>
                </button>
                <button class="btn ${isSaved ? 'btn-ghost' : 'btn-outline'} btn-large" onclick="toggleSave('${i.id}');closeModal('internship')">
                    <i class="fas fa-star"></i><span>${isSaved ? 'Saved' : 'Save'}</span>
                </button>
            </div>
        `;
    } else if (currentUser.role === 'employer') {
        if (i.ownerId === currentUser.id) {
            actionsHtml = `
                <button class="btn btn-primary btn-large" onclick="closeModal('internship');viewApplicants('${i.id}')"><i class="fas fa-users"></i> Applications (${applicantsCount})</button>
                <button class="btn btn-outline btn-large" onclick="closeModal('internship');editInternship('${i.id}')"><i class="fas fa-edit"></i> Edit</button>
            `;
        } else {
            actionsHtml = `<p style="color:var(--muted);">You can only view internships from other companies</p>`;
        }
    }
    
    document.getElementById('internshipDetail').innerHTML = `
        <div class="detail-header"><h2>${escapeHtml(i.title)}</h2><p class="company-name"><i class="fas fa-building"></i> ${escapeHtml(i.company)}</p></div>
        <div class="detail-meta">
            <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(i.location)}</span></div>
            <div class="meta-item"><i class="fas fa-tenge"></i><span>${escapeHtml(i.salary)}</span></div>
            <div class="meta-item"><i class="fas fa-clock"></i><span>${i.duration || 'N/A'} mos.</span></div>
            <div class="meta-item"><i class="fas fa-users"></i><span>${applicantsCount} applications</span></div>
        </div>
        <div class="detail-section"><h3>Description</h3><p>${escapeHtml(i.description || '')}</p></div>
        <div class="detail-section"><h3>Requirements</h3><div class="requirements-list">${(i.requirements || []).map(r => `<div class="requirement-item"><i class="fas fa-check-circle"></i><span>${escapeHtml(r)}</span></div>`).join('')}</div></div>
        <div class="detail-section"><h3>Deadline</h3><p class="deadline-text ${daysLeft < 7 ? 'urgent' : ''}"><i class="fas fa-calendar"></i> ${formatDate(i.deadline)} — ${daysLeft} days left</p></div>
        <div class="detail-actions">${actionsHtml}</div>
    `;
    openModal('internship');
}

// ==================== КУРСЫ ====================

async function loadCourses(filter = 'all') {
    const c = document.getElementById('coursesContainer');
    if (!c) return;
    
    try {
        showLoader();
        const snapshot = await window.getDocs(window.collection(window.db, 'courses'));
        let courses = [];
        snapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));
        
        if (filter === 'free') courses = courses.filter(x => x.type === 'free');
        if (filter === 'paid') courses = courses.filter(x => x.type === 'paid');
        if (filter === 'beginner') courses = courses.filter(x => x.level === 'Beginner');
        
        c.innerHTML = courses.map(course => `
            <div class="course-card" onclick="openCourseDetail('${course.id}')">
                <div class="course-image"><span class="course-badge ${course.type}">${course.type === 'free' ? 'Free' : 'Paid'}</span></div>
                <div class="course-content">
                    <h3>${escapeHtml(course.title)}</h3>
                    <p class="course-provider">${escapeHtml(course.provider)}</p>
                    <p>${escapeHtml((course.description || '').substring(0, 70))}...</p>
                    <div class="course-meta">
                        <span><i class="fas fa-clock"></i> ${course.duration}</span>
                        <span><i class="fas fa-users"></i> ${(course.students || 0).toLocaleString()}</span>
                        <span><i class="fas fa-star" style="color:#fbbf24"></i> ${course.rating || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
        hideLoader();
    } catch (e) {
        console.error('Error loading courses:', e);
        c.innerHTML = '<div class="empty-state"><p>Error loading courses</p></div>';
        hideLoader();
    }
}

function filterCourses(type, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadCourses(type);
}

function openCourseDetail(id) {
    window.getDoc(window.doc(window.db, 'courses', id)).then(docSnap => {
        if (!docSnap.exists()) return;
        const c = { id: docSnap.id, ...docSnap.data() };
        
        let actionsHtml = '';
        if (!currentUser) {
            actionsHtml = `<button class="btn btn-primary btn-large" onclick="openModal('login');closeModal('course')">Sign in to enroll</button>`;
        } else if (currentUser.role === 'student') {
            actionsHtml = `<button class="btn btn-primary btn-large" onclick="enrollCourse('${c.id}')">Enroll</button>`;
        }
        
        document.getElementById('courseDetail').innerHTML = `
            <div class="detail-header"><h2>${escapeHtml(c.title)}</h2><p>${escapeHtml(c.provider)}</p></div>
            <div class="course-stats">
                <div class="stat"><i class="fas fa-clock"></i><span>${c.duration}</span></div>
                <div class="stat"><i class="fas fa-signal"></i><span>${c.level}</span></div>
                <div class="stat"><i class="fas fa-users"></i><span>${(c.students || 0).toLocaleString()} students</span></div>
                <div class="stat"><i class="fas fa-star"></i><span>${c.rating || 0}/5.0</span></div>
            </div>
            <div class="detail-section"><h3>About</h3><p>${escapeHtml(c.description || '')}</p></div>
            <div class="price-section"><div class="price">${c.price}</div>${actionsHtml}</div>
        `;
        openModal('course');
    }).catch(err => console.error('Error:', err));
}

// ==================== СОБЫТИЯ ====================
async function loadEvents() {
    const monthEl = document.getElementById('currentMonth');
    if (monthEl) monthEl.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    
    const c = document.getElementById('eventsContainer');
    if (!c) return;
    
    try {
        showLoader();
        
        const snapshot = await window.getDocs(window.collection(window.db, 'events'));
        const allEvents = [];
        snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
        
        const monthEvents = allEvents.filter(e => { 
            const d = new Date(e.date); 
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear; 
        });
        
        if (!monthEvents.length) { 
            c.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>No events this month</p></div>'; 
            hideLoader();
            return; 
        }
        
        c.innerHTML = monthEvents.map(e => `
            <div class="event-card" onclick="openEventDetail('${e.id}')">
                <div class="event-date">
                    <span class="day">${new Date(e.date).getDate()}</span>
                    <span class="month">${MONTH_NAMES[new Date(e.date).getMonth()].slice(0, 3)}</span>
                </div>
                <div class="event-info">
                    <h3>${escapeHtml(e.title)}</h3>
                    <p><i class="fas fa-clock"></i> ${e.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(e.location)}</p>
                    <p><i class="fas fa-users"></i> ${e.participants || 0} participants</p>
                </div>
            </div>
        `).join('');
        
        hideLoader();
    } catch (err) {
        console.error('Error loading events:', err);
        c.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>Error loading events</p></div>';
        hideLoader();
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) { 
        currentMonth = 11; 
        currentYear--; 
    } else if (currentMonth > 11) { 
        currentMonth = 0; 
        currentYear++; 
    }
    loadEvents();
}

function openEventDetail(id) {
    window.getDoc(window.doc(window.db, 'events', id)).then(docSnap => {
        if (!docSnap.exists()) return;
        const e = { id: docSnap.id, ...docSnap.data() };
        
        const types = { 
            hackathon: '💻 Hackathon', 
            meetup: '🤝 Meetup', 
            workshop: '🔧 Workshop', 
            conference: '🎤 Conference' 
        };
    
        let actionsHtml = '';
        if (!currentUser) {
            actionsHtml = `<button class="btn btn-primary btn-large btn-block" onclick="openModal('login');closeModal('event')"><i class="fas fa-sign-in-alt"></i> Sign in to register</button>`;
        } else if (currentUser.role === 'student') {
            actionsHtml = `<button class="btn btn-primary btn-large btn-block" onclick="registerForEvent('${e.id}')"><i class="fas fa-ticket-alt"></i><span>Register</span></button>`;
        }
        
        document.getElementById('eventDetail').innerHTML = `
            <div class="detail-header"><h2>${escapeHtml(e.title)}</h2><p class="event-type">${types[e.type] || e.type}</p></div>
            <div class="event-detail-meta">
                <div class="meta-item"><i class="fas fa-calendar"></i><span>${formatDate(e.date)}</span></div>
                <div class="meta-item"><i class="fas fa-clock"></i><span>${e.time}</span></div>
                <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(e.location)}</span></div>
                <div class="meta-item"><i class="fas fa-building"></i><span>${escapeHtml(e.organizer || '')}</span></div>
            </div>
            <div class="detail-section"><h3>Description</h3><p>${escapeHtml(e.description || '')}</p></div>
            <div class="detail-section"><h3>Details</h3><p>👥 Participants: ${e.participants || 0}</p></div>
            ${actionsHtml}
        `;
        openModal('event');
    }).catch(err => {
        console.error('Error loading event:', err);
    });
}

// ==================== РЕСУРСЫ И МЕНТОРЫ ====================

function loadResources() {
    const c = document.getElementById('mentorsContainer');
    if (!c) return;
    c.innerHTML = data.mentors.map(m => `
        <div class="mentor-card">
            <div class="mentor-avatar">${getInitials(m.name)}</div>
            <h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.position)} at ${escapeHtml(m.company)}</p>
            <p class="experience">Experience: ${m.experience} years · ${m.students} students</p>
            <div class="mentor-skills">${m.skills.map(s => `<span>${escapeHtml(s)}</span>`).join('')}</div>
            <div class="mentor-stats"><span><i class="fas fa-star" style="color:#fbbf24"></i> ${m.rating}</span></div>
            ${currentUser && currentUser.role === 'student' ? `<button class="btn btn-primary btn-block" style="margin-top:.75rem" onclick="connectWithMentor(${m.id})"><i class="fas fa-handshake"></i> Connect</button>` : ''}
        </div>
    `).join('');
}

function openResource(type) {
    const resources = {
        cv: { 
            title: 'How to write an IT CV', 
            content: `<h3>Resume structure</h3><ol><li>Contact info</li><li>Summary</li><li>Experience</li><li>Education</li><li>Skills</li><li>Projects</li></ol><p>Remember to tailor your CV for each application!</p>` 
        },
        portfolio: { 
            title: 'IT Portfolio', 
            content: `<h3>What should be in a portfolio</h3><ul><li>2-3 complete projects</li><li>GitHub repository links</li><li>Live demo if possible</li><li>Description of your role and technologies used</li></ul>` 
        },
        interview: { 
            title: 'Interview Preparation', 
            content: `<h3>Top 10 interview questions</h3><ol><li>Tell me about yourself</li><li>Why do you want to work here?</li><li>Describe a challenging project</li><li>How do you handle deadlines?</li><li>What are your strengths/weaknesses?</li><li>Where do you see yourself in 5 years?</li><li>Why should we hire you?</li><li>Tell me about a time you worked in a team</li><li>How do you stay updated with tech?</li><li>Do you have any questions for us?</li></ol>` 
        },
        skills: { 
            title: 'Skills 2026', 
            content: `<h4>Most in-demand skills:</h4><ul><li><strong>Frontend:</strong> React, TypeScript, Next.js, Tailwind</li><li><strong>Backend:</strong> Node.js, Python, Java, Go</li><li><strong>Mobile:</strong> React Native, Flutter, Swift, Kotlin</li><li><strong>Data:</strong> Python, SQL, TensorFlow, Pandas</li><li><strong>DevOps:</strong> Docker, Kubernetes, AWS, CI/CD</li></ul>` 
        },
    };
    const r = resources[type];
    if (!r) return;
    document.getElementById('resourceDetail').innerHTML = `<h2>${r.title}</h2>${r.content}`;
    openModal('resource');
}

// ==================== СОХРАНЁННЫЕ И ЗАЯВКИ ====================

function loadSavedItemsPage() {
    const container = document.getElementById('savedContainer');
    if (!container) return;
    
    window.fetchAllInternshipsFromFirestore().then(allInternships => {
        const savedInternshipsList = allInternships.filter(i => savedItems.includes(i.id));
        
        if (savedInternshipsList.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bookmark"></i><p>You have no saved internships</p><button class="btn btn-primary" onclick="showSection(\'internships\')">Find internships</button></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="internships-grid">
                ${savedInternshipsList.map(i => createInternshipCardHTML(i)).join('')}
            </div>
        `;
    }).catch(e => {
        console.error('Error loading saved items:', e);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading saved items</p></div>';
    });
}

function loadApplicationsPage() {
    const container = document.getElementById('applicationsContainer');
    if (!container) return;
    
    if (applications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>You have no applications</p><button class="btn btn-primary" onclick="showSection(\'internships\')">Find internships</button></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="applications-grid">
            ${applications.sort((a, b) => new Date(b.date) - new Date(a.date)).map(a => `
                <div class="application-card">
                    <div class="application-header">
                        <h3>${escapeHtml(a.internshipTitle)}</h3>
                        <p class="company">${escapeHtml(a.company)}</p>
                    </div>
                    <div class="application-body">
                        <p><i class="fas fa-calendar"></i> Applied: ${formatDate(a.date)}</p>
                        <div class="application-status-badge ${a.status}">
                            <i class="fas ${getStatusIcon(a.status)}"></i> ${getStatusLabel(a.status)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/// ==================== ПРОФИЛЬ ====================
function loadProfile() {
    if (!currentUser) { 
        showSection('home'); 
        openModal('login'); 
        return; 
    }
    
    document.getElementById('profileDisplayName').textContent = currentUser.name || '';
    document.getElementById('profileDisplayEmail').textContent = currentUser.email || '';
    const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            if (currentUser.avatarUrl) {
                profileAvatar.innerHTML = `<img src="${escapeHtml(currentUser.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                profileAvatar.textContent = getInitials(currentUser.name);
            }
        }
    
    
    
    // Сначала скрываем ВСЕ вкладки
    document.querySelectorAll('.profile-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    if (currentUser.role === 'student') {
        updateStudentTabs();
        // Показываем dashboard вкладку
        const dt = document.getElementById('dashboardTab');
        if (dt) {
            dt.classList.add('active');
            // ЯВНО вызываем загрузку контента
            if (typeof loadStudentDashboard === 'function') {
                loadStudentDashboard();
            }
        }
    } else if (currentUser.role === 'employer') {
        updateEmployerTabs();
        const internshipsTab = document.getElementById('employerInternshipsTab');
        if (internshipsTab) {
            internshipsTab.classList.add('active');
            if (typeof loadEmployerInternships === 'function') {
                loadEmployerInternships();
            }
        }
        if (edt) {
            edt.classList.add('active');
            if (typeof loadEmployerDashboard === 'function') {
                loadEmployerDashboard();
            }
        }
    }
}

function updateProfileStats() {
    const savedCount = document.getElementById('profileSavedCount');
    const appsCount = document.getElementById('profileApplicationsCount');
    
    if (savedCount) savedCount.textContent = savedItems.length;
    if (appsCount) appsCount.textContent = applications.length;
    
    if (currentUser.role === 'student') {
        const coursesCount = document.getElementById('profileCoursesCount');
        const projectsCount = document.getElementById('profileProjectsCount');
        
        if (coursesCount) coursesCount.textContent = enrolledCourses.length;
        if (projectsCount) projectsCount.textContent = studentPortfolio?.projects?.length || 0;
    }
    
    if (currentUser.role === 'employer') {
        const internEl = document.getElementById('employerInternshipsCount');
        const courseEl = document.getElementById('employerCoursesCount');
        const eventEl = document.getElementById('employerEventsCount');
        if (internEl) internEl.textContent = '…';
        if (courseEl) courseEl.textContent = '…';
        if (eventEl) eventEl.textContent = '…';

        (async () => {
            try {
                const internSnap = await window.getDocs(window.query(window.collection(window.db, 'internships'), window.where('ownerId', '==', currentUser.id)));
                if (internEl) internEl.textContent = internSnap.size;

                const courseSnap = await window.getDocs(window.query(window.collection(window.db, 'courses'), window.where('ownerId', '==', currentUser.id)));
                if (courseEl) courseEl.textContent = courseSnap.size;

                const eventSnap = await window.getDocs(window.query(window.collection(window.db, 'events'), window.where('ownerId', '==', currentUser.id)));
                if (eventEl) eventEl.textContent = eventSnap.size;
            } catch (err) {
                console.error('Error loading stats:', err);
                if (internEl) internEl.textContent = '–';
                if (courseEl) courseEl.textContent = '–';
                if (eventEl) eventEl.textContent = '–';
            }
        })();
    }
}

// ФИКС: Добавлена кнопка Messages в студенческие табы
function updateStudentTabs() {
    const tabsContainer = document.getElementById('profileTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <button class="tab-btn active" onclick="showProfileTab('dashboard')"><i class="fas fa-chart-line"></i><span>Dashboard</span></button>
        <button class="tab-btn" onclick="showProfileTab('portfolio')"><i class="fas fa-folder-open"></i><span>Portfolio</span></button>
        <button class="tab-btn" onclick="showProfileTab('skills')"><i class="fas fa-star"></i><span>Skills</span></button>
        <button class="tab-btn" onclick="showProfileTab('myCourses')"><i class="fas fa-graduation-cap"></i><span>My Courses</span></button>
        <button class="tab-btn" onclick="showProfileTab('applications')"><i class="fas fa-paper-plane"></i><span>Applications</span></button>
        <button class="tab-btn" onclick="showProfileTab('saved')"><i class="fas fa-bookmark"></i><span>Saved</span></button>
        <button class="tab-btn" onclick="showProfileTab('cv')"><i class="fas fa-file-alt"></i><span>My CV</span></button>
        <button class="tab-btn" onclick="showProfileTab('settings')"><i class="fas fa-cog"></i><span>Settings</span></button>
        <button class="tab-btn" onclick="showProfileTab('messages')"><i class="fas fa-comments"></i><span>Messages</span></button>
        <button class="tab-btn" onclick="showProfileTab('connections')"><i class="fas fa-users"></i><span>Connections</span></button>
    `;
    
    const statsContainer = document.getElementById('profileStatsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="profile-stat"><div class="stat-value" id="profileSavedCount">${savedItems.length}</div><div class="stat-label">Saved</div></div>
            <div class="profile-stat"><div class="stat-value" id="profileApplicationsCount">${applications.length}</div><div class="stat-label">Applications</div></div>
            <div class="profile-stat"><div class="stat-value" id="profileCoursesCount">${enrolledCourses.length}</div><div class="stat-label">Courses</div></div>
            <div class="profile-stat"><div class="stat-value" id="profileProjectsCount">${studentPortfolio?.projects?.length || 0}</div><div class="stat-label">Projects</div></div>
        `;
    }
}
   


// ФИКС: Добавлена кнопка Messages в табы работодателя
function updateEmployerTabs() {
    const tabsContainer = document.getElementById('profileTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        
        <button class="tab-btn" onclick="showEmployerProfileTab('internships')"><i class="fas fa-briefcase"></i><span>Internships</span></button>
        <button class="tab-btn" onclick="showEmployerProfileTab('courses')"><i class="fas fa-book-open"></i><span>Courses</span></button>
        <button class="tab-btn" onclick="showEmployerProfileTab('events')"><i class="fas fa-calendar-alt"></i><span>Events</span></button>
        <button class="tab-btn" onclick="showEmployerProfileTab('applicants')"><i class="fas fa-users"></i><span>Applicants</span></button>
        <button class="tab-btn" onclick="showEmployerProfileTab('settings')"><i class="fas fa-cog"></i><span>Settings</span></button>
        <button class="tab-btn" onclick="showProfileTab('messages')"><i class="fas fa-comments"></i><span>Messages</span></button>
                <button class="tab-btn" onclick="showProfileTab('connections')"><i class="fas fa-users"></i><span>Connections</span></button>
    `;
    
    const statsContainer = document.getElementById('profileStatsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="profile-stat"><div class="stat-value" id="employerInternshipsCount">${myInternships.length}</div><div class="stat-label">Internships</div></div>
            <div class="profile-stat"><div class="stat-value" id="employerCoursesCount">${myCourses.length}</div><div class="stat-label">Courses</div></div>
            <div class="profile-stat"><div class="stat-value" id="employerEventsCount">${myEvents.length}</div><div class="stat-label">Events</div></div>
            <div class="profile-stat"><div class="stat-value" id="employerApplicantsCount">${applications.length}</div><div class="stat-label">Applications</div></div>
        `;
    }
}

// ФИКС: Добавлен case 'messages' и исправлен case 'dashboard'
function showProfileTab(tab) {
    console.log('Opening tab:', tab);
    
    // 1. Hide ALL tabs — using only .active (avoid .hidden which has !important and breaks CSS)
    document.querySelectorAll('.profile-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // 2. Show the requested tab
    const tabId = tab + 'Tab';
    const tabElement = document.getElementById(tabId);
    
    if (!tabElement) {
        console.error('Tab not found in HTML:', tabId);
        return;
    }
    
    tabElement.classList.add('active');
    console.log('Tab shown:', tabId);
    
    // 3. Обновляем активную кнопку
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes(`'${tab}'`);
    });
    
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 4. Загружаем контент для конкретной вкладки
    switch (tab) {
        case 'dashboard': 
            // ФИКС: Правильная загрузка в зависимости от роли
            if (currentUser?.role === 'employer' && typeof loadEmployerDashboard === 'function') {
                loadEmployerDashboard();
            } else if (typeof loadStudentDashboard === 'function') {
                loadStudentDashboard();
            }
            break;
        case 'portfolio': 
            if (typeof loadPortfolio === 'function') loadPortfolio(); 
            break;
        case 'skills': 
            if (typeof loadSkills === 'function') loadSkills(); 
            break;
        case 'myCourses': 
            if (typeof loadMyCourses === 'function') loadMyCourses(); 
            break;
        case 'applications': 
            if (typeof loadApplications === 'function') loadApplications(); 
            break;
        case 'saved': 
            if (typeof loadSavedItems === 'function') loadSavedItems(); 
            break;
        case 'cv': 
            if (typeof loadCV === 'function') loadCV(); 
            break;
        case 'settings': 
            if (typeof loadProfileSettings === 'function') {
                loadProfileSettings();
            }
            break;
        // ФИКС: Добавлен case 'messages'
        case 'messages':
            if (typeof loadMyChats === 'function') loadMyChats();
            break;
        case 'connections':
            if (typeof loadConnections === 'function') loadConnections();
            break;
        default:
            console.warn('Unknown tab:', tab);
    }
}

function showEmployerProfileTab(tab) {
    console.log('Opening employer tab:', tab);
    
    // Hide all tabs — using only .active (no .hidden which would break CSS with !important)
    document.querySelectorAll('.profile-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // Определяем ID вкладки
    let tabId;
    if (tab === 'settings') {
        tabId = 'settingsTab';
    } else if (tab === 'messages') {
        tabId = 'messagesTab';
    } else {
        tabId = `employer${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`;
    }
    
    // Показываем нужную вкладку
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
        tabEl.classList.add('active');
        console.log('Employer tab shown:', tabId);
    } else {
        console.error('Employer tab not found:', tabId);
        return;
    }
    
    // Обновляем активную кнопку
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tab)) {
            btn.classList.add('active');
        }
    });
    
    // Загружаем контент
    const loadFunctions = {
        dashboard: 'loadEmployerDashboard',
        internships: 'loadEmployerInternships',
        courses: 'loadEmployerCourses',
        events: 'loadEmployerEvents',
        applicants: 'loadEmployerApplicants',
        settings: 'loadProfileSettings',
        messages: 'loadMyChats'
    };
    
    const functionName = loadFunctions[tab];
    if (functionName && typeof window[functionName] === 'function') {
        try {
            window[functionName]();
        } catch (error) {
            console.error(`Error loading ${tab}:`, error);
        }
    }
}


// Экспорт функций
window.loadProfile = loadProfile;
window.updateProfileStats = updateProfileStats;
window.showProfileTab = showProfileTab;
window.showEmployerProfileTab = showEmployerProfileTab;
window.updateStudentTabs = updateStudentTabs;
window.updateEmployerTabs = updateEmployerTabs;
// ==================== CONNECTIONS (stub — extend as needed) ====================
function loadConnections() {
    const container = document.getElementById('connectionsContent');
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-users"></i>
            <h3>Connections</h3>
            <p>Connect with mentors and other students. Coming soon!</p>
        </div>`;
}