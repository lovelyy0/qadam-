// ==================== PUBLIC PROFILE ====================

// Открыть публичный профиль
async function openPublicProfile(userId) {
    if (!userId) return;
    
    // Если это свой профиль — открываем обычный
    if (currentUser && currentUser.id === userId) {
        showSection('profile');
        return;
    }
    
    try {
        const userDoc = await window.getDoc(window.doc(window.db, 'users', userId));
        if (!userDoc.exists()) {
            showNotification('User not found', 'error');
            return;
        }
        
        const userData = userDoc.data();
        const levelData = LEVELS[userData.level] || LEVELS.beginner;
        
        // Загружаем связи
        const connectionsDoc = await window.getDoc(window.doc(window.db, 'connections', userId));
        const connections = connectionsDoc.exists() ? connectionsDoc.data() : {
            followers: [], following: [], connections: []
        };
        
        // Проверяем статус связи с текущим пользователем
        let connectionStatus = 'none'; // none | pending | connected | following
        if (currentUser) {
            const myConnectionsDoc = await window.getDoc(
                window.doc(window.db, 'connections', currentUser.id)
            );
            const myConnections = myConnectionsDoc.exists() ? myConnectionsDoc.data() : {};
            
            if (myConnections.connections?.includes(userId)) {
                connectionStatus = 'connected';
            } else if (myConnections.pendingSent?.includes(userId)) {
                connectionStatus = 'pending';
            } else if (myConnections.following?.includes(userId)) {
                connectionStatus = 'following';
            }
        }
        
        // Сохраняем данные
        window._viewedProfile = { userId, userData, connections, connectionStatus };
        
        // Показываем секцию
        showSection('publicProfile');
        
        // Заполняем сайдбар
        renderPublicProfileSidebar(userData, levelData, connections, connectionStatus);
        
        // Загружаем посты
        loadPublicProfilePosts(userId);
        
    } catch (err) {
        console.error('Error loading public profile:', err);
        showNotification('Error loading profile', 'error');
    }
}

// Рендер сайдбара
function renderPublicProfileSidebar(userData, levelData, connections, connectionStatus) {
    const sidebar = document.getElementById('publicProfileSidebar');
    const avatarUrl = userData.avatarUrl || '';
    
    sidebar.innerHTML = `
        <div class="profile-avatar-large" id="publicProfileAvatar">
            ${avatarUrl 
                ? `<img src="${escapeHtml(avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` 
                : getInitials(userData.name)}
        </div>
        <h2>${levelData.icon} ${escapeHtml(userData.name)}</h2>
        <p style="color:${levelData.color};font-weight:600;">${levelData.name}</p>
        <p style="color:var(--muted);">${escapeHtml(userData.bio || 'No bio yet')}</p>
        
        ${userData.role === 'employer' ? `
            <p style="margin-top:0.5rem;"><i class="fas fa-building"></i> ${escapeHtml(userData.companyName || '')}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(userData.location || '')}</p>
        ` : `
            <p style="margin-top:0.5rem;"><i class="fas fa-graduation-cap"></i> ${escapeHtml(userData.university || 'No university')}</p>
            <p><i class="fas fa-book"></i> ${escapeHtml(userData.major || '')}</p>
        `}
        
        <div class="profile-stats" style="margin-top:1rem;">
            <div class="profile-stat">
                <div class="stat-value">${(connections.followers || []).length}</div>
                <div class="stat-label">Followers</div>
            </div>
            <div class="profile-stat">
                <div class="stat-value">${(connections.connections || []).length}</div>
                <div class="stat-label">Connections</div>
            </div>
            <div class="profile-stat">
                <div class="stat-value">${userData.rating || 0}</div>
                <div class="stat-label">Points</div>
            </div>
        </div>
        
        <div style="margin-top:1rem;">
            ${renderConnectionButton(userData.uid || userId, connectionStatus)}
        </div>
        
        ${currentUser ? `
            <button class="btn btn-outline btn-block" style="margin-top:0.5rem;" 
                    onclick="openChatWithUser('${userData.uid || userId}', '${escapeHtml(userData.name)}')">
                <i class="fas fa-comment"></i> Message
            </button>
        ` : ''}
    `;
    
    // Обновляем заголовок
    document.getElementById('publicProfileName').textContent = userData.name;
    document.getElementById('publicProfileLevel').textContent = 
        `${levelData.icon} ${levelData.name} · ${userData.role === 'employer' ? 'Employer' : 'Student'}`;
}

// Кнопка связи
function renderConnectionButton(userId, status) {
    if (!currentUser) {
        return `<button class="btn btn-primary btn-block" onclick="openModal('login')">
            <i class="fas fa-sign-in-alt"></i> Sign in to connect
        </button>`;
    }
    
    switch (status) {
        case 'connected':
            return `<button class="btn btn-outline btn-block" onclick="removeConnection('${userId}')">
                <i class="fas fa-check-circle"></i> Connected
            </button>`;
        case 'pending':
            return `<button class="btn btn-ghost btn-block" disabled>
                <i class="fas fa-clock"></i> Request sent
            </button>`;
        case 'following':
            return `<button class="btn btn-primary btn-block" onclick="sendConnectionRequest('${userId}')">
                <i class="fas fa-user-plus"></i> Connect
            </button>`;
        default:
            return `<button class="btn btn-primary btn-block" onclick="sendConnectionRequest('${userId}')">
                <i class="fas fa-user-plus"></i> Connect
            </button>`;
    }
}

// ==================== CONNECTIONS SYSTEM ====================

// Отправить запрос на связь
async function sendConnectionRequest(userId) {
    if (!currentUser) return;
    if (currentUser.id === userId) return;
    
    try {
        const myRef = window.doc(window.db, 'connections', currentUser.id);
        const theirRef = window.doc(window.db, 'connections', userId);
        
        // Мои данные
        const mySnap = await window.getDoc(myRef);
        const myData = mySnap.exists() ? mySnap.data() : {
            followers: [], following: [], connections: [], pendingSent: [], pendingReceived: []
        };
        
        // Их данные
        const theirSnap = await window.getDoc(theirRef);
        const theirData = theirSnap.exists() ? theirSnap.data() : {
            followers: [], following: [], connections: [], pendingSent: [], pendingReceived: []
        };
        
        // Добавляем в отправленные
        if (!myData.pendingSent) myData.pendingSent = [];
        if (!myData.pendingSent.includes(userId)) {
            myData.pendingSent.push(userId);
        }
        
        // Добавляем в полученные у них
        if (!theirData.pendingReceived) theirData.pendingReceived = [];
        if (!theirData.pendingReceived.includes(currentUser.id)) {
            theirData.pendingReceived.push(currentUser.id);
        }
        
        await Promise.all([
            window.setDoc(myRef, myData),
            window.setDoc(theirRef, theirData)
        ]);
        
        showNotification('Connection request sent! 📩', 'success');
        
        // Обновляем статус
        window._viewedProfile.connectionStatus = 'pending';
        const sidebar = document.getElementById('publicProfileSidebar');
        const btnContainer = sidebar.querySelector('.btn-block');
        if (btnContainer) {
            btnContainer.outerHTML = renderConnectionButton(userId, 'pending');
        }
        
        // Добавляем в активность
        await addActivity(currentUser.id, 'connection_request', {
            targetId: userId,
            targetName: window._viewedProfile.userData.name
        });
        
    } catch (err) {
        console.error('Error sending connection request:', err);
        showNotification('Error sending request', 'error');
    }
}

// Принять запрос на связь
async function acceptConnectionRequest(userId) {
    if (!currentUser) return;
    
    try {
        const myRef = window.doc(window.db, 'connections', currentUser.id);
        const theirRef = window.doc(window.db, 'connections', userId);
        
        const [mySnap, theirSnap] = await Promise.all([
            window.getDoc(myRef),
            window.getDoc(theirRef)
        ]);
        
        const myData = mySnap.exists() ? mySnap.data() : {};
        const theirData = theirSnap.exists() ? theirSnap.data() : {};
        
        // Убираем из pending
        myData.pendingReceived = (myData.pendingReceived || []).filter(id => id !== userId);
        theirData.pendingSent = (theirData.pendingSent || []).filter(id => id !== currentUser.id);
        
        // Добавляем в connections (взаимная связь)
        if (!myData.connections) myData.connections = [];
        if (!theirData.connections) theirData.connections = [];
        
        if (!myData.connections.includes(userId)) myData.connections.push(userId);
        if (!theirData.connections.includes(currentUser.id)) theirData.connections.push(currentUser.id);
        
        await Promise.all([
            window.setDoc(myRef, myData),
            window.setDoc(theirRef, theirData)
        ]);
        
        showNotification('You are now connected! 🤝', 'success');
        
        // Начисляем очки
        await addRating(currentUser.id, 5, 'new connection');
        await addRating(userId, 5, 'new connection');
        
    } catch (err) {
        console.error('Error accepting connection:', err);
    }
}

// Удалить связь
async function removeConnection(userId) {
    if (!confirm('Remove this connection?')) return;
    
    try {
        const myRef = window.doc(window.db, 'connections', currentUser.id);
        const theirRef = window.doc(window.db, 'connections', userId);
        
        const [mySnap, theirSnap] = await Promise.all([
            window.getDoc(myRef),
            window.getDoc(theirRef)
        ]);
        
        const myData = mySnap.exists() ? mySnap.data() : {};
        const theirData = theirSnap.exists() ? theirSnap.data() : {};
        
        myData.connections = (myData.connections || []).filter(id => id !== userId);
        theirData.connections = (theirData.connections || []).filter(id => id !== currentUser.id);
        
        await Promise.all([
            window.setDoc(myRef, myData),
            window.setDoc(theirRef, theirData)
        ]);
        
        showNotification('Connection removed', 'info');
        
        window._viewedProfile.connectionStatus = 'none';
        const sidebar = document.getElementById('publicProfileSidebar');
        const btnContainer = sidebar.querySelector('.btn-block');
        if (btnContainer) {
            btnContainer.outerHTML = renderConnectionButton(userId, 'none');
        }
        
    } catch (err) {
        console.error('Error removing connection:', err);
    }
}

// ==================== ACTIONS FROM BLOG ====================

// Клик по автору поста
function openAuthorProfile(authorId) {
    openPublicProfile(authorId);
}

// Отправить сообщение пользователю
async function openChatWithUser(userId, userName) {
    if (!currentUser) {
        showNotification('Please sign in', 'warning');
        return;
    }
    
    if (currentUser.role === 'employer') {
        await openChatWithStudent(userId, userName, '');
    } else {
        await openChatWithEmployer(userId, userName, '');
    }
}

// ==================== ACTIVITY FEED ====================

// Добавить активность
async function addActivity(userId, type, data = {}) {
    try {
        await window.addDoc(window.collection(window.db, 'activities'), {
            userId,
            type,
            data,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error adding activity:', err);
    }
}

// Загрузить активность пользователя
async function loadPublicActivity(userId) {
    const container = document.getElementById('publicActivityContent');
    if (!container) return;
    
    try {
        const q = window.query(
            window.collection(window.db, 'activities'),
            window.where('userId', '==', userId),
            window.orderBy('createdAt', 'desc'),
            window.limit(20)
        );
        const snapshot = await window.getDocs(q);
        const activities = [];
        snapshot.forEach(doc => activities.push({ id: doc.id, ...doc.data() }));
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No activity yet</p></div>';
            return;
        }
        
        container.innerHTML = activities.map(a => `
            <div class="activity-item" style="padding:1rem;border-bottom:1px solid var(--border);display:flex;gap:1rem;align-items:center;">
                <div style="font-size:1.5rem;">
                    ${getActivityIcon(a.type)}
                </div>
                <div>
                    <p style="margin:0;">${getActivityText(a)}</p>
                    <p style="margin:0;font-size:.8rem;color:var(--muted);">${formatDate(a.createdAt)}</p>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Error loading activity:', err);
        container.innerHTML = '<div class="empty-state"><p>Error loading activity</p></div>';
    }
}

function getActivityIcon(type) {
    const icons = {
        'post_created': '📝',
        'connection_request': '🤝',
        'course_completed': '🎓',
        'certificate_earned': '🏆',
        'level_up': '⬆️'
    };
    return icons[type] || '📌';
}

function getActivityText(activity) {
    const data = activity.data || {};
    switch (activity.type) {
        case 'post_created': return 'Published a new post';
        case 'connection_request': return `Connected with ${data.targetName || 'someone'}`;
        case 'course_completed': return `Completed course: ${data.courseName || ''}`;
        case 'certificate_earned': return `Earned certificate: ${data.certName || ''}`;
        case 'level_up': return `Leveled up to ${data.level || ''}!`;
        default: return 'Did something';
    }
}

// ==================== ЗАГРУЗКА ПОСТОВ ПРОФИЛЯ ====================
async function loadPublicProfilePosts(userId) {
    const container = document.getElementById('publicPostsContent');
    if (!container) return;
    
    try {
        const q = window.query(
            window.collection(window.db, 'blogPosts'),
            window.where('authorId', '==', userId),
            window.orderBy('createdAt', 'desc')
        );
        const snapshot = await window.getDocs(q);
        const posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
            return;
        }
        
        container.innerHTML = `<div class="blog-posts-grid">
            ${posts.map(post => createBlogPostCard(post)).join('')}
        </div>`;
        
    } catch (err) {
        console.error('Error loading profile posts:', err);
    }
}

// ==================== ВКЛАДКИ ПУБЛИЧНОГО ПРОФИЛЯ ====================
function showPublicTab(tab) {
    document.querySelectorAll('#publicProfileTabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('[id^="public"][id$="Tab"]').forEach(t => t.classList.remove('active'));
    
    const activeTab = document.getElementById(`public${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
    if (activeTab) activeTab.classList.add('active');
    
    const activeBtn = document.querySelector(`#publicProfileTabs [onclick*="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const userId = window._viewedProfile?.userId;
    if (!userId) return;
    
    switch (tab) {
        case 'about':
            loadPublicAbout(userId);
            break;
        case 'posts':
            loadPublicProfilePosts(userId);
            break;
        case 'portfolio':
            loadPublicPortfolio(userId);
            break;
        case 'activity':
            loadPublicActivity(userId);
            break;
    }
}

async function loadPublicAbout(userId) {
    const container = document.getElementById('publicAboutContent');
    if (!container) return;
    
    const userData = window._viewedProfile?.userData;
    if (!userData) return;
    
    const stats = userData.stats || {};
    
    container.innerHTML = `
        <div class="dashboard-section">
            <h4>About</h4>
            <p>${escapeHtml(userData.bio || 'No bio yet')}</p>
        </div>
        <div class="stats-grid" style="margin-top:1rem;">
            <div class="stat-card stat-card--purple"><h3>${stats.postsCount || 0}</h3><p>Posts</p></div>
            <div class="stat-card stat-card--pink"><h3>${stats.totalLikes || 0}</h3><p>Likes received</p></div>
            <div class="stat-card stat-card--blue"><h3>${stats.totalComments || 0}</h3><p>Comments</p></div>
            <div class="stat-card stat-card--green"><h3>${userData.rating || 0}</h3><p>Points</p></div>
        </div>
    `;
}

async function loadPublicPortfolio(userId) {
    const container = document.getElementById('publicPortfolioContent');
    if (!container) return;
    
    try {
        const portfolioSnap = await window.getDoc(window.doc(window.db, 'portfolios', userId));
        if (!portfolioSnap.exists()) {
            container.innerHTML = '<div class="empty-state"><p>No portfolio yet</p></div>';
            return;
        }
        
        const portfolio = portfolioSnap.data();
        
        container.innerHTML = `
            <h3>Skills (${(portfolio.skills || []).length})</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.5rem;">
                ${(portfolio.skills || []).map(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    return `<span class="cv-skill-tag">${escapeHtml(name)}</span>`;
                }).join('')}
            </div>
            
            <h3>Projects (${(portfolio.projects || []).length})</h3>
            ${(portfolio.projects || []).length === 0 ? '<p style="color:var(--muted);">No projects</p>' : 
                (portfolio.projects || []).map(p => `
                    <div class="project-card" style="margin-bottom:1rem;">
                        <h4>${escapeHtml(p.title)}</h4>
                        <p>${escapeHtml(p.description || '')}</p>
                        ${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank">View Project →</a>` : ''}
                    </div>
                `).join('')
            }
        `;
    } catch (err) {
        console.error('Error loading portfolio:', err);
    }
}

// ==================== ПОИСК ПОЛЬЗОВАТЕЛЕЙ ====================
async function searchUsers(query) {
    if (!query || query.trim().length < 2) return [];
    
    try {
        const q = window.query(
            window.collection(window.db, 'users'),
            window.where('name', '>=', query.trim()),
            window.where('name', '<=', query.trim() + '\uf8ff')
        );
        const snapshot = await window.getDocs(q);
        const users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        return users;
    } catch (err) {
        console.error('Error searching users:', err);
        return [];
    }
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================

// Обновляем карточку поста с кликабельным автором
// Замени createBlogPostCard:
function createBlogPostCard(post) {
    const liked = post.likes && post.likes.includes(currentUser?.id);
    const levelData = LEVELS[post.authorLevel] || LEVELS.beginner;
    
    return `
        <div class="blog-post-card">
            <div class="blog-post-header" onclick="openBlogPost('${post.id}')">
                <span class="blog-post-category ${post.category || 'other'}">${post.category || 'Other'}</span>
                <h3 class="blog-post-title">${escapeHtml(post.title)}</h3>
            </div>
            <div class="blog-post-body" onclick="openBlogPost('${post.id}')">
                <p class="blog-post-preview">${escapeHtml((post.content || '').substring(0, 120))}...</p>
            </div>
            <div class="blog-post-author" style="padding:0 1.25rem;cursor:pointer;" 
                 onclick="event.stopPropagation();openPublicProfile('${post.authorId}')">
                <div class="blog-post-author-avatar">${getInitials(post.authorName || 'User')}</div>
                <div>
                    <div class="blog-post-author-name">
                        ${levelData.icon} ${escapeHtml(post.authorName || 'Anonymous')}
                    </div>
                    <div class="blog-post-date">${formatDate(post.createdAt)}</div>
                </div>
            </div>
            <div class="blog-post-footer">
                <span class="blog-stat ${liked ? 'liked' : ''}" onclick="event.stopPropagation();toggleBlogLike('${post.id}')">
                    <i class="fas fa-heart"></i> ${(post.likes || []).length}
                </span>
                <span class="blog-stat" onclick="event.stopPropagation();openBlogPost('${post.id}')">
                    <i class="fas fa-comment"></i> ${(post.comments || []).length}
                </span>
            </div>
        </div>
    `;
}

// ==================== ЭКСПОРТ ====================
window.openPublicProfile = openPublicProfile;
window.openAuthorProfile = openAuthorProfile;
window.sendConnectionRequest = sendConnectionRequest;
window.acceptConnectionRequest = acceptConnectionRequest;
window.removeConnection = removeConnection;
window.showPublicTab = showPublicTab;
window.openChatWithUser = openChatWithUser;
window.searchUsers = searchUsers;
window.addActivity = addActivity;