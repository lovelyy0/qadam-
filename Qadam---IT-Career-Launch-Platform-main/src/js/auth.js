// ==================== FIREBASE AUTH WAIT HELPER ====================
function waitForFirebase(callback, maxWaitMs = 10000) {
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
        elapsed += interval;
        if (window.auth && window.onAuthStateChanged) {
            clearInterval(timer);
            callback();
        } else if (elapsed >= maxWaitMs) {
            clearInterval(timer);
            console.error('Firebase Auth did not initialize within', maxWaitMs, 'ms');
        }
    }, interval);
}

window.addEventListener('load', () => {
    waitForFirebase(() => {
        window.onAuthStateChanged(window.auth, async (firebaseUser) => {
            if (firebaseUser) {
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
                if (currentUser) {
                    currentUser = null;
                    localStorage.removeItem('qadam_current_user');
                    const authButtons = document.getElementById('authButtons');
                    const userMenu = document.getElementById('userMenu');
                    if (authButtons) authButtons.classList.remove('hidden');
                    if (userMenu) userMenu.classList.add('hidden');
                }
            }
        });
    });
});

// ==================== ПЕРЕКЛЮЧЕНИЕ ПОЛЕЙ КОМПАНИИ ====================
document.addEventListener('DOMContentLoaded', () => {
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', function () {
            const companyFields = document.getElementById('companyFieldsRegister');
            if (companyFields) {
                companyFields.classList.toggle('hidden', this.value !== 'employer');
            }
        });
    }
});

// ==================== РЕГИСТРАЦИЯ ====================
// BUG FIX #1: handleRegister had a broken `if (!window.isValidName)` block —
// it ran QadamValidators.name() but never returned early correctly (double-nested return).
// BUG FIX #2: Employer fields were required only by manual checks; now uses validateRegisterForm().
async function handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirmPassword').value;
    const role     = document.getElementById('regRole').value;

    // Use the unified form validator from validation.js — it handles all fields + employer fields
    if (!window.validateRegisterForm()) {
        return; // inline errors already shown
    }

    // Additional password match check (validateRegisterForm shows the inline error,
    // but we still need to block submission)
    if (password !== confirm) {
        return;
    }

    let employerData = null;
    if (role === 'employer') {
        const companyName    = document.getElementById('regCompanyName').value.trim();
        const companyDesc    = document.getElementById('regCompanyDesc').value.trim();
        const website        = document.getElementById('regCompanyWebsite').value.trim();
        const location       = document.getElementById('regCompanyLocation').value.trim();
        employerData = { companyName, companyDesc, website, location };
    }

    // BUG FIX #3: Submit button wasn't locked during async call → could double-submit.
    const submitBtn = e.submitter || e.target.querySelector('[type="submit"]');
    const restore = window.setButtonLoading(submitBtn);

    try {
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        const userData = {
            uid: user.uid,
            name,
            email,
            role,
            createdAt: new Date().toISOString()
        };
        if (role === 'employer') Object.assign(userData, employerData);

        await window.setDoc(window.doc(window.db, 'users', user.uid), userData);

        if (role === 'student') {
            await window.setDoc(window.doc(window.db, 'portfolios', user.uid), {
                projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: []
            });
            await window.setDoc(window.doc(window.db, 'studentCVs', user.uid), {
                fullName: name, email,
                skills: [], experience: [], education: [], languages: [], links: {}
            });
        }

        currentUser = { id: user.uid, ...userData };
        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));

        updateUIForLoggedInUser();
        updateNavigation();
        closeModal('register');
        showNotification('Registration successful! Welcome! 🎉', 'success');
        restore();
    } catch (err) {
        console.error(err);
        restore();
        const errorMessages = {
            'auth/email-already-in-use':    'This email is already registered',
            'auth/invalid-email':           'Invalid email address',
            'auth/weak-password':           'Password is too weak (min 6 characters)',
            'auth/network-request-failed':  'Network error. Check your connection.'
        };
        showNotification(errorMessages[err.code] || err.message, 'error');
    }
}

// ==================== ВХОД ====================
// BUG FIX #4: Login didn't lock the submit button — could double-fire on slow connections.
async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please fill all fields', 'warning');
        return;
    }
    if (!window.isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'warning');
        return;
    }

    const submitBtn = e.submitter || e.target.querySelector('[type="submit"]');
    const restore = window.setButtonLoading(submitBtn);

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
        restore();
        showNotification(`Welcome back, ${currentUser.name}! 👋`, 'success');
    } catch (err) {
        console.error(err);
        restore();
        const errorMessages = {
            'auth/user-not-found':          'No account found with this email',
            'auth/wrong-password':          'Incorrect password',
            'auth/invalid-email':           'Invalid email address',
            'auth/invalid-credential':      'Incorrect email or password',
            'auth/too-many-requests':       'Too many attempts. Try again later.',
            'auth/network-request-failed':  'Network error. Check your connection.'
        };
        showNotification(errorMessages[err.code] || err.message, 'error');
    }
}

// ==================== СБРОС ПАРОЛЯ ====================
// BUG FIX #5: resetPassword used prompt() which is blocked in many browsers / iframe contexts.
// Replaced with a proper inline mini-form inside the login modal.
function resetPassword() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    if (!email) {
        showNotification('Enter your email in the field above first, then click Forgot Password', 'warning');
        return;
    }
    if (!window.isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'warning');
        return;
    }
    window.sendPasswordResetEmail(window.auth, email)
        .then(() => showNotification('Password reset email sent! Check your inbox.', 'success'))
        .catch(err => {
            const msgs = {
                'auth/user-not-found': 'No account with this email.',
                'auth/invalid-email':  'Invalid email address.'
            };
            showNotification(msgs[err.code] || err.message, 'error');
        });
}

function resendVerificationEmail() {
    const user = window.auth.currentUser;
    if (user) {
        window.sendEmailVerification(user)
            .then(() => showNotification('Verification email resent!', 'success'))
            .catch(err => showNotification(err.message, 'error'));
    } else {
        showNotification('No user is currently signed in.', 'warning');
    }
}

// ==================== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================
async function loadLocalUserData() {
    if (!currentUser) return;
    const userId = currentUser.id;

    // Saved internships
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

    // Applications
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

    // Student-specific data
    if (currentUser.role === 'student') {
        // Portfolio
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
        ['projects', 'skills', 'certificates', 'education', 'experience', 'githubRepos'].forEach(key => {
            if (!studentPortfolio[key]) studentPortfolio[key] = [];
        });
        localStorage.setItem(`qadam_portfolio_${userId}`, JSON.stringify(studentPortfolio));

        // Enrollments
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
    if (userName)    userName.textContent = currentUser.name;

    if (userAvatar) {
        if (currentUser.avatarUrl) {
            userAvatar.style.backgroundImage = `url(${currentUser.avatarUrl})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
            userAvatar.textContent = '';
        } else {
            userAvatar.style.backgroundImage = '';
            userAvatar.textContent = getInitials(currentUser.name);
        }
    }

    // 👇 ДОБАВЬТЕ ЭТОТ БЛОК
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        if (currentUser.role === 'employer') {
            dropdown.innerHTML = `
                <a onclick="showSection('profile')"><i class="fas fa-user"></i><span>Profile</span></a>
                <a onclick="showSection('dashboard')"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a>
                <a onclick="showEmployerProfileTab('applicants')"><i class="fas fa-paper-plane"></i><span>Applications</span></a>
                <div class="dropdown-divider"></div>
                <a onclick="logout()" class="danger"><i class="fas fa-sign-out-alt"></i><span>Log Out</span></a>
            `;
        } else {
            // студент – стандартное меню
            dropdown.innerHTML = `
                <a onclick="showSection('profile')"><i class="fas fa-user"></i><span>Profile</span></a>
                <a onclick="showSection('saved')"><i class="fas fa-bookmark"></i><span>Saved</span></a>
                <a onclick="showSection('applications')"><i class="fas fa-paper-plane"></i><span>Applications</span></a>
                <div class="dropdown-divider"></div>
                <a onclick="logout()" class="danger"><i class="fas fa-sign-out-alt"></i><span>Log Out</span></a>
            `;
        }
    }
}

// ==================== ВЫХОД ====================
async function logout() {
    try {
        const loggedOutUid = currentUser ? currentUser.id : null;

        await window.signOut(window.auth);

        currentUser      = null;
        savedItems       = [];
        applications     = [];
        myInternships    = [];
        myCourses        = [];
        myEvents         = [];
        studentPortfolio = null;
        enrolledCourses  = [];
        studentCV        = null;

        if (loggedOutUid) {
            [
                `qadam_saved_${loggedOutUid}`,
                `qadam_apps_${loggedOutUid}`,
                `qadam_my_internships_${loggedOutUid}`,
                `qadam_my_courses_${loggedOutUid}`,
                `qadam_my_events_${loggedOutUid}`,
                `qadam_portfolio_${loggedOutUid}`,
                `qadam_enrolled_${loggedOutUid}`,
                `qadam_cv_${loggedOutUid}`
            ].forEach(key => localStorage.removeItem(key));
        }
        localStorage.removeItem('qadam_current_user');

        const authButtons = document.getElementById('authButtons');
        const userMenu    = document.getElementById('userMenu');
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu)    userMenu.classList.add('hidden');

        const nav = document.getElementById('mainNav');
        if (nav) {
            nav.innerHTML = '';
            [
                { label: 'Home',        icon: 'fa-home',         section: 'home' },
                { label: 'Internships', icon: 'fa-briefcase',    section: 'internships' },
                { label: 'Courses',     icon: 'fa-book-open',    section: 'courses' },
                { label: 'Events',      icon: 'fa-calendar-alt', section: 'events' },
                { label: 'Resources',   icon: 'fa-users',        section: 'resources' }
            ].forEach(({ label, icon, section }, i) => {
                const a = document.createElement('a');
                a.className = 'nav__link' + (i === 0 ? ' active' : '');
                a.setAttribute('onclick', `showSection('${section}')`);
                a.innerHTML = `<i class="fas ${icon}"></i> `;
                a.appendChild(document.createTextNode(label));
                nav.appendChild(a);
            });
        }

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
    const submitBtn = e.submitter || e.target.querySelector('[type="submit"]');
    const restore = window.setButtonLoading(submitBtn);

    // 👇 Эта строчка проверяет ВСЕ поля профиля, включая год выпуска
    if (!window.validateProfileForm()) {
        restore();
        return;
    }

    const newName  = document.getElementById('profileName')?.value?.trim()  || currentUser.name;
    const newPhone = document.getElementById('profilePhone')?.value?.trim()  || '';
    const newBio   = document.getElementById('profileBio')?.value?.trim()    || '';
    const newCity  = document.getElementById('profileCity')?.value?.trim()   || '';
    const updates = { name: newName, phone: newPhone, bio: newBio, city: newCity }; 



    if (currentUser.role === 'employer') {
        const companyName = document.getElementById('profileCompanyName')?.value?.trim() || '';
        const companyDesc = document.getElementById('profileCompanyDesc')?.value?.trim() || '';
        const website     = document.getElementById('profileCompanyWebsite')?.value?.trim() || '';
        const location    = document.getElementById('profileCompanyLocation')?.value?.trim() || '';

        if (companyName) updates.companyName = companyName;
        if (companyDesc) updates.companyDesc = companyDesc;
        if (website)     updates.website     = website;
        if (location)    updates.location    = location;

    } else if (currentUser.role === 'student') {
        const university  = document.getElementById('profileUniversity')?.value?.trim() || '';
        const major       = document.getElementById('profileMajor')?.value?.trim()       || '';
        const gradYearVal = parseInt(document.getElementById('profileGradYear')?.value)  || 0;

        updates.university = university;
        updates.major      = major;
        updates.gradYear   = gradYearVal;
    }

    try {
        await window.updateDoc(window.doc(window.db, 'users', currentUser.id), updates);
        
        // Обновляем все стажировки, курсы и события работодателя
    if (currentUser.role === 'employer' && (updates.companyName || updates.companyDesc)) {
        const newCompanyName = updates.companyName || currentUser.companyName;
        // Стажировки
        const internSnap = await window.getDocs(
            window.query(window.collection(window.db, 'internships'), window.where('ownerId', '==', currentUser.id))
        );
        internSnap.forEach(async (doc) => {
            await window.updateDoc(doc.ref, { company: newCompanyName });
        });
        // Курсы
        const courseSnap = await window.getDocs(
            window.query(window.collection(window.db, 'courses'), window.where('ownerId', '==', currentUser.id))
        );
        courseSnap.forEach(async (doc) => {
            await window.updateDoc(doc.ref, { provider: newCompanyName });
        });
        // События
        const eventSnap = await window.getDocs(
            window.query(window.collection(window.db, 'events'), window.where('ownerId', '==', currentUser.id))
        );
        eventSnap.forEach(async (doc) => {
            await window.updateDoc(doc.ref, { organizer: newCompanyName });
        });
    }
        Object.assign(currentUser, updates);
        localStorage.setItem('qadam_current_user', JSON.stringify(currentUser));
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        if (userName) userName.textContent = currentUser.name;
        if (userAvatar) userAvatar.textContent = getInitials(currentUser.name);
        showNotification('Profile updated ✓', 'success');
    } catch (err) {
        console.error('Error updating profile:', err);
        showNotification('Error saving profile: ' + err.message, 'error');
    }
    restore();
}
