// ==================== التنقل ====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navMap = { 'lessons': 0, 'results': 1, 'profile': 2 };
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[page] !== undefined) navItems[navMap[page]].classList.add('active');

    if (page === 'results') loadStudentResults();
    if (page === 'profile') loadProfile();

    if (page !== 'exam') {
        document.getElementById('examMeta').style.display = 'flex';
        document.getElementById('submitBtn').style.display = 'block';
        document.getElementById('saveLaterBtn').style.display = 'block';
        document.getElementById('reviewBanner').classList.add('hidden');
    }
}

// ==================== بعد تسجيل الدخول ====================
function loginSuccess() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('topBar').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');
    const name = currentStudent.fullName || currentStudent.firstName || 'طالب';
    document.getElementById('avatarLetter').textContent = name.charAt(0);
    document.getElementById('profileAvatar').textContent = name.charAt(0);
    listenDrafts();
    loadLessons();
    navigateTo('lessons');
}

// ==================== تشغيل الصفحة ====================
window.onload = function() {
    document.getElementById('bottomNav').classList.add('hidden');
    checkSession();
};
