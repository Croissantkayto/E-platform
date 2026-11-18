// ==================== نظام الدخول ====================

function checkSession() {
    const saved = localStorage.getItem('studentSession');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            db.ref('students/' + data.id).once('value', (snapshot) => {
                const student = snapshot.val();
                if (student) {
                    if (student.isBlocked) {
                        alert('❌ هذا الحساب محظور. يرجى التواصل مع الإدارة.');
                        localStorage.removeItem('studentSession');
                        return;
                    }
                    currentStudent = student;
                    currentStudentId = data.id;
                    loginSuccess();
                } else {
                    localStorage.removeItem('studentSession');
                }
            });
        } catch(e) { localStorage.removeItem('studentSession'); }
    }
}

function switchTab(tab) {
    document.getElementById('loginTab').className = tab === 'login' ? 'active' : '';
    document.getElementById('registerTab').className = tab === 'register' ? 'active' : '';
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('registerError').classList.add('hidden');
    document.getElementById('registerSuccess').classList.add('hidden');
}

function validatePhone(phone) { return /^01[0-9]{9}$/.test(phone); }

function handleRegister(event) {
    event.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const fatherName = document.getElementById('regFatherName').value.trim();
    const familyName = document.getElementById('regFamilyName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const parentPhone = document.getElementById('regParentPhone').value.trim();
    const grade = document.getElementById('regGrade').value;
    const gender = document.getElementById('regGender').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    
    if (!firstName || firstName.length < 2) { errorDiv.textContent = '⚠️ الاسم الأول قصير جداً'; errorDiv.classList.remove('hidden'); return; }
    if (!fatherName || fatherName.length < 2) { errorDiv.textContent = '⚠️ اسم الأب قصير جداً'; errorDiv.classList.remove('hidden'); return; }
    if (!familyName || familyName.length < 2) { errorDiv.textContent = '⚠️ اسم العيلة قصير جداً'; errorDiv.classList.remove('hidden'); return; }
    if (phone === parentPhone) { errorDiv.textContent = '⚠️ رقم الطالب وولي الأمر متطابقين'; errorDiv.classList.remove('hidden'); return; }
    if (!validatePhone(phone)) { errorDiv.textContent = '⚠️ رقم الطالب يجب أن يكون 11 رقم ويبدأ بـ 01'; errorDiv.classList.remove('hidden'); return; }
    if (!validatePhone(parentPhone)) { errorDiv.textContent = '⚠️ رقم ولي الأمر يجب أن يكون 11 رقم ويبدأ بـ 01'; errorDiv.classList.remove('hidden'); return; }
    if (password.length < 6) { errorDiv.textContent = '⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل'; errorDiv.classList.remove('hidden'); return; }
    if (password !== confirmPassword) { errorDiv.textContent = '⚠️ كلمة المرور غير متطابقة'; errorDiv.classList.remove('hidden'); return; }
    
    db.ref('students').orderByChild('phone').equalTo(phone).once('value', (snapshot) => {
        if (snapshot.val()) {
            errorDiv.innerHTML = `⚠️ <strong>هذا الرقم مسجل بالفعل!</strong><br><button onclick="switchTab('login')" style="margin-top:8px;padding:6px 14px;background:var(--primary-blue);color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">تسجيل الدخول</button>`;
            errorDiv.classList.remove('hidden');
            return;
        }
        db.ref('students').orderByChild('phone').equalTo(parentPhone).once('value', (parentSnapshot) => {
            if (parentSnapshot.val()) {
                errorDiv.innerHTML = `⚠️ <strong>رقم ولي الأمر مسجل كرقم طالب!</strong>`;
                errorDiv.classList.remove('hidden');
                return;
            }
            const fullName = `${firstName} ${fatherName} ${familyName}`;
            db.ref('students').push({
                firstName, fatherName, familyName, fullName, phone, parentPhone, grade, gender, password, createdAt: Date.now()
            }).then(() => {
                successDiv.textContent = '✅ تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن';
                successDiv.classList.remove('hidden');
                errorDiv.classList.add('hidden');
                setTimeout(() => switchTab('login'), 2000);
            }).catch((error) => {
                errorDiv.textContent = '❌ خطأ: ' + error.message;
                errorDiv.classList.remove('hidden');
            });
        });
    });
}

function handleLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!validatePhone(phone)) { errorDiv.textContent = '⚠️ رقم الهاتف غير صحيح'; errorDiv.classList.remove('hidden'); return; }
    
    db.ref('students').orderByChild('phone').equalTo(phone).once('value', (snapshot) => {
        const students = snapshot.val();
        if (!students) { errorDiv.textContent = '❌ لا يوجد حساب بهذا الرقم'; errorDiv.classList.remove('hidden'); return; }
        const studentId = Object.keys(students)[0];
        const studentData = students[studentId];
        
        if (studentData.isBlocked) {
            errorDiv.textContent = '❌ هذا الحساب محظور. يرجى التواصل مع الإدارة.';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (studentData.password === password) {
            currentStudent = studentData;
            currentStudentId = studentId;
            localStorage.setItem('studentSession', JSON.stringify({ id: studentId }));
            loginSuccess();
        } else {
            errorDiv.textContent = '❌ كلمة المرور غير صحيحة';
            errorDiv.classList.remove('hidden');
        }
    });
}

function logout() {
    localStorage.removeItem('studentSession');
    currentStudent = null; currentStudentId = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('topBar').classList.add('hidden');
    document.getElementById('bottomNav').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

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
        document.getElementById('reviewBanner').classList.add('hidden');
    }
}

function loginSuccess() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('topBar').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');
    const name = currentStudent.fullName || currentStudent.firstName || 'طالب';
    document.getElementById('avatarLetter').textContent = name.charAt(0);
    document.getElementById('profileAvatar').textContent = name.charAt(0);
    loadLessons();
    navigateTo('lessons');
}
