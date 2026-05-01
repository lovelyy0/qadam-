// ==================== APP INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('preloader').classList.add('hidden'), 300);
    
    if (currentUser && currentUser.role === 'student') {
        // Принудительно загружаем портфолио при старте
        const saved = localStorage.getItem(`qadam_portfolio_${currentUser.id}`);
        if (saved) {
            studentPortfolio = JSON.parse(saved);
            if (!studentPortfolio.projects) studentPortfolio.projects = [];
        } else {
            studentPortfolio = { projects: [], skills: [] };
        }
        console.log('App init - portfolio loaded:', studentPortfolio);
    }
    if (currentUser) {
        updateUIForLoggedInUser();
        updateNavigation();
    }
    
    renderPopularInternships().catch(console.error);
    renderTestimonials();
    updateStats().catch(console.error);
    createParticles();
    
    window.addEventListener('scroll', () => {
        document.getElementById('header').classList.toggle('scrolled', window.scrollY > 50);
    });
    
    document.addEventListener('click', e => {
        const chip = document.getElementById('userMenu');
        if (chip && !chip.contains(e.target)) chip.classList.remove('open');
    });
    
    setTimeout(() => showNotification('Welcome to Qadam! 🚀', 'success'), 1600);
});

// Modal accessibility
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => { 
    if (e.target === m) { 
        m.classList.remove('show'); 
        document.body.style.overflow = ''; 
    } 
}));

document.addEventListener('keydown', e => { 
    if (e.key === 'Escape') { 
        const m = document.querySelector('.modal.show'); 
        if (m) { 
            m.classList.remove('show'); 
            document.body.style.overflow = ''; 
        } 
    } 
});