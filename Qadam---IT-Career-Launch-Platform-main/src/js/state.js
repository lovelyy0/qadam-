
const data = {
    // Стажировки, курсы и события теперь ТОЛЬКО в Firestore
    // testimonials и mentors — статика, не требует БД
    testimonials: [
        { id:1, name:'Aidos Kairbekov', position:'Frontend Developer at Kaspi.kz', avatar:'AK', text:'Thanks to Qadam, I found an internship at Kaspi.kz within 2 months of starting my studies. The platform helped with my resume and interview preparation.' },
        { id:2, name:'Diana Sagintayeva', position:'QA Engineer at Chocofamily', avatar:'DS', text:'Completed testing courses on Qadam and immediately found an internship. Mentors were very helpful with preparation.' },
        { id:3, name:'Ruslan Akhmetov', position:'Data Scientist at Halyk Bank', avatar:'RA', text:'Great platform to start. Participated in hackathons, found a mentor, and got an offer at a top bank.' },
    ],
    mentors: [
        { id:1, name:'Aigul Serikbayeva', position:'Senior Frontend Developer', company:'Kaspi.kz', skills:['React','TypeScript','Redux','Next.js'], experience:8, students:45, rating:4.9 },
        { id:2, name:'Damir Nurpeisov', position:'Data Scientist', company:'Halyk Bank', skills:['Python','Machine Learning','SQL','TensorFlow'], experience:6, students:32, rating:4.8 },
        { id:3, name:'Madina Akhmetova', position:'Product Manager', company:'Chocofamily', skills:['Product Management','Agile','Analytics','UX Research'], experience:7, students:28, rating:4.9 },
        { id:4, name:'Arman Kerimbayev', position:'DevOps Lead', company:'Cloud Solutions', skills:['Docker','Kubernetes','AWS','CI/CD'], experience:9, students:38, rating:5.0 },
    ]
};

// ==================== ГЛОБАЛЬНЫЙ СТЕЙТ ====================
// ФИКС: currentUser берётся только из localStorage как кэш.
// Реальная валидация — через Firebase Auth onAuthStateChanged (в auth.js)
let currentUser = JSON.parse(localStorage.getItem('qadam_current_user')) || null;

// Данные, загружаемые из Firestore после логина (через loadLocalUserData в auth.js)
let savedItems      = [];
let applications    = [];
let myInternships   = [];
let myCourses       = [];
let myEvents        = [];
let studentPortfolio = null;
let enrolledCourses  = [];
let studentCV        = null;

// Если пользователь уже залогинен (localStorage кэш), подгружаем его данные
if (currentUser) {
    const uid = currentUser.id;
    savedItems      = JSON.parse(localStorage.getItem(`qadam_saved_${uid}`))     || [];
    applications    = JSON.parse(localStorage.getItem(`qadam_apps_${uid}`))      || [];
    myInternships   = JSON.parse(localStorage.getItem(`qadam_my_internships_${uid}`)) || [];
    myCourses       = JSON.parse(localStorage.getItem(`qadam_my_courses_${uid}`)) || [];
    myEvents        = JSON.parse(localStorage.getItem(`qadam_my_events_${uid}`))  || [];

    if (currentUser.role === 'student') {
        studentPortfolio = JSON.parse(localStorage.getItem(`qadam_portfolio_${uid}`)) || {
            projects: [], skills: [], certificates: [], education: [], experience: [], githubProfile: null, githubRepos: []
        };
        enrolledCourses = JSON.parse(localStorage.getItem(`qadam_enrolled_${uid}`)) || [];
        studentCV = JSON.parse(localStorage.getItem(`qadam_cv_${uid}`)) || {
            fullName: currentUser.name || '', title: '', email: currentUser.email || '',
            phone: '', location: '', summary: '',
            skills: [], experience: [], education: [], languages: [], links: {}
        };
    }
}
const LEVELS = {
  beginner: { icon: '🌱', name: 'Beginner', color: '#10b981' },
  intermediate: { icon: '📘', name: 'Intermediate', color: '#3b82f6' },
  advanced: { icon: '⚡', name: 'Advanced', color: '#8b5cf6' },
  expert: { icon: '🏆', name: 'Expert', color: '#f59e0b' }
};

// ==================== UI СТЕЙТ ====================
let currentPage     = 1;
const itemsPerPage  = 6;
let currentView     = 'grid';
let currentMonth    = new Date().getMonth();
let currentYear     = new Date().getFullYear();
let currentFilter   = { city: '', direction: '', salary: '' };
let isLoading       = false;

// ==================== КОНСТАНТЫ ====================
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];