// ==================== ИНИЦИАЛИЗАЦИЯ AUTH STATE ====================
// Ждём пока Firebase инициализируется, затем слушаем изменения сессии
window.addEventListener('load', () => {
    // Небольшая задержка, чтобы Firebase SDK успел подгрузиться из module script
    setTimeout(() => {
        if (!window.auth) {
            console.warn('Firebase Auth not ready yet');
            return;
        }
        // onAuthStateChanged — единственный надёжный способ проверить сессию
        if (!window.onAuthStateChanged) {
                console.error('onAuthStateChanged not available');
                return;
            }
            window.onAuthStateChanged(window.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Пользователь залогинен — загружаем его данные из Firestore
                try {
                    const userDoc = await window.getDoc(window.doc(window.db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        currentUser = { id: firebaseUser.uid, ...userData };
                        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
                        await loadLocalUserData();
                        updateUIForLoggedInUser();
                        updateNavigation();
                    }
                } catch (err) {
                    console.error('Error loading user on auth state change:', err);
                }
            } else {
                // Пользователь вышел или сессия истекла — очищаем стейт
                if (currentUser) {
                    currentUser = null;
                    localStorage.removeItem('qadam_current_user');
                    // Обновляем UI только если уже был залогинен
                    const authButtons = document.getElementById('authButtons');
                    const userMenu = document.getElementById('userMenu');
                    if (authButtons) authButtons.classList.remove('hidden');
                    if (userMenu) userMenu.classList.add('hidden');
                }
            }
        });
    }, 500);
});

// ==================== ПЕРЕКЛЮЧЕНИЕ ПОЛЕЙ КОМПАНИИ ====================
document.addEventListener('DOMContentLoaded', () => {
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', function () {
            const companyFields = document.getElementById('companyFieldsRegister');
            if (this.value === 'employer') {
                companyFields.classList.remove('hidden');
            } else {
                companyFields.classList.add('hidden');
            }
        });
    }
});

// ==================== РЕГИСТРАЦИЯ ====================
async function handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirmPassword').value;
    const role     = document.getElementById('regRole').value;

    if (!name || !email || !password) {
        showNotification('Please fill all fields', 'warning');
        return;
    }
    if (password !== confirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'warning');
        return;
    }

    try {
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        let userData = {
            uid: user.uid,
            name,
            email,
            role,
            createdAt: new Date().toISOString()
        };

        if (role === 'employer') {
            const companyName = document.getElementById('regCompanyName').value.trim();
            const companyDesc = document.getElementById('regCompanyDesc').value.trim();
            const website     = document.getElementById('regCompanyWebsite').value.trim();
            const location    = document.getElementById('regCompanyLocation').value.trim();

            if (!companyName || !companyDesc || !website || !location) {
                showNotification('Please fill all company fields', 'warning');
                // ФИКС: удаляем только что созданного firebase user если данные неполные
                await user.delete();
                return;
            }
            userData.companyName = companyName;
            userData.companyDesc = companyDesc;
            userData.website     = website;
            userData.location    = location;
        }

        await window.setDoc(window.doc(window.db, 'users', user.uid), userData);

        // Для студента создаём пустое портфолио и CV
        if (role === 'student') {
            await window.setDoc(window.doc(window.db, 'portfolios', user.uid), {
                projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null
            });
            await window.setDoc(window.doc(window.db, 'studentCVs', user.uid), {
                fullName: name, email, skills: [], experience: [], education: [], languages: [], links: {}
            });
        }

        currentUser = { id: user.uid, ...userData };
        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));

        updateUIForLoggedInUser();
        updateNavigation();
        closeModal('register');
        showNotification('Registration successful! Welcome! 🎉', 'success');
    } catch (err) {
        console.error(err);
        // Человекочитаемые сообщения об ошибках Firebase Auth
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email':        'Invalid email address',
            'auth/weak-password':        'Password is too weak (min 6 characters)',
            'auth/network-request-failed': 'Network error. Check your connection.'
        };
        showNotification(errorMessages[err.code] || err.message, 'error');
    }
}

// ==================== ВХОД ====================
async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please fill all fields', 'warning');
        return;
    }

    try {
        const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        const userDoc = await window.getDoc(window.doc(window.db, 'users', user.uid));
        if (!userDoc.exists()) throw new Error('User data not found in database');

        const userData = userDoc.data();
        currentUser = { id: user.uid, ...userData };
        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));

        await loadLocalUserData();

        updateUIForLoggedInUser();
        updateNavigation();
        closeModal('login');
        showNotification(`Welcome back, ${currentUser.name}! 👋`, 'success');
    } catch (err) {
        console.error(err);
        const errorMessages = {
            'auth/user-not-found':     'No account found with this email',
            'auth/wrong-password':     'Incorrect password',
            'auth/invalid-email':      'Invalid email address',
            'auth/too-many-requests':  'Too many attempts. Try again later.',
            'auth/network-request-failed': 'Network error. Check your connection.'
        };
        showNotification(errorMessages[err.code] || err.message, 'error');
    }
}

// ==================== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================
// ФИКС: Все вызовы через window.* чтобы не зависеть от порядка загрузки скриптов
async function loadLocalUserData() {
    if (!currentUser) return;
    const userId = currentUser.id;

    // 1. Сохранённые стажировки
    try {
        const savedQ    = window.query(window.collection(window.db, 'savedInternships'), window.where('userId', '==', userId));
        const savedSnap = await window.getDocs(savedQ);
        savedItems = [];
        savedSnap.forEach(doc => savedItems.push(doc.data().internshipId));
    } catch (err) {
        console.error('Error loading saved items:', err);
        savedItems = JSON.parse(localStorage.getItem(`qadam_saved_${userId}`)) || [];
    }
    localStorage.setItem(`qadam_saved_${userId}`, JSON.stringify(savedItems));

    // 2. Заявки студента
    try {
        const appsQ    = window.query(window.collection(window.db, 'applications'), window.where('studentId', '==', userId));
        const appsSnap = await window.getDocs(appsQ);
        applications = [];
        appsSnap.forEach(doc => applications.push({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error('Error loading applications:', err);
        applications = JSON.parse(localStorage.getItem(`qadam_apps_${userId}`)) || [];
    }
    localStorage.setItem(`qadam_apps_${userId}`, JSON.stringify(applications));

    // 3. Данные студента
    if (currentUser.role === 'student') {
        // Портфолио
        try {
            const portfolioSnap = await window.getDoc(window.doc(window.db, 'portfolios', userId));
            studentPortfolio = portfolioSnap.exists()
                ? portfolioSnap.data()
                : { projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: [] };
        } catch (err) {
            console.error('Error loading portfolio:', err);
            studentPortfolio = JSON.parse(localStorage.getItem(`qadam_portfolio_${userId}`)) || {
                projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: []
            };
        }
        // Гарантируем все поля
        ['projects', 'skills', 'certificates', 'education', 'experience', 'githubRepos'].forEach(key => {
            if (!studentPortfolio[key]) studentPortfolio[key] = [];
        });
        localStorage.setItem(`qadam_portfolio_${userId}`, JSON.stringify(studentPortfolio));

        // Зачисления на курсы
        try {
            const enrollQ    = window.query(window.collection(window.db, 'enrollments'), window.where('userId', '==', userId));
            const enrollSnap = await window.getDocs(enrollQ);
            enrolledCourses = [];
            enrollSnap.forEach(doc => enrolledCourses.push({ id: doc.id, ...doc.data() }));
        } catch (err) {
            console.error('Error loading enrollments:', err);
            enrolledCourses = JSON.parse(localStorage.getItem(`qadam_enrolled_${userId}`)) || [];
        }
        localStorage.setItem(`qadam_enrolled_${userId}`, JSON.stringify(enrolledCourses));

        // CV
        try {
            const cvSnap = await window.getDoc(window.doc(window.db, 'studentCVs', userId));
            studentCV = cvSnap.exists()
                ? cvSnap.data()
                : { fullName: currentUser.name, email: currentUser.email, skills: [], experience: [], education: [], languages: [], links: {} };
        } catch (err) {
            console.error('Error loading CV:', err);
            studentCV = JSON.parse(localStorage.getItem(`qadam_cv_${userId}`)) || {
                fullName: currentUser.name, email: currentUser.email,
                skills: [], experience: [], education: [], languages: [], links: {}
            };
        }
        localStorage.setItem(`qadam_cv_${userId}`, JSON.stringify(studentCV));
    }
}

// ==================== UI ПОСЛЕ ЛОГИНА ====================
function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu    = document.getElementById('userMenu');
    const userName    = document.getElementById('userName');
    const userAvatar  = document.getElementById('userAvatar');

    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu)    userMenu.classList.remove('hidden');
    if (userName)    userName.textContent  = currentUser.name;
    if (userAvatar)  userAvatar.textContent = getInitials(currentUser.name);
}

// ==================== ВЫХОД ====================
async function logout() {
    try {
        await window.signOut(window.auth);

        // Очищаем стейт
        currentUser      = null;
        savedItems       = [];
        applications     = [];
        myInternships    = [];
        myCourses        = [];
        myEvents         = [];
        studentPortfolio = null;
        enrolledCourses  = [];
        studentCV        = null;

        localStorage.removeItem('qadam_current_user');

        // Восстанавливаем UI
        document.getElementById('authButtons').classList.remove('hidden');
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('mainNav').innerHTML = `
            <a class="nav__link active" onclick="showSection('home')"><i class="fas fa-home"></i> Home</a>
            <a class="nav__link" onclick="showSection('internships')"><i class="fas fa-briefcase"></i> Internships</a>
            <a class="nav__link" onclick="showSection('courses')"><i class="fas fa-book-open"></i> Courses</a>
            <a class="nav__link" onclick="showSection('events')"><i class="fas fa-calendar-alt"></i> Events</a>
            <a class="nav__link" onclick="showSection('resources')"><i class="fas fa-users"></i> Resources</a>
        `;

        // Удаляем динамически созданные employer-секции
        ['dashboardSection', 'companyInternshipsSection', 'companyCoursesSection', 'companyEventsSection'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        showSection('home');
        showNotification('You have logged out', 'info');
    } catch (err) {
        console.error(err);
        showNotification(err.message, 'error');
    }
}

// ==================== ОБНОВЛЕНИЕ ПРОФИЛЯ ====================
async function updateProfile(e) {
    e.preventDefault();

    const newName  = document.getElementById('profileName')?.value?.trim() || currentUser.name;
    const newPhone = document.getElementById('profilePhone')?.value?.trim() || '';
    const newBio   = document.getElementById('profileBio')?.value?.trim()   || '';

    const updates = { name: newName, phone: newPhone, bio: newBio };

    if (currentUser.role === 'employer') {
        updates.companyName = document.getElementById('profileCompanyName')?.value?.trim() || currentUser.companyName;
        updates.companyDesc = document.getElementById('profileCompanyDesc')?.value?.trim() || currentUser.companyDesc;
        updates.website     = document.getElementById('profileCompanyWebsite')?.value?.trim() || currentUser.website;
        updates.location    = document.getElementById('profileCompanyLocation')?.value?.trim() || currentUser.location;
    } else if (currentUser.role === 'student') {
        updates.university = document.getElementById('profileUniversity')?.value?.trim() || '';
        updates.major      = document.getElementById('profileMajor')?.value?.trim()      || '';
        updates.gradYear   = document.getElementById('profileGradYear')?.value           || '';
    }

    try {
        // ФИКС: Сохраняем в Firestore, а не только в localStorage
        await window.updateDoc(window.doc(window.db, 'users', currentUser.id), updates);

        Object.assign(currentUser, updates);
        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));

        // Обновляем UI
        const profileName  = document.getElementById('profileDisplayName');
        const profileEmail = document.getElementById('profileDisplayEmail');
        const userName     = document.getElementById('userName');
        const userAvatar   = document.getElementById('userAvatar');

        if (profileName)  profileName.textContent  = currentUser.name;
        if (profileEmail) profileEmail.textContent = currentUser.email;
        if (userName)     userName.textContent      = currentUser.name;
        if (userAvatar)   userAvatar.textContent    = getInitials(currentUser.name);

        showNotification('Profile updated ✓', 'success');
    } catch (err) {
        console.error('Error updating profile:', err);
        showNotification('Error saving profile: ' + err.message, 'error');
    }
}


