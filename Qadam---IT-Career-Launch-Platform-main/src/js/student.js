// ==================== STUDENT FUNCTIONS (FINAL — ПОЛНЫЙ КОД) ====================

function initStudentData() {
    if (currentUser && currentUser.role === 'student') {
        const savedPortfolio = localStorage.getItem(`qadam_portfolio_${currentUser.id}`);
        if (savedPortfolio) {
            try { studentPortfolio = JSON.parse(savedPortfolio); }
            catch (e) { studentPortfolio = { projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: [] }; }
        } else {
            studentPortfolio = { projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: [] };
        }
        if (!studentPortfolio.projects) studentPortfolio.projects = [];
        if (!studentPortfolio.skills) studentPortfolio.skills = [];
        if (!studentPortfolio.certificates) studentPortfolio.certificates = [];
        if (!studentPortfolio.education) studentPortfolio.education = [];
        if (!studentPortfolio.experience) studentPortfolio.experience = [];
        if (!studentPortfolio.githubRepos) studentPortfolio.githubRepos = [];

        enrolledCourses = JSON.parse(localStorage.getItem(`qadam_enrolled_${currentUser.id}`)) || [];
        studentCV = JSON.parse(localStorage.getItem(`qadam_cv_${currentUser.id}`)) || {
            fullName: currentUser.name, email: currentUser.email,
            skills: [], experience: [], education: [], languages: [], links: {}
        };
    }
}

if (currentUser) initStudentData();

// ==================== DASHBOARD ====================
function loadStudentDashboard() {
    const container = document.getElementById('studentDashboard');
    if (!container) return;
    const stats = { 
        applications: applications.length, 
        saved: savedItems.length, 
        courses: enrolledCourses.length, 
        projects: studentPortfolio?.projects?.length || 0 
    };
    const recentApps = applications.slice(0, 3);
    const recentCourses = enrolledCourses.slice(0, 3);
    
    container.innerHTML = `
        <div class="dashboard-welcome">
            <h3>Welcome, ${escapeHtml(currentUser.name)}! 👋</h3>
            <p>Track your career progress and manage your profile</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card stat-card--purple"><h3>${stats.applications}</h3><p>Applications</p></div>
            <div class="stat-card stat-card--pink"><h3>${stats.saved}</h3><p>Saved</p></div>
            <div class="stat-card stat-card--blue"><h3>${stats.courses}</h3><p>Courses</p></div>
            <div class="stat-card stat-card--green"><h3>${stats.projects}</h3><p>Projects</p></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div class="dashboard-section">
                <h4>📋 Recent applications</h4>
                ${recentApps.length ? recentApps.map(a => `
                    <div class="dashboard-item">
                        <div>
                            <strong>${escapeHtml(a.internshipTitle)}</strong>
                            <p style="font-size:.85rem;color:var(--muted);">${escapeHtml(a.company)}</p>
                        </div>
                        <span class="status-badge ${a.status}">${getStatusLabel(a.status)}</span>
                    </div>
                `).join('') : '<p style="color:var(--muted);">No applications yet</p>'}
                ${applications.length > 3 ? `<a onclick="showProfileTab('applications')" style="color:var(--primary);font-size:.85rem;cursor:pointer;display:inline-block;margin-top:8px;">View all (${applications.length}) →</a>` : ''}
            </div>
            <div class="dashboard-section">
                <h4>📚 Active courses</h4>
                ${recentCourses.length ? recentCourses.map(c => `
                    <div class="dashboard-item">
                        <div>
                            <strong>${escapeHtml(c.title)}</strong>
                            <p style="font-size:.85rem;color:var(--muted);">Progress: ${c.progress||0}%</p>
                        </div>
                        <div class="progress-bar" style="width:60px;height:6px;">
                            <div style="width:${c.progress||0}%;height:100%;background:var(--primary);border-radius:3px;"></div>
                        </div>
                    </div>
                `).join('') : '<p style="color:var(--muted);">No active courses</p>'}
            </div>
        </div>`;
}

// ==================== PORTFOLIO ====================
function openAddProjectModal(existingProjectOrId) {
    let existingProject = null;
    if (typeof existingProjectOrId === 'number')
        existingProject = studentPortfolio.projects.find(p => p.id === existingProjectOrId) || null;
    else if (existingProjectOrId && typeof existingProjectOrId === 'object')
        existingProject = existingProjectOrId;
    const isEdit = !!existingProject;
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header">
                <h2>${isEdit ? 'Edit' : 'Add New'} Project</h2>
                <p>${isEdit ? 'Update your project details' : 'Showcase your work and skills'}</p>
            </div>
            <form onsubmit="saveProject(event, ${isEdit ? existingProject.id : 'null'})">
                <div class="form-group">
                    <label>Project Title *</label>
                    <input type="text" id="projectTitle" class="form-control" value="${isEdit ? escapeHtml(existingProject.title) : ''}" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="projectCategory" class="form-control">
                        <option value="">— Select category —</option>
                        ${['Web Development', 'Mobile App', 'AI/ML', 'Data Science', 'Backend', 'DevOps', 'UI/UX Design', 'Game Dev', 'Other'].map(c =>
                            `<option value="${c}" ${isEdit && existingProject.category===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="projectDesc" class="form-control" rows="4" placeholder="Describe your project...">${isEdit ? escapeHtml(existingProject.description||'') : ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Project Link (GitHub / Live Demo)</label>
                    <input type="url" id="projectLink" class="form-control" placeholder="https://github.com/username/repo" value="${isEdit ? escapeHtml(existingProject.link||'') : ''}">
                </div>
                <div class="form-group">
                    <label>Technologies (comma separated)</label>
                    <input type="text" id="projectTech" class="form-control" placeholder="React, Node.js, MongoDB" value="${isEdit ? (existingProject.technologies||[]).join(', ') : ''}">
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;">
                        <input type="checkbox" id="projectFeatured" ${isEdit && existingProject.featured?'checked':''}>
                        <span>⭐ Feature this project (appears on top)</span>
                    </label>
                </div>
                <div style="display:flex;gap:1rem;margin-top:2rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Add'} Project</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function saveProject(event, projectId) {
    event.preventDefault();
    const titleInput = document.getElementById('projectTitle');
    if (!titleInput?.value.trim()) { showNotification('Project title is required', 'warning'); return; }
    
    const projectData = {
        title: titleInput.value.trim(),
        category: document.getElementById('projectCategory')?.value || '',
        description: document.getElementById('projectDesc')?.value.trim() || '',
        link: document.getElementById('projectLink')?.value.trim() || '',
        technologies: (document.getElementById('projectTech')?.value||'').split(',').map(t=>t.trim()).filter(Boolean),
        featured: document.getElementById('projectFeatured')?.checked || false
    };
    
    if (!studentPortfolio) studentPortfolio = { projects: [], skills: [], certificates: [] };
    if (!studentPortfolio.projects) studentPortfolio.projects = [];
    
    if (projectId === null || projectId === 'null' || projectId === undefined) {
        studentPortfolio.projects.push({ id: Date.now(), ...projectData, createdAt: new Date().toISOString() });
        showNotification('Project added successfully! 🎉', 'success');
    } else {
        const idx = studentPortfolio.projects.findIndex(p => p.id === parseInt(projectId));
        if (idx !== -1) { 
            studentPortfolio.projects[idx] = { ...studentPortfolio.projects[idx], ...projectData, updatedAt: new Date().toISOString() }; 
            showNotification('Project updated successfully! ✅', 'success');
        }
    }
    
    try {
        const portfolioRef = window.doc(window.db, 'portfolios', currentUser.id);
        await window.setDoc(portfolioRef, { projects: studentPortfolio.projects, skills: studentPortfolio.skills || [], certificates: studentPortfolio.certificates || [] }, { merge: true });
    } catch (err) {
        console.error('Error saving portfolio:', err);
    }
    
    localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
    event.target.closest('.modal').remove();
    loadPortfolio();
    loadStudentDashboard();
}

async function loadPortfolio() {
    const container = document.getElementById('portfolioContent');
    if (!container) return;
    container.style.display = 'block';
    
    try {
        const docSnap = await window.getDoc(window.doc(window.db, 'portfolios', currentUser.id));
        if (docSnap.exists()) studentPortfolio = docSnap.data();
    } catch (err) {
        console.error('Error loading portfolio:', err);
    }
    
    if (!studentPortfolio) studentPortfolio = { projects: [], skills: [], certificates: [] };
    if (!studentPortfolio.projects) studentPortfolio.projects = [];
    
    const projects = [...studentPortfolio.projects].sort((a,b) => (b.featured?1:0)-(a.featured?1:0));
    const categories = [...new Set(projects.map(p=>p.category).filter(Boolean))];
    
    const techCount = {};
    projects.forEach(p => { p.technologies?.forEach(t => { techCount[t] = (techCount[t] || 0) + 1; }); });
    const topTechs = Object.entries(techCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
    
    container.innerHTML = `
        <div class="portfolio-wrap">
            <div class="portfolio-header">
                <div>
                    <h2> My Portfolio</h2>
                    <p>${projects.length} project(s) • ${studentPortfolio.skills?.length || 0} skills</p>
                </div>
                <button class="portfolio-add-btn" id="addProjectBtn"><i class="fas fa-plus"></i> Add Project</button>
            </div>
            ${topTechs.length ? `
            <div class="portfolio-tech-cloud">
                <p> Most used technologies</p>
                <div class="portfolio-tech-tags">
                    ${topTechs.map(([tech, count]) => `
                        <span class="portfolio-tech-tag">${escapeHtml(tech)} <span>${count}</span></span>
                    `).join('')}
                </div>
            </div>` : ''}
            ${categories.length ? `
            <div class="portfolio-filters">
                <button class="portfolio-filter-btn active" data-cat="">All</button>
                ${categories.map(c => `<button class="portfolio-filter-btn" data-cat="${c}">${escapeHtml(c)}</button>`).join('')}
            </div>` : ''}
            ${projects.length === 0 ? `
            <div class="portfolio-empty">
                <i class="fas fa-folder-open"></i>
                <h3>No projects yet</h3>
                <p>Click "Add Project" to showcase your work and stand out to employers!</p>
            </div>` : `
            <div class="projects-grid">
                ${projects.map(p => `
                <div class="project-card" data-cat="${p.category||''}">
                    <div class="project-card-header">
                        <div class="project-card-title">
                            <h3>${escapeHtml(p.title)}</h3>
                            ${p.category ? `<span class="project-card-category">${escapeHtml(p.category)}</span>` : ''}
                            ${p.featured ? '<span class="project-card-featured">⭐ Featured</span>' : ''}
                        </div>
                        <div class="project-card-actions">
                            <button class="btn-edit edit-project-btn" data-id="${p.id}">✏️ Edit</button>
                            <button class="btn-delete delete-project-btn" data-id="${p.id}">🗑️ Delete</button>
                        </div>
                    </div>
                    <p class="project-card-desc">${escapeHtml(p.description||'No description provided.')}</p>
                    ${p.technologies?.length ? `
                        <div class="project-card-tech">
                            ${p.technologies.map(t => `<span>${escapeHtml(t)}</span>`).join('')}
                        </div>` : ''}
                    ${p.link ? `
                        <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="project-card-link">
                            <i class="fas fa-external-link-alt"></i> View Project
                        </a>` : ''}
                    <p class="project-card-date">Added ${formatDate(p.createdAt)}</p>
                </div>`).join('')}
            </div>`}
        </div>`;
    
    document.getElementById('addProjectBtn')?.addEventListener('click', () => openAddProjectModal());
    document.querySelectorAll('.edit-project-btn').forEach(btn => {
        btn.addEventListener('click', e => openAddProjectModal(parseInt(e.currentTarget.dataset.id)));
    });
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', e => deleteProject(parseInt(e.currentTarget.dataset.id)));
    });
    document.querySelectorAll('.portfolio-filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.portfolio-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const cat = e.currentTarget.dataset.cat;
            document.querySelectorAll('.project-card').forEach(card => {
                card.style.display = (!cat || card.dataset.cat === cat) ? 'block' : 'none';
            });
        });
    });
}

function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    studentPortfolio.projects = studentPortfolio.projects.filter(p => p.id !== projectId);
    localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
    showNotification('Project deleted', 'info');
    loadPortfolio();
    loadStudentDashboard();
}

// ==================== SKILLS & CERTIFICATES ====================
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SKILL_CATEGORIES = ['Programming Languages', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Cloud', 'Design', 'Soft Skills', 'Languages', 'Other'];
const LEVEL_COLORS = { 
    Beginner: '#d1fae5,#065f46', 
    Intermediate: '#dbeafe,#1e40af', 
    Advanced: '#ede9fe,#5b21b6', 
    Expert: '#fef3c7,#92400e' 
};

function loadSkills() {
    const container = document.getElementById('skillsContent');
    if (!container) return;
    if (!studentPortfolio) studentPortfolio = { projects: [], skills: [], certificates: [] };
    if (!studentPortfolio.skills) studentPortfolio.skills = [];
    if (!studentPortfolio.certificates) studentPortfolio.certificates = [];
    
    const skillsByCategory = {};
    studentPortfolio.skills.forEach(s => {
        const skill = typeof s === 'string' ? { name: s, level: 'Intermediate', category: 'Other' } : s;
        const cat = skill.category || 'Other';
        if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
        skillsByCategory[cat].push(skill);
    });

    container.innerHTML = `
        <div class="skills-wrap">
            <div class="skills-header skills-header--primary">
                <div><h2> Skills & Expertise</h2><p>${studentPortfolio.skills.length} skills • ${studentPortfolio.certificates.length} certificates</p></div>
                <button class="skills-add-btn skills-add-btn--primary" onclick="openAddSkillModal()"><i class="fas fa-plus"></i> Add Skill</button>
            </div>
            ${Object.keys(skillsByCategory).length === 0 ? `
            <div class="skills-empty">
                <i class="fas fa-star"></i><h3>No skills yet</h3><p>Add your technical and soft skills to attract employers!</p>
            </div>` :
            Object.entries(skillsByCategory).map(([cat, skills]) => `
            <div class="skills-category">
                <h4>${escapeHtml(cat)}</h4>
                <div class="skills-tags">
                    ${skills.map(s => {
                        const [bg, fg] = (LEVEL_COLORS[s.level] || LEVEL_COLORS['Intermediate']).split(',');
                        return `<div class="skill-tag" style="background:${bg}">
                            <span class="skill-tag-name" style="color:${fg}">${escapeHtml(s.name)}</span>
                            <span class="skill-tag-level" style="color:${fg}">${s.level||'Intermediate'}</span>
                            <button class="skill-tag-remove" style="color:${fg}" onclick="deleteSkill('${escapeHtml(s.name)}')">✕</button>
                        </div>`;
                    }).join('')}
                </div>
            </div>`).join('')}
        </div>
        <div class="skills-wrap">
            <div class="skills-header skills-header--purple">
                <div><h2> Certificates</h2><p>Showcase your achievements and credentials</p></div>
                <button class="skills-add-btn skills-add-btn--purple" onclick="openAddCertificateModal()"><i class="fas fa-plus"></i> Add Certificate</button>
            </div>
            ${studentPortfolio.certificates.length === 0 ? `
            <div class="skills-empty">
                <i class="fas fa-award"></i><h3>No certificates yet</h3><p>Add your certifications to boost your profile!</p>
            </div>` : `
            <div class="certificates-grid">
                ${studentPortfolio.certificates.map(cert => `
                <div class="certificate-card">
                    <div class="certificate-card-header">
                        <i class="fas fa-award"></i>
                        <button class="remove-btn" onclick="deleteCertificate(${cert.id})">✕</button>
                    </div>
                    <h4>${escapeHtml(cert.name)}</h4>
                    <p class="issuer">${escapeHtml(cert.issuer||'')}</p>
                    ${cert.date ? `<p class="date"><i class="fas fa-calendar"></i> ${formatDate(cert.date)}</p>` : ''}
                    ${cert.url ? `<a href="${escapeHtml(cert.url)}" target="_blank" class="link"><i class="fas fa-external-link-alt"></i> View Certificate</a>` : ''}
                </div>`).join('')}
            </div>`}
        </div>`;
}

function openAddSkillModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>Add Skill</h2><p>Showcase your technical and soft skills</p></div>
            <form onsubmit="saveSkill(event)">
                <div class="form-group"><label>Skill Name *</label><input type="text" id="skillName" class="form-control" placeholder="e.g., React, Python" required></div>
                <div class="form-group"><label>Category</label>
                    <select id="skillCategory" class="form-control">
                        ${SKILL_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Proficiency Level</label>
                    <div id="skillLevelBtns" style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${SKILL_LEVELS.map((l, i) => `
                        <label class="skill-level-lbl" data-level="${l}" style="cursor:pointer;padding:7px 16px;border:2px solid ${i===1?'#1a56db':'#e5e7eb'};border-radius:20px;background:${i===1?'#eff6ff':'#fff'};font-size:.88rem;">
                            <input type="radio" name="skillLevel" value="${l}" ${i===1?'checked':''} style="display:none;">${l}
                        </label>`).join('')}
                    </div>
                </div>
                <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;"><i class="fas fa-plus"></i> Add Skill</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('input[name="skillLevel"]').forEach(radio => {
        radio.addEventListener('change', () => {
            modal.querySelectorAll('.skill-level-lbl').forEach(lbl => { lbl.style.borderColor='#e5e7eb'; lbl.style.background='#fff'; });
            radio.closest('label').style.borderColor='#1a56db';
            radio.closest('label').style.background='#eff6ff';
        });
    });
}

async function saveSkill(event) {
    event.preventDefault();
    const name = document.getElementById('skillName')?.value.trim();
    if (!name) return;
    const category = document.getElementById('skillCategory')?.value || 'Other';
    const level = document.querySelector('input[name="skillLevel"]:checked')?.value || 'Intermediate';
    if (!studentPortfolio.skills) studentPortfolio.skills = [];
    const exists = studentPortfolio.skills.findIndex(s => (typeof s==='string'?s:s.name).toLowerCase() === name.toLowerCase());
    if (exists !== -1) { showNotification('Skill already exists', 'warning'); return; }
    studentPortfolio.skills.push({ name, category, level });
    
    await window.setDoc(window.doc(window.db, 'portfolios', currentUser.id), { skills: studentPortfolio.skills }, { merge: true });
    localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
    showNotification('Skill added! ⭐', 'success');
    event.target.closest('.modal').remove();
    loadSkills();
}

function deleteSkill(skillName) {
    if (!studentPortfolio?.skills) return;
    const idx = studentPortfolio.skills.findIndex(s => (typeof s==='string'?s:s.name) === skillName);
    if (idx !== -1) {
        studentPortfolio.skills.splice(idx, 1);
        localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
        showNotification('Skill removed', 'info');
        loadSkills();
    }
}

function openAddCertificateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>Add Certificate</h2><p>Add your achievements and credentials</p></div>
            <form onsubmit="saveCertificate(event)">
                <div class="form-group"><label>Certificate Name *</label><input type="text" id="certName" class="form-control" placeholder="e.g., AWS Solutions Architect" required></div>
                <div class="form-group"><label>Issuing Organization</label><input type="text" id="certIssuer" class="form-control" placeholder="e.g., Amazon Web Services"></div>
                <div class="form-group"><label>Date Issued</label><input type="date" id="certDate" class="form-control"></div>
                <div class="form-group"><label>Certificate URL (optional)</label><input type="url" id="certUrl" class="form-control" placeholder="https://..."></div>
                <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;background:#7c3aed;border-color:#7c3aed;"><i class="fas fa-award"></i> Add Certificate</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function saveCertificate(event) {
    event.preventDefault();
    const name = document.getElementById('certName')?.value.trim();
    if (!name) return;
    if (!studentPortfolio.certificates) studentPortfolio.certificates = [];
    studentPortfolio.certificates.push({ 
        id: Date.now(), 
        name, 
        issuer: document.getElementById('certIssuer')?.value.trim()||'', 
        date: document.getElementById('certDate')?.value||'', 
        url: document.getElementById('certUrl')?.value.trim()||'', 
        addedAt: new Date().toISOString() 
    });
    
    await window.setDoc(window.doc(window.db, 'portfolios', currentUser.id), { certificates: studentPortfolio.certificates }, { merge: true });
    localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
    showNotification('Certificate added! 🏆', 'success');
    event.target.closest('.modal').remove();
    loadSkills();
}

function deleteCertificate(certId) {
    if (!confirm('Delete this certificate?')) return;
    studentPortfolio.certificates = studentPortfolio.certificates.filter(c => c.id !== certId);
    localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
    showNotification('Certificate removed', 'info');
    loadSkills();
}

// ==================== GITHUB INTEGRATION ====================
function connectGitHub() {
    const username = prompt('Enter your GitHub username:', studentPortfolio.githubProfile || '');
    if (!username) return;
    
    showNotification('Fetching GitHub data...', 'info');
    
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`)
        .then(res => {
            if (!res.ok) throw new Error('User not found or API limit');
            return res.json();
        })
        .then(repos => {
            studentPortfolio.githubProfile = username;
            studentPortfolio.githubRepos = repos.map(repo => ({
                name: repo.name,
                description: repo.description,
                url: repo.html_url,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                updatedAt: repo.updated_at
            }));
            localStorage.setItem(`qadam_portfolio_${currentUser.id}`, JSON.stringify(studentPortfolio));
            showNotification(`Connected to GitHub! Found ${repos.length} repos`, 'success');
            loadPortfolio();
        })
        .catch(err => {
            showNotification(`Error: ${err.message}`, 'error');
        });
}

// ==================== CV FUNCTIONS ====================
function loadCV() {
    const container = document.getElementById('cvContent');
    if (!container) return;
    const cv = studentCV || {};
    
    container.innerHTML = `
        <div class="cv-wrap">
            <div class="cv-header">
                <div><h2> My Resume</h2><p>Create and manage your professional CV</p></div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-small" onclick="previewCV()"><i class="fas fa-eye"></i> Preview</button>
                    <button class="btn btn-primary btn-small" onclick="saveCV()"><i class="fas fa-save"></i> Save</button>
                </div>
            </div>
            <div class="cv-grid">
                <div>
                    <div class="cv-section">
                        <h4><i class="fas fa-user"></i> Personal Information</h4>
                        <div class="form-group"><label>Full Name</label><input type="text" id="cvFullName" class="form-control" value="${escapeHtml(cv.fullName||currentUser.name||'')}"></div>
                        <div class="form-group"><label>Professional Title</label><input type="text" id="cvTitle" class="form-control" value="${escapeHtml(cv.title||'')}"></div>
                        <div class="form-group"><label>Email</label><input type="email" id="cvEmail" class="form-control" value="${escapeHtml(cv.email||currentUser.email||'')}"></div>
                        <div class="form-group"><label>Phone</label><input type="tel" id="cvPhone" class="form-control" value="${escapeHtml(cv.phone||'')}"></div>
                        <div class="form-group"><label>Location</label><input type="text" id="cvLocation" class="form-control" value="${escapeHtml(cv.location||'')}"></div>
                        <div class="form-group"><label>LinkedIn</label><input type="url" id="cvLinkedIn" class="form-control" value="${escapeHtml(cv.links?.linkedin||'')}"></div>
                        <div class="form-group"><label>GitHub</label><input type="url" id="cvGitHub" class="form-control" value="${escapeHtml(cv.links?.github||'')}"></div>
                    </div>
                    <div class="cv-section">
                        <h4><i class="fas fa-align-left"></i> Professional Summary</h4>
                        <textarea id="cvSummary" class="form-control" rows="5">${escapeHtml(cv.summary||'')}</textarea>
                    </div>
                </div>
                <div>
                    <div class="cv-section">
                        <h4><i class="fas fa-star"></i> Skills</h4>
                        <div id="cvSkillsList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                            ${(cv.skills||[]).map((s,i) => `<span class="cv-skill-tag">${escapeHtml(s)}<i class="fas fa-times" onclick="removeCVSkill(${i})"></i></span>`).join('')}
                        </div>
                        <div class="cv-add-row"><input type="text" id="newSkillInput" class="form-control" placeholder="Add skill"><button class="btn btn-outline" onclick="addCVSkill()">Add</button></div>
                        ${(studentPortfolio?.skills?.length>0) ? `<button class="cv-import-btn" onclick="importSkillsFromPortfolio()"><i class="fas fa-magic"></i> Import from Portfolio</button>` : ''}
                    </div>
                    <div class="cv-section">
                        <div class="cv-section-header">
                            <h4><i class="fas fa-language"></i> Languages</h4>
                            <button class="cv-add-btn--small" onclick="addCVLanguage()">+ Add</button>
                        </div>
                        <div id="cvLanguagesList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                            ${(cv.languages||[]).map((l,i) => `<span class="cv-lang-tag">${escapeHtml(typeof l==='string'?l:l.name)}<i class="fas fa-times" onclick="removeCVLanguage(${i})"></i></span>`).join('')}
                        </div>
                        <div class="cv-add-row"><input type="text" id="newLanguageInput" class="form-control" placeholder="e.g., English (Fluent)"><button class="btn btn-outline" onclick="addCVLanguage()">Add</button></div>
                    </div>
                </div>
            </div>
            <div class="cv-section">
                <div class="cv-section-header">
                    <h4><i class="fas fa-briefcase"></i> Work Experience</h4>
                    <button class="cv-add-btn" onclick="addCVExperience()"><i class="fas fa-plus"></i> Add Experience</button>
                </div>
                <div id="cvExperienceList">
                    ${(cv.experience||[]).length ? (cv.experience||[]).map((exp,i) => renderCVExperienceItem(exp,i)).join('') : '<p style="color:#9ca3af;text-align:center;padding:20px;">No work experience added yet</p>'}
                </div>
            </div>
            <div class="cv-section">
                <div class="cv-section-header">
                    <h4><i class="fas fa-graduation-cap"></i> Education</h4>
                    <button class="cv-add-btn" onclick="addCVEducation()"><i class="fas fa-plus"></i> Add Education</button>
                </div>
                <div id="cvEducationList">
                    ${(cv.education||[]).length ? (cv.education||[]).map((edu,i) => renderCVEducationItem(edu,i)).join('') : '<p style="color:#9ca3af;text-align:center;padding:20px;">No education added yet</p>'}
                </div>
            </div>
            <button class="btn btn-primary cv-save-btn" onclick="saveCV()"><i class="fas fa-save"></i> Save All Changes</button>
        </div>`;
}

function renderCVExperienceItem(exp, idx) {
    return `<div class="cv-exp-item">
        <div class="cv-exp-header">
            <div>
                <strong class="cv-exp-title">${escapeHtml(exp.title||'Position')}</strong>
                <p class="cv-exp-company">${escapeHtml(exp.company||'')}${exp.location?` · ${escapeHtml(exp.location)}`:''}</p>
                <p class="cv-exp-date">${escapeHtml(exp.startDate||'')}${exp.endDate?` — ${escapeHtml(exp.endDate)}`:exp.current?' — Present':''}</p>
            </div>
            <div class="cv-actions">
                <button class="btn-edit" onclick="editCVExperience(${idx})">✏️</button>
                <button class="btn-delete" onclick="deleteCVExperience(${idx})">🗑️</button>
            </div>
        </div>
        ${exp.description?`<p class="cv-exp-desc">${escapeHtml(exp.description)}</p>`:''}
    </div>`;
}

function renderCVEducationItem(edu, idx) {
    return `<div class="cv-edu-item">
        <div class="cv-edu-header">
            <div>
                <strong class="cv-exp-title">${escapeHtml(edu.degree||'Degree')}</strong>
                <p class="cv-exp-company">${escapeHtml(edu.institution||'')}</p>
                <p class="cv-exp-date">${escapeHtml(String(edu.startYear||''))}${edu.endYear?` — ${escapeHtml(String(edu.endYear))}`:''}</p>
            </div>
            <div class="cv-actions">
                <button class="btn-edit" onclick="editCVEducation(${idx})">✏️</button>
                <button class="btn-delete" onclick="deleteCVEducation(${idx})">🗑️</button>
            </div>
        </div>
    </div>`;
}

function addCVSkill() {
    const input = document.getElementById('newSkillInput');
    const skill = input?.value.trim();
    if (!skill) return;
    if (!studentCV.skills) studentCV.skills = [];
    if (!studentCV.skills.includes(skill)) { 
        studentCV.skills.push(skill); 
        input.value = ''; 
        loadCV(); 
        showNotification('Skill added to CV', 'success');
    } else showNotification('Skill already in CV', 'warning');
}

function removeCVSkill(index) { studentCV.skills.splice(index, 1); loadCV(); }

function addCVLanguage() {
    const input = document.getElementById('newLanguageInput');
    const lang = input?.value.trim();
    if (!lang) return;
    if (!studentCV.languages) studentCV.languages = [];
    studentCV.languages.push(lang); 
    input.value = ''; 
    loadCV();
    showNotification('Language added', 'success');
}

function removeCVLanguage(index) { studentCV.languages.splice(index, 1); loadCV(); }

function importSkillsFromPortfolio() {
    if (!studentPortfolio?.skills?.length) {
        showNotification('No skills in portfolio to import', 'warning');
        return;
    }
    if (!studentCV.skills) studentCV.skills = [];
    let added = 0;
    studentPortfolio.skills.forEach(s => {
        const name = typeof s==='string'?s:s.name;
        if (!studentCV.skills.includes(name)) { studentCV.skills.push(name); added++; }
    });
    if (added > 0) { showNotification(`Imported ${added} skill(s)!`, 'success'); loadCV(); }
    else showNotification('All portfolio skills already in CV', 'info');
}

async function saveCV() {
    studentCV = { 
        ...studentCV,
        fullName: document.getElementById('cvFullName')?.value || currentUser.name || '',
        title: document.getElementById('cvTitle')?.value || '',
        email: document.getElementById('cvEmail')?.value || currentUser.email || '',
        phone: document.getElementById('cvPhone')?.value || '',
        location: document.getElementById('cvLocation')?.value || '',
        summary: document.getElementById('cvSummary')?.value || '',
        links: { linkedin: document.getElementById('cvLinkedIn')?.value || '', github: document.getElementById('cvGitHub')?.value || '' },
        skills: studentCV?.skills || [],
        languages: studentCV?.languages || [],
        experience: studentCV?.experience || [],
        education: studentCV?.education || []
    };
    
    await window.setDoc(window.doc(window.db, 'studentCVs', currentUser.id), studentCV);
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    showNotification('Resume saved successfully! ✅', 'success');
}

function previewCV() {
    const cv = studentCV;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div style="padding:2rem;max-height:80vh;overflow-y:auto;">
                <div style="border-bottom:3px solid #1a56db;padding-bottom:1.5rem;margin-bottom:1.5rem;">
                    <h1 style="margin:0;font-size:2rem;color:#111827;">${escapeHtml(cv.fullName||currentUser.name||'')}</h1>
                    ${cv.title?`<h2 style="margin:4px 0 12px;color:#1a56db;font-size:1.1rem;">${escapeHtml(cv.title)}</h2>`:''}
                    <div style="display:flex;flex-wrap:wrap;gap:1rem;color:#4b5563;font-size:.9rem;">
                        ${cv.email?`<span><i class="fas fa-envelope" style="color:#1a56db;margin-right:4px;"></i>${escapeHtml(cv.email)}</span>`:''}
                        ${cv.phone?`<span><i class="fas fa-phone" style="color:#1a56db;margin-right:4px;"></i>${escapeHtml(cv.phone)}</span>`:''}
                        ${cv.location?`<span><i class="fas fa-map-marker-alt" style="color:#1a56db;margin-right:4px;"></i>${escapeHtml(cv.location)}</span>`:''}
                    </div>
                </div>
                ${cv.summary?`<div style="margin-bottom:1.5rem;"><h3 style="color:#1a56db;text-transform:uppercase;font-size:1rem;margin-bottom:8px;">Summary</h3><p>${escapeHtml(cv.summary)}</p></div>`:''}
                ${cv.skills?.length?`<div style="margin-bottom:1.5rem;"><h3 style="color:#1a56db;text-transform:uppercase;font-size:1rem;margin-bottom:10px;">Skills</h3><div style="display:flex;flex-wrap:wrap;gap:8px;">${cv.skills.map(s=>`<span class="cv-skill-tag">${escapeHtml(s)}</span>`).join('')}</div></div>`:''}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ==================== CV TEMPLATES ====================
const CV_TEMPLATES = [
    { id:'modern', name:'Modern CV', description:'Clean, contemporary design', features:['Sidebar layout','Modern fonts'], image:'📊' },
    { id:'classic', name:'Classic CV', description:'Traditional, ATS-friendly', features:['Traditional layout','ATS compatible'], image:'📋' },
    { id:'creative', name:'Creative CV', description:'For designers & creatives', features:['Visual elements','Portfolio'], image:'🎨' },
    { id:'technical', name:'Technical CV', description:'For developers & engineers', features:['Code showcase','GitHub integration'], image:'⚙️' }
];

const BEST_CV_EXAMPLES = [
    { id:1, name:'Aidos Kairbekov', position:'Senior Frontend Developer', company:'Kaspi.kz', skills:['React','TypeScript','Next.js'], rating:4.9, downloads:2543, views:15420, description:'Outstanding CV that landed a job at Kaspi.kz.', highlights:['Strong projects','Clean design'], image:'https://i.pravatar.cc/150?img=1' },
    { id:2, name:'Diana Sagintayeva', position:'QA Engineer', company:'Chocofamily', skills:['Testing','Automation','SQL'], rating:4.8, downloads:1876, views:12340, description:'Effective CV with certifications.', highlights:['Test examples','Certifications'], image:'https://i.pravatar.cc/150?img=47' }
];

function loadCVExamples() {
    const container = document.getElementById('cvExamplesContent');
    if (!container) return;
    container.innerHTML = `<div class="cv-examples-grid">${BEST_CV_EXAMPLES.map(cv=>`
        <div class="cv-example-card">
            <div class="cv-example-hero">
                <img src="${cv.image}" alt="${cv.name}">
                <h3>${escapeHtml(cv.name)}</h3>
                <p>${escapeHtml(cv.position)} @ ${escapeHtml(cv.company)}</p>
            </div>
            <div class="cv-example-body">
                <div class="cv-example-stats">
                    <div class="cv-example-stat"><div class="cv-example-stat-val" style="color:var(--primary);">${cv.rating}</div><div class="cv-example-stat-lbl">Rating</div></div>
                    <div class="cv-example-stat"><div class="cv-example-stat-val" style="color:var(--success);">${cv.downloads}</div><div class="cv-example-stat-lbl">Downloads</div></div>
                    <div class="cv-example-stat"><div class="cv-example-stat-val" style="color:var(--warning);">${cv.views}</div><div class="cv-example-stat-lbl">Views</div></div>
                </div>
                <p class="cv-example-desc">${escapeHtml(cv.description)}</p>
                <div class="cv-example-tags">${cv.skills.map(s=>`<span class="cv-example-tag">${escapeHtml(s)}</span>`).join('')}</div>
                <button class="btn btn-primary btn-block" onclick="viewCVExample(${cv.id})"><i class="fas fa-eye"></i> View Full CV</button>
            </div>
        </div>`).join('')}</div>`;
}

function viewCVExample(exampleId) {
    const cv = BEST_CV_EXAMPLES.find(c => c.id === exampleId);
    if (!cv) return;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>${escapeHtml(cv.name)}</h2><p>${escapeHtml(cv.position)} @ ${escapeHtml(cv.company)}</p></div>
            <div style="padding:1.5rem;max-height:70vh;overflow-y:auto;">
                <h3>Skills</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">${cv.skills.map(s=>`<span class="cv-example-tag">${escapeHtml(s)}</span>`).join('')}</div>
                <h3 style="margin-top:1.5rem;">Why this CV is effective</h3>
                <ul>${cv.highlights.map(h=>`<li>${h}</li>`).join('')}</ul>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function loadCVTemplates() {
    const container = document.getElementById('cvTemplatesContent');
    if (!container) return;
    container.innerHTML = `<div class="cv-templates-grid">${CV_TEMPLATES.map(t=>`
        <div class="cv-template-card">
            <div class="cv-template-hero"><div class="emoji">${t.image}</div><h3>${t.name}</h3><p>${t.description}</p></div>
            <div class="cv-template-body">
                <div class="cv-template-features">${t.features.map(f=>`<div class="cv-template-feature"><i class="fas fa-check-circle"></i><span>${f}</span></div>`).join('')}</div>
                <button class="btn btn-primary btn-block" onclick="applyTemplate('${t.id}')">Use This Template</button>
            </div>
        </div>`).join('')}</div>`;
}

function applyTemplate(templateId) {
    const template = CV_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    studentCV.template = templateId;
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    showNotification(`Template "${template.name}" applied! 🎨`, 'success');
    loadCV();
}

function uploadCVFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showNotification('File must be less than 5MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!studentCV.uploadedCVs) studentCV.uploadedCVs = [];
            studentCV.uploadedCVs.push({ id: Date.now(), name: file.name, type: 'upload', uploadedDate: new Date().toISOString(), size: (file.size/1024).toFixed(2)+' KB', fileData: event.target.result });
            localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
            showNotification(`CV "${file.name}" uploaded! ✅`, 'success');
            loadCV();
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}

function importCVFromURL() {
    const url = prompt('Paste your CV URL:', '');
    if (!url) return;
    try { new URL(url); } catch (e) { showNotification('Invalid URL', 'error'); return; }
    if (!studentCV.importedCVs) studentCV.importedCVs = [];
    studentCV.importedCVs.push({ id: Date.now(), url, type: 'url', importedDate: new Date().toISOString() });
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    showNotification('CV URL imported! 🔗', 'success');
    loadCV();
}

function loadCVWithTemplates() {
    loadCV();
    const cvContent = document.getElementById('cvContent');
    if (cvContent) {
        cvContent.innerHTML += `
            <div class="cv-templates-section">
                <h3>📚 CV Examples & Templates</h3>
                <div class="cv-templates-actions">
                    <button class="btn btn-outline btn-block" onclick="loadCVTemplates()"><i class="fas fa-palette"></i> Templates</button>
                    <button class="btn btn-outline btn-block" onclick="loadCVExamples()"><i class="fas fa-star"></i> Best Examples</button>
                    <button class="btn btn-outline btn-block" onclick="uploadCVFile()"><i class="fas fa-upload"></i> Upload CV</button>
                    <button class="btn btn-outline btn-block" onclick="importCVFromURL()"><i class="fas fa-link"></i> Import from URL</button>
                </div>
                <div id="cvTemplatesContent"></div>
                <div id="cvExamplesContent"></div>
            </div>`;
    }
}

window.loadCVExamples = loadCVExamples;
window.viewCVExample = viewCVExample;
window.loadCVTemplates = loadCVTemplates;
window.applyTemplate = applyTemplate;
window.uploadCVFile = uploadCVFile;
window.importCVFromURL = importCVFromURL;

// ==================== CV MODALS ====================
function _expModal(exp, idx) {
    const isEdit = exp !== null;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>${isEdit?'Edit':'Add'} Experience</h2></div>
            <form onsubmit="saveCVExperience(event,${isEdit?idx:'null'})">
                <div class="form-group"><label>Job Title *</label><input type="text" id="expTitle" class="form-control" value="${isEdit?escapeHtml(exp.title):''}" required></div>
                <div class="form-group"><label>Company *</label><input type="text" id="expCompany" class="form-control" value="${isEdit?escapeHtml(exp.company):''}" required></div>
                <div class="form-group"><label>Location</label><input type="text" id="expLocation" class="form-control" value="${isEdit?escapeHtml(exp.location||''):''}"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div class="form-group"><label>Start Date</label><input type="month" id="expStart" class="form-control" value="${isEdit?exp.startDate||'':''}"></div>
                    <div class="form-group"><label>End Date</label><input type="month" id="expEnd" class="form-control" value="${isEdit?exp.endDate||'':''}"></div>
                </div>
                <div class="form-group"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="expCurrent" ${isEdit&&exp.current?'checked':''}> Currently working here</label></div>
                <div class="form-group"><label>Description</label><textarea id="expDesc" class="form-control" rows="3">${isEdit?escapeHtml(exp.description||''):''}</textarea></div>
                <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">${isEdit?'Update':'Add'}</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function addCVExperience() { _expModal(null, null); }
function editCVExperience(idx) { _expModal(studentCV.experience[idx], idx); }

function saveCVExperience(event, editIdx) {
    event.preventDefault();
    const entry = { 
        title: document.getElementById('expTitle').value.trim(), 
        company: document.getElementById('expCompany').value.trim(), 
        location: document.getElementById('expLocation')?.value.trim()||'', 
        startDate: document.getElementById('expStart')?.value||'', 
        endDate: document.getElementById('expEnd')?.value||'', 
        current: document.getElementById('expCurrent')?.checked||false, 
        description: document.getElementById('expDesc')?.value.trim()||'' 
    };
    if (!studentCV.experience) studentCV.experience = [];
    if (editIdx !== null && editIdx !== 'null') studentCV.experience[parseInt(editIdx)] = entry;
    else studentCV.experience.push(entry);
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    showNotification('Experience saved!', 'success');
    event.target.closest('.modal').remove();
    loadCV();
}

function deleteCVExperience(idx) {
    if (!confirm('Delete this experience?')) return;
    studentCV.experience.splice(idx, 1);
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    loadCV();
}

function _eduModal(edu, idx) {
    const isEdit = edu !== null;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            <div class="modal-header"><h2>${isEdit?'Edit':'Add'} Education</h2></div>
            <form onsubmit="saveCVEducation(event,${isEdit?idx:'null'})">
                <div class="form-group"><label>Degree *</label><input type="text" id="eduDegree" class="form-control" value="${isEdit?escapeHtml(edu.degree):''}" required></div>
                <div class="form-group"><label>Institution *</label><input type="text" id="eduInstitution" class="form-control" value="${isEdit?escapeHtml(edu.institution):''}" required></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div class="form-group"><label>Start Year</label><input type="number" id="eduStart" class="form-control" value="${isEdit?edu.startYear||'':''}"></div>
                    <div class="form-group"><label>End Year</label><input type="number" id="eduEnd" class="form-control" value="${isEdit?edu.endYear||'':''}"></div>
                </div>
                <div class="form-group"><label>GPA</label><input type="text" id="eduGpa" class="form-control" value="${isEdit?escapeHtml(edu.gpa||''):''}"></div>
                <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">${isEdit?'Update':'Add'}</button>
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function addCVEducation() { _eduModal(null, null); }
function editCVEducation(idx) { _eduModal(studentCV.education[idx], idx); }

function saveCVEducation(event, editIdx) {
    event.preventDefault();
    const entry = { 
        degree: document.getElementById('eduDegree').value.trim(), 
        institution: document.getElementById('eduInstitution').value.trim(), 
        startYear: document.getElementById('eduStart')?.value||'', 
        endYear: document.getElementById('eduEnd')?.value||'', 
        gpa: document.getElementById('eduGpa')?.value.trim()||'' 
    };
    if (!studentCV.education) studentCV.education = [];
    if (editIdx !== null && editIdx !== 'null') studentCV.education[parseInt(editIdx)] = entry;
    else studentCV.education.push(entry);
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    showNotification('Education saved!', 'success');
    event.target.closest('.modal').remove();
    loadCV();
}

function deleteCVEducation(idx) {
    if (!confirm('Delete this education entry?')) return;
    studentCV.education.splice(idx, 1);
    localStorage.setItem(`qadam_cv_${currentUser.id}`, JSON.stringify(studentCV));
    loadCV();
}

// ==================== PROFILE SETTINGS ====================
function loadProfileSettings() {
    const container = document.getElementById('settingsTab');
    if (!container) return;
    const avatarUrl = currentUser.avatarUrl || '';
    let roleFields = currentUser.role === 'employer' ? `
        <div class="form-group"><label>Company Name</label><input type="text" id="profileCompanyName" class="form-control" value="${escapeHtml(currentUser.companyName||'')}"></div>
        <div class="form-group"><label>Description</label><textarea id="profileCompanyDesc" class="form-control" rows="2">${escapeHtml(currentUser.companyDesc||'')}</textarea></div>
        <div class="form-group"><label>Website</label><input type="url" id="profileCompanyWebsite" class="form-control" value="${escapeHtml(currentUser.website||'')}"></div>
        <div class="form-group"><label>Location</label><input type="text" id="profileCompanyLocation" class="form-control" value="${escapeHtml(currentUser.location||'')}"></div>
    ` : `
        <div class="form-group"><label>University</label><input type="text" id="profileUniversity" class="form-control" value="${escapeHtml(currentUser.university||'')}"></div>
        <div class="form-group"><label>Field of Study</label><input type="text" id="profileMajor" class="form-control" value="${escapeHtml(currentUser.major||'')}"></div>
        <div class="form-group"><label>Graduation Year</label><input type="number" id="profileGradYear" class="form-control" value="${escapeHtml(String(currentUser.gradYear||''))}"></div>
    `;
    
    container.innerHTML = `
        <div class="settings-wrap">
            <h3>Edit Profile</h3>
            <div class="settings-avatar-row">
                <div class="settings-avatar-preview" id="settingsAvatarPreview">${avatarUrl?`<img src="${escapeHtml(avatarUrl)}">`:getInitials(currentUser.name)}</div>
                <div>
                    <p>Profile Photo</p>
                    <p class="hint">Upload a photo or keep your initials</p>
                    <div class="settings-avatar-actions">
                        <label class="settings-upload-btn"><i class="fas fa-upload"></i> Upload<input type="file" id="avatarUpload" accept="image/*" style="display:none;" onchange="previewAvatar(event)"></label>
                        ${avatarUrl?`<button class="settings-remove-btn" onclick="removeAvatar()">Remove</button>`:''}
                    </div>
                </div>
            </div>
            <form onsubmit="updateProfile(event)" class="settings-form">
                <div class="settings-form-grid">
                    <div class="form-group"><label>Full Name *</label><input type="text" id="profileName" class="form-control" value="${escapeHtml(currentUser.name||'')}" required></div>
                    <div class="form-group"><label>Email *</label><input type="email" id="profileEmail" class="form-control" value="${escapeHtml(currentUser.email||'')}" required></div>
                    <div class="form-group"><label>Phone</label><input type="tel" id="profilePhone" class="form-control" value="${escapeHtml(currentUser.phone||'')}"></div>
                    <div class="form-group"><label>City</label><input type="text" id="profileCity" class="form-control" value="${escapeHtml(currentUser.city||'')}"></div>
                </div>
                ${roleFields}
                <div class="form-group"><label>About Me</label><textarea id="profileBio" class="form-control" rows="4">${escapeHtml(currentUser.bio||'')}</textarea></div>
                <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:.5rem;"><i class="fas fa-save"></i> Save Changes</button>
            </form>
        </div>`;
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ✅ Проверяем размер файла (максимум 1MB для base64)
    if (file.size > 1024 * 1024) {
        showNotification('Photo must be less than 1MB', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const url = e.target.result;
        
        // Показываем фото в UI
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
        
        // Сохраняем временно
        currentUser.avatarUrl = url;
        currentUser._pendingAvatar = url; // ✅ Метка что фото нужно сохранить
        
        // Обновляем аватарки в UI
        updateAllAvatars(url);
        
        // ✅ Сразу сохраняем в Firestore
        try {
            await window.updateDoc(
                window.doc(window.db, 'users', currentUser.id), 
                { avatarUrl: url }
            );
            localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
            console.log('✅ Avatar saved to Firestore');
        } catch (err) {
            console.error('Error saving avatar:', err);
            // Сохраняем хотя бы в localStorage
            localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
        }
    };
    reader.readAsDataURL(file);
}

// ✅ Новая функция для обновления всех аватарок
function updateAllAvatars(url) {
    const mainAvatar = document.getElementById('profileAvatar');
    if (mainAvatar) mainAvatar.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) { 
        userAvatar.style.backgroundImage = `url(${url})`; 
        userAvatar.style.backgroundSize = 'cover'; 
        userAvatar.textContent = ''; 
    }
}

// ✅ Исправленное удаление аватара
async function removeAvatar() {
    currentUser.avatarUrl = null;
    currentUser._pendingAvatar = null;
    
    try {
        await window.updateDoc(
            window.doc(window.db, 'users', currentUser.id), 
            { avatarUrl: null }
        );
    } catch (err) {
        console.error('Error removing avatar:', err);
    }
    
    localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) { 
        userAvatar.style.backgroundImage = ''; 
        userAvatar.textContent = getInitials(currentUser.name); 
    }
    
    const mainAvatar = document.getElementById('profileAvatar');
    if (mainAvatar) mainAvatar.textContent = getInitials(currentUser.name);
    
    // Перезагружаем настройки
    if (typeof loadProfileSettings === 'function') loadProfileSettings();
}

function removeAvatar() {
    currentUser.avatarUrl = null;
    localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) { userAvatar.style.backgroundImage=''; userAvatar.textContent=getInitials(currentUser.name); }
    loadProfileSettings();
}

// ==================== MY COURSES & APPLICATIONS ====================
function loadMyCourses() {
    const container = document.getElementById('myCoursesContent');
    if (!container) return;
    if (enrolledCourses.length === 0) { 
        container.innerHTML = '<div class="empty-state"><i class="fas fa-graduation-cap"></i><p>You are not enrolled in any courses</p><button class="btn btn-primary" onclick="showSection(\'courses\')">Find courses</button></div>'; 
        return; 
    }
    container.innerHTML = `<h3> My Courses (${enrolledCourses.length})</h3><div class="courses-grid">${enrolledCourses.map(c => `
        <div class="course-card">
            <div class="course-image"><span class="course-badge ${c.type||'free'}">${c.type==='paid'?'Paid':'Free'}</span></div>
            <div class="course-content">
                <h3>${escapeHtml(c.title)}</h3>
                <p class="course-provider">${escapeHtml(c.provider)}</p>
                <div class="course-progress-row"><span>Progress</span><span>${c.progress||0}%</span></div>
                <div class="course-progress-bar"><div class="course-progress-bar-fill" style="width:${c.progress||0}%;"></div></div>
                <!-- ✅ ИСПРАВЛЕНО: ID в кавычках -->
                <button class="btn btn-primary btn-block" onclick="continueCourse('${c.id}')">
                    Continue Learning →
                </button>
            </div>
        </div>
    `).join('')}</div>`;
}

function loadApplications() {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    if (applications.length === 0) { 
        container.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>You have no applications</p><button class="btn btn-primary" onclick="showSection(\'internships\')">Find internships</button></div>'; 
        return; 
    }
    container.innerHTML = `
        <h3> My Applications (${applications.length})</h3>
        <div class="applications-list">
            ${applications.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(a=>`
                <div class="application-item">
                    <div class="application-status ${a.status}"></div>
                    <div class="application-content">
                        <h4>${escapeHtml(a.internshipTitle)}</h4>
                        <p>${escapeHtml(a.company)}</p>
                        <p class="application-date"><i class="fas fa-calendar"></i> Applied: ${formatDate(a.date)}</p>
                    </div>
                    <span class="status-badge ${a.status}">${getStatusLabel(a.status)}</span>
                </div>
            `).join('')}
        </div>`;
}

async function loadSavedItems() {
    const container = document.getElementById('savedInternships');
    if (!container) return;
    const allInternships = await window.fetchAllInternshipsFromFirestore();
    const savedList = allInternships.filter(i => savedItems.includes(i.id));
    if (savedList.length === 0) { 
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bookmark"></i><p>No saved internships</p><button class="btn btn-primary" onclick="showSection(\'internships\')">Find internships</button></div>'; 
        return; 
    }
    container.innerHTML = `
        <h3> Saved Internships (${savedList.length})</h3>
        <div class="internships-grid">
            ${savedList.map(i=>`
                <div class="internship-card" onclick="openInternshipDetail('${i.id}')">
                    <div class="internship-header"><h3>${escapeHtml(i.title)}</h3><div class="company"><i class="fas fa-building"></i><span>${escapeHtml(i.company)}</span></div></div>
                    <div class="internship-body">
                        <div class="internship-meta"><span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(i.location)}</span><span class="salary">${escapeHtml(i.salary)}</span></div>
                        <div class="internship-footer"><button class="btn-save saved" onclick="event.stopPropagation();toggleSave('${i.id}')"><i class="fas fa-star"></i></button></div>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function continueCourse(courseId) { 
    const c = enrolledCourses.find(c=>c.id===courseId); 
    if (c) showNotification(`Continuing "${c.title}"...`, 'info'); 
}

async function toggleSave(id) {
    if (!currentUser) { showNotification('Please sign in','warning'); openModal('login'); return; }
    try {
        const q = window.query(window.collection(window.db, 'savedInternships'), window.where('userId', '==', currentUser.id), window.where('internshipId', '==', id));
        const snapshot = await window.getDocs(q);
        if (snapshot.empty) {
            await window.addDoc(window.collection(window.db, 'savedInternships'), { userId: currentUser.id, internshipId: id, savedAt: new Date().toISOString() });
            savedItems.push(id);
            showNotification('Added to saved ✨', 'success');
        } else {
            snapshot.forEach(async (doc) => { await window.deleteDoc(doc.ref); });
            savedItems = savedItems.filter(item => item !== id);
            showNotification('Removed from saved', 'info');
        }
        localStorage.setItem(`qadam_saved_${currentUser.id}`, JSON.stringify(savedItems));
        if (!document.getElementById('internshipsSection').classList.contains('hidden')) loadInternships();
        renderPopularInternships();
        if (document.getElementById('savedInternships')) loadSavedItems();
        if (document.getElementById('profileSavedCount')) document.getElementById('profileSavedCount').textContent = savedItems.length;
    } catch (err) { console.error('Error toggling save:', err); showNotification('Error saving internship', 'error'); }
}

async function applyForInternship(id) {
    if (!currentUser) { showNotification('Please sign in', 'warning'); openModal('login'); return; }
    if (currentUser.role === 'employer') { showNotification('Employers cannot apply', 'warning'); return; }
    try {
        const internDoc = await window.getDoc(window.doc(window.db, 'internships', id));
        if (!internDoc.exists()) { showNotification('Internship not found', 'error'); return; }
        const internship = internDoc.data();
        const existingQuery = window.query(window.collection(window.db, 'applications'), window.where('studentId', '==', currentUser.id), window.where('internshipId', '==', id));
        const existingSnap = await window.getDocs(existingQuery);
        if (!existingSnap.empty) { showNotification('Already applied', 'info'); return; }
        await window.addDoc(window.collection(window.db, 'applications'), { studentId: currentUser.id, studentName: currentUser.name, studentEmail: currentUser.email, internshipId: id, internshipTitle: internship.title, company: internship.company, date: new Date().toISOString(), status: 'pending' });
        applications.push({ id: Date.now(), internshipId: id, internshipTitle: internship.title, company: internship.company, studentName: currentUser.name, studentEmail: currentUser.email, date: new Date().toISOString(), status: 'pending' });
        localStorage.setItem(`qadam_apps_${currentUser.id}`, JSON.stringify(applications));
        closeModal('internship');
        showNotification('Application sent successfully! 🎉', 'success');
    } catch (err) { console.error('Error applying:', err); showNotification('Error: ' + err.message, 'error'); }
}

async function enrollCourse(id) {
    if (!currentUser) { showNotification('Please sign in','warning'); openModal('login'); return; }
    try {
        const q = window.query(window.collection(window.db, 'enrollments'), window.where('userId', '==', currentUser.id), window.where('courseId', '==', id));
        const snapshot = await window.getDocs(q);
        if (!snapshot.empty) { showNotification('Already enrolled', 'info'); return; }
        const courseSnap = await window.getDoc(window.doc(window.db, 'courses', id));
        if (!courseSnap.exists()) return;
        const course = courseSnap.data();
        await window.addDoc(window.collection(window.db, 'enrollments'), { userId: currentUser.id, courseId: id, title: course.title, provider: course.provider, enrolledDate: new Date().toISOString(), progress: 0 });
        enrolledCourses.push({ id: id, ...course, enrolledDate: new Date().toISOString(), progress: 0 });
        localStorage.setItem(`qadam_enrolled_${currentUser.id}`, JSON.stringify(enrolledCourses));
        closeModal('course');
        showNotification('Successfully enrolled! 🎓', 'success');
    } catch (err) { console.error('Error enrolling:', err); showNotification('Error enrolling in course', 'error'); }
}

function registerForEvent(id) { 
    if (!currentUser) { showNotification('Please sign in','warning'); openModal('login'); return; } 
    closeModal('event'); 
    showNotification('You are registered for the event! 📧', 'success'); 
}

function connectWithMentor(id) { 
    if (!currentUser) { showNotification('Please sign in','warning'); openModal('login'); return; } 
    const m = data.mentors.find(x=>x.id===id); 
    showNotification(`Connection request sent to ${m.name} 📩`, 'success'); 
}

function loadStudentMessages() {
    const container = document.getElementById('messagesContent');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>Messages moved to <strong>Chats</strong> tab.</p><button class="btn btn-primary" onclick="showProfileTab(\'messages\')">Go to Messages</button></div>';
}

// ==================== CHAT FUNCTIONS ====================
async function openChatWithStudent(studentId, studentName, studentEmail) {
    if (!currentUser || currentUser.role !== 'employer') { showNotification('Only employers can message students', 'warning'); return; }
    try {
        const existingChat = await findExistingChat(currentUser.id, studentId);
        if (existingChat) { openChatModal(existingChat.id, existingChat); }
        else {
            const chatData = { participants: [currentUser.id, studentId], studentId, studentName, studentEmail, employerId: currentUser.id, employerName: currentUser.name, companyName: currentUser.companyName || 'Company', lastMessage: '', lastMessageTime: new Date().toISOString(), createdAt: new Date().toISOString() };
            const docRef = await window.addDoc(window.collection(window.db, 'chats'), chatData);
            openChatModal(docRef.id, chatData);
        }
    } catch (err) { console.error('Error opening chat:', err); showNotification('Error opening chat', 'error'); }
}

async function openChatWithEmployer(employerId, employerName, companyName) {
    if (!currentUser || currentUser.role !== 'student') { showNotification('Only students can message employers', 'warning'); return; }
    try {
        const existingChat = await findExistingChat(employerId, currentUser.id);
        if (existingChat) { openChatModal(existingChat.id, existingChat); }
        else {
            const chatData = { participants: [currentUser.id, employerId], studentId: currentUser.id, studentName: currentUser.name, studentEmail: currentUser.email, employerId, employerName, companyName, lastMessage: '', lastMessageTime: new Date().toISOString(), createdAt: new Date().toISOString() };
            const docRef = await window.addDoc(window.collection(window.db, 'chats'), chatData);
            openChatModal(docRef.id, chatData);
        }
    } catch (err) { console.error('Error opening chat:', err); showNotification('Error opening chat', 'error'); }
}

async function findExistingChat(user1Id, user2Id) {
    const q = window.query(window.collection(window.db, 'chats'), window.where('participants', 'array-contains', user1Id));
    const snapshot = await window.getDocs(q);
    for (const doc of snapshot.docs) { const chat = doc.data(); if (chat.participants.includes(user2Id)) return { id: doc.id, ...chat }; }
    return null;
}

async function openChatModal(chatId, chatData) {
    const existingModal = document.querySelector('[id^="chatModal-"]');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'chatModal-' + chatId;
    modal.innerHTML = `
        <div class="chat-modal-content">
            <button class="modal-close" onclick="closeChatModal('${chatId}')"><i class="fas fa-times"></i></button>
            <div class="chat-modal-header">
                <h2>${currentUser.role === 'employer' ? escapeHtml(chatData.studentName) : escapeHtml(chatData.companyName || chatData.employerName)}</h2>
                <p>${currentUser.role === 'employer' ? escapeHtml(chatData.studentEmail) : escapeHtml(chatData.employerName)}</p>
            </div>
            <div class="chat-messages" id="chatMessages-${chatId}"><p class="chat-loading">Loading messages...</p></div>
            <div class="chat-input-row">
                <input type="text" id="chatInput-${chatId}" class="form-control" placeholder="Type a message..." onkeypress="if(event.key==='Enter')sendMessage('${chatId}')">
                <button class="btn btn-primary" onclick="sendMessage('${chatId}')"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    loadMessages(chatId);
}

async function loadMessages(chatId) {
    const container = document.getElementById('chatMessages-' + chatId);
    if (!container) return;
    try {
        const q = window.query(window.collection(window.db, 'chats', chatId, 'messages'), window.orderBy('timestamp', 'asc'));
        const snapshot = await window.getDocs(q);
        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        if (messages.length === 0) { container.innerHTML = '<p class="chat-loading">No messages yet. Say hello! 👋</p>'; }
        else {
            container.innerHTML = messages.map(msg => `
                <div class="chat-msg ${msg.senderId === currentUser.id ? 'chat-msg--sent' : 'chat-msg--received'}">
                    <div class="chat-msg-bubble ${msg.senderId === currentUser.id ? 'chat-msg-bubble--sent' : 'chat-msg-bubble--received'}">
                        <p class="chat-msg-text">${escapeHtml(msg.text)}</p>
                        <p class="chat-msg-time">${new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            `).join('');
        }
        container.scrollTop = container.scrollHeight;
    } catch (err) { console.error('Error loading messages:', err); container.innerHTML = '<p class="chat-error">Error loading messages</p>'; }
}

async function sendMessage(chatId) {
    const input = document.getElementById('chatInput-' + chatId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    try {
        await window.addDoc(window.collection(window.db, 'chats', chatId, 'messages'), { senderId: currentUser.id, senderName: currentUser.name, senderRole: currentUser.role, text, timestamp: new Date().toISOString() });
        await window.updateDoc(window.doc(window.db, 'chats', chatId), { lastMessage: text, lastMessageTime: new Date().toISOString() });
        input.value = '';
        loadMessages(chatId);
    } catch (err) { console.error('Error sending message:', err); showNotification('Error sending message', 'error'); }
}

function closeChatModal(chatId) {
    const modal = document.getElementById('chatModal-' + chatId);
    if (modal) modal.remove();
}

async function loadMyChats() {
    const container = document.getElementById('chatsContent');
    if (!container) return;
    try {
        const q = window.query(window.collection(window.db, 'chats'), window.where('participants', 'array-contains', currentUser.id));
        const snapshot = await window.getDocs(q);
        const chats = [];
        snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
        chats.sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
        if (chats.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No messages yet</p></div>'; return; }
        container.innerHTML = `<h3>Messages (${chats.length})</h3><div class="chats-list">${chats.map(c => `
            <div class="chat-item" onclick="openExistingChat('${c.id}')">
                <div class="chat-item-header"><strong>${currentUser.role === 'employer' ? escapeHtml(c.studentName) : escapeHtml(c.companyName)}</strong><small>${formatDate(c.lastMessageTime || c.createdAt)}</small></div>
                <p class="chat-item-preview">${c.lastMessage ? escapeHtml(c.lastMessage.substring(0, 60)) + '...' : 'No messages'}</p>
            </div>`).join('')}</div>`;
    } catch (err) { container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading messages</p></div>'; }
}

async function openExistingChat(chatId) {
    try {
        const chatSnap = await window.getDoc(window.doc(window.db, 'chats', chatId));
        if (chatSnap.exists()) { openChatModal(chatId, { id: chatId, ...chatSnap.data() }); }
    } catch (err) { console.error('Error opening chat:', err); showNotification('Error opening chat', 'error'); }
}

// ==================== GLOBAL EXPORTS ====================
window.openAddProjectModal = openAddProjectModal;
window.saveProject = saveProject;
window.loadPortfolio = loadPortfolio;
window.deleteProject = deleteProject;
window.loadSkills = loadSkills;
window.openAddSkillModal = openAddSkillModal;
window.saveSkill = saveSkill;
window.deleteSkill = deleteSkill;
window.openAddCertificateModal = openAddCertificateModal;
window.saveCertificate = saveCertificate;
window.deleteCertificate = deleteCertificate;
window.connectGitHub = connectGitHub;
window.loadStudentDashboard = loadStudentDashboard;
window.loadMyCourses = loadMyCourses;
window.loadApplications = loadApplications;
window.loadSavedItems = loadSavedItems;
window.loadCV = loadCV;
window.saveCV = saveCV;
window.previewCV = previewCV;
window.loadProfileSettings = loadProfileSettings;
window.previewAvatar = previewAvatar;
window.removeAvatar = removeAvatar;
window.addCVSkill = addCVSkill;
window.removeCVSkill = removeCVSkill;
window.addCVLanguage = addCVLanguage;
window.removeCVLanguage = removeCVLanguage;
window.importSkillsFromPortfolio = importSkillsFromPortfolio;
window.addCVExperience = addCVExperience;
window.saveCVExperience = saveCVExperience;
window.editCVExperience = editCVExperience;
window.deleteCVExperience = deleteCVExperience;
window.addCVEducation = addCVEducation;
window.saveCVEducation = saveCVEducation;
window.editCVEducation = editCVEducation;
window.deleteCVEducation = deleteCVEducation;
window.continueCourse = continueCourse;
window.toggleSave = toggleSave;
window.applyForInternship = applyForInternship;
window.enrollCourse = enrollCourse;
window.registerForEvent = registerForEvent;
window.connectWithMentor = connectWithMentor;
window.loadStudentMessages = loadStudentMessages;
window.openChatWithStudent = openChatWithStudent;
window.openChatWithEmployer = openChatWithEmployer;
window.openChatModal = openChatModal;
window.sendMessage = sendMessage;
window.closeChatModal = closeChatModal;
window.loadMessages = loadMessages;
window.findExistingChat = findExistingChat;
window.loadMyChats = loadMyChats;
window.openExistingChat = openExistingChat;