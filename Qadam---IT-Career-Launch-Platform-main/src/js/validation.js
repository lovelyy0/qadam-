// ==================== QADAM — VALIDATION MODULE v2.1 (FIXED) ====================
// Drop-in replacement. Connect BEFORE auth.js, student.js, employer.js
// <script src="src/js/validation.js"></script>

// ============================================================
// 1. CORE VALIDATORS
// ============================================================
const QadamValidators = {

    name(val) {
        val = (val || '').trim();
        if (!val)                            return 'Name is required';
        if (val.length < 2)                  return 'Name must be at least 2 characters';
        if (val.length > 80)                 return 'Name must be less than 80 characters';
        if (!/^[a-zA-Zа-яА-ЯёЁіІүҮәӘқҚңҢғҒһҺ0-9\s.'\-]+$/.test(val))
            return 'Name can only contain letters, numbers, spaces, dots, hyphens, and apostrophes';
        // BUG FIX #8: original name() was missing `return null` → returned undefined (falsy) which
        // made isValidName() think the name was ALWAYS invalid. Added explicit return null.
        return null;
    },

    email(val) {
        val = (val || '').trim().toLowerCase();
        if (!val)                            return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val))
            return 'Invalid email format (e.g. user@example.com)';
        return null;
    },

    password(val) {
        if (!val)                            return 'Password is required';
        if (val.length < 8)                  return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(val))              return 'Password needs at least 1 uppercase letter';
        if (!/[0-9]/.test(val))              return 'Password needs at least 1 digit';
        return null;
    },

    phone(val) {
        if (!val || !val.trim()) return null; // optional field
        val = val.trim();
        if (!/^\+?[0-9\s\-()\s]{7,15}$/.test(val))
            return 'Invalid phone (e.g. +7 777 123 45 67)';
        return null;
    },

    url(val) {
        if (!val || !val.trim()) return null; // optional
        val = val.trim();
        try {
            new URL(val.startsWith('http') ? val : 'https://' + val);
            return null;
        } catch {
            return 'Invalid URL (e.g. https://example.com)';
        }
    },

    skillName(val) {
        val = (val || '').trim();
        if (!val) return 'Skill name is required';
        if (val.length < 2) return 'Skill name too short (min 2 chars)';
        if (val.length > 60) return 'Skill name too long (max 60 chars)';
        if (!/[a-zA-Zа-яА-ЯёЁіІ]/.test(val))
            return 'Skill name must contain letters, not just numbers or symbols';
        // Отсеиваем мусор: должно быть как минимум 3 разных символа
        const uniqueChars = new Set(val.toLowerCase()).size;
        if (uniqueChars < 3)
            return 'Skill name looks invalid (not enough variety)';
        return null;
    },

    // BUG FIX #9: institution() was DUPLICATED (lines 71-109 in original).
    // The second definition overwrote the first without the entropy checks.
    // Kept the simpler (correct) version — entropy checks caused false positives
    // on names like "НАУ" (3 unique chars but valid abbreviation).
    institution(val) {
        if (!val || !val.trim()) return null; // optional
        val = val.trim();
        if (val.length < 2)   return 'Institution name too short (min 2 chars)';
        if (val.length > 120) return 'Institution name too long (max 120 chars)';
        return null;
    },

    gradYear(val) {
        if (!val) return null;
        const year = parseInt(val);
        const current = new Date().getFullYear();
        if (isNaN(year)) return 'Must be a valid year';
        if (year < 1950) return 'Year is too far in the past';
        if (year > current + 10) return `Graduation year too far ahead (max ${current + 10})`;
        return null;
    },

    pastDate(val) {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'Invalid date';
        if (d > new Date())     return 'Date cannot be in the future';
        return null;
    },

    futureDate(val) {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'Invalid date';
        if (d < new Date())     return 'Date must be in the future';
        return null;
    },

    description(val, min = 10, max = 2000) {
        if (!val || !val.trim()) return null; // usually optional
        val = val.trim();
        if (val.length < min)   return `Description too short (min ${min} chars)`;
        if (val.length > max)   return `Description too long (max ${max} chars)`;
        return null;
    },

    projectTitle(val) {
        val = (val || '').trim();
        if (!val)                             return 'Project title is required';
        if (val.length < 3)                   return 'Title too short (min 3 chars)';
        if (val.length > 100)                 return 'Title too long (max 100 chars)';
        if (!/[a-zA-Zа-яА-ЯёЁіІ0-9]/.test(val))
            return 'Title must contain meaningful text';
        return null;
    },

    companyName(val) {
        val = (val || '').trim();
        if (!val)                             return 'Company name is required';
        if (val.length < 2)                   return 'Company name too short';
        if (val.length > 100)                 return 'Company name too long';
        return null;
    },

    salary(val) {
        if (!val) return null;
        const n = parseInt(val);
        if (isNaN(n) || n < 0)               return 'Salary must be a positive number';
        if (n > 10_000_000)                  return 'Salary value too large';
        return null;
    },

    noSpecialChars(val) {
    if (!val) return null; // разрешаем пустое (проверка обязательности отдельно)
    if (/[,;\\]/.test(val))
        return 'This field cannot contain commas, semicolons or backslashes';
    return null;
    }
};

// ============================================================
// 2. INLINE ERROR HELPERS
// ============================================================
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    clearFieldError(fieldId);
    field.classList.add('field-error');
    const err = document.createElement('span');
    err.className = 'field-error-msg';
    err.id = fieldId + '_error';
    err.textContent = message;
    field.parentNode.appendChild(err);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.remove('field-error');
    const old = document.getElementById(fieldId + '_error');
    if (old) old.remove();
}

function validateField(fieldId, validatorFn) {
    const field = document.getElementById(fieldId);
    if (!field) return true;
    const error = validatorFn(field.value);
    if (error) {
        showFieldError(fieldId, error);
        return false;
    }
    clearFieldError(fieldId);
    return true;
}

function attachRealtimeValidation(fieldId, validatorFn) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.addEventListener('blur', () => validateField(fieldId, validatorFn));
    field.addEventListener('input', () => {
        if (field.classList.contains('field-error')) {
            validateField(fieldId, validatorFn);
        }
    });
}

// ============================================================
// 3. FORM-LEVEL VALIDATORS
// ============================================================
function validateSkillForm() {
    return validateField('skillName', QadamValidators.skillName);
}

function validateProjectForm() {
    const titleOk = validateField('projectTitle', QadamValidators.projectTitle);

    const catOk = validateField('projectCategory', v => {
        if (!v || v.trim() === '') return 'Please select a category';
        const allowed = [
            'Web Development', 'Mobile App', 'AI/ML', 'Data Science',
            'Backend', 'DevOps', 'UI/UX Design', 'Game Dev', 'Other'
        ];
        if (!allowed.includes(v)) return 'Please select a valid category';
        return null;
    });

    const descOk = validateField('projectDesc', v => {
        if (!v || v.trim() === '') return null;
        const trimmed = v.trim();
        if (trimmed.length < 10) return 'Description too short (min 10 chars)';
        if (trimmed.length > 2000) return 'Description too long (max 2000 chars)';
        if (!/[a-zA-Zа-яА-ЯёЁіІ]/.test(trimmed))
            return 'Description must contain at least one letter';
        return null;
    });

    const linkOk = validateField('projectLink', v => {
        if (!v || v.trim() === '') return 'Project link is required';
        if (!/^https:\/\//.test(v.trim())) return 'URL must start with https://';
        const urlError = QadamValidators.url(v);
        if (urlError) return urlError;
        return null;
    });

    return titleOk && catOk && descOk && linkOk;
}

function validateCertificateForm() {
    // Certificate Name: 3-100 chars, must contain at least one letter
    const nameOk = validateField('certName', v => {
        if (!v || v.trim().length < 3) return 'Certificate name must be at least 3 characters';
        if (v.trim().length > 100) return 'Certificate name too long (max 100 chars)';
        if (!/[a-zA-Zа-яА-ЯёЁіІ]/.test(v.trim()))
            return 'Certificate name must contain letters, not just numbers or symbols';
        return null;
    });

    // Issuing Organization: required, min 2 chars, must contain letters, not just symbols
    const issuerOk = validateField('certIssuer', v => {
        if (!v || v.trim() === '') return 'Issuing organization is required';
        if (v.trim().length < 2) return 'Issuer name too short (min 2 chars)';
        if (v.trim().length > 100) return 'Issuer name too long (max 100 chars)';
        if (!/[a-zA-Zа-яА-ЯёЁіІ]/.test(v.trim()))
            return 'Issuer name must contain at least one letter';
        return null;
    });

    // Date Issued: required, valid date, not in the future
    const dateOk = validateField('certDate', v => {
        if (!v) return 'Date issued is required';
        const d = new Date(v);
        if (isNaN(d.getTime())) return 'Invalid date format (use YYYY-MM-DD)';
        if (d > new Date()) return 'Date cannot be in the future';
        return null;
    });

    // URL: optional, but if present must start with https:// and be valid
    const urlOk = validateField('certUrl', v => {
        if (!v || v.trim() === '') return null;
        if (!/^https:\/\//.test(v.trim())) return 'URL must start with https://';
        const urlError = QadamValidators.url(v);
        if (urlError) return urlError;
        return null;
    });

    return nameOk && issuerOk && dateOk && urlOk;
}

// BUG FIX #10: validateRegisterForm() — employer url validation was calling
// `validateField('regCompanyWebsite', QadamValidators.url)` but the field is
// required for employer, not optional. Added required check.
function validateRegisterForm() {
    const nameOk     = validateField('regName',     QadamValidators.name);
    const emailOk    = validateField('regEmail',    QadamValidators.email);
    const passwordOk = validateField('regPassword', QadamValidators.password);

    const pw  = document.getElementById('regPassword')?.value || '';
    const cpw = document.getElementById('regConfirmPassword')?.value || '';
    let confirmOk = true;
    if (pw !== cpw) {
        showFieldError('regConfirmPassword', 'Passwords do not match');
        confirmOk = false;
    } else {
        clearFieldError('regConfirmPassword');
    }

    const role = document.getElementById('regRole')?.value;
    let employerOk = true;
    if (role === 'employer') {
        const cnameOk = validateField('regCompanyName', QadamValidators.companyName);
        const descOk  = validateField('regCompanyDesc', v => {
            if (!v || v.trim().length < 10) return 'Company description min 10 chars';
            return null;
        });
        const urlOk   = validateField('regCompanyWebsite', v => {
            if (!v || !v.trim()) return 'Company website is required';
            return QadamValidators.url(v);
        });
        employerOk = cnameOk && descOk && urlOk;
    }

    return nameOk && emailOk && passwordOk && confirmOk && employerOk;
}

function validateProfileForm() {
    // Full Name – только буквы, пробелы, дефисы, точки
    const nameOk = validateField('profileName', v => {
        if (!v || v.trim().length < 2) return 'Full name must be at least 2 characters';
        if (!/^[a-zA-Zа-яА-ЯёЁіІ\s.\-]+$/.test(v.trim()))
            return 'Full name can only contain letters, spaces, dots, and hyphens';
        return null;
    });

    // Phone – если заполнено, должен начинаться с + и содержать 7–15 цифр
    const phoneOk = validateField('profilePhone', v => {
        if (!v || !v.trim()) return null;
        const cleaned = v.replace(/[\s\-()]/g, '');
        if (!/^\+[0-9]{7,15}$/.test(cleaned))
            return 'Phone must start with + and contain 7-15 digits (e.g. +7 777 123 45 67)';
        return null;
    });

    // Bio (About Me) – если заполнено, минимум 20 символов
    const bioOk = validateField('profileBio', v => {
        if (!v || !v.trim()) return null;
        if (v.trim().length < 20) return 'About Me must be at least 20 characters';
        return null;
    });

    // City – только буквы, пробелы, дефисы (опционально)
    const cityOk = validateField('profileCity', v => {
        if (!v || !v.trim()) return null;
        if (!/^[a-zA-Zа-яА-ЯёЁіІ\s\-]+$/.test(v.trim()))
            return 'City can only contain letters, spaces, and hyphens';
        return null;
    });

    if (currentUser?.role === 'student') {
        // University – минимум 3 символа, только буквы, пробелы, дефисы, точки
        const uniOk = validateField('profileUniversity', v => {
            if (!v || !v.trim()) return null;
            const val = v.trim();
            if (val.length < 3) return 'University name must be at least 3 characters';
            if (!/^[a-zA-Zа-яА-ЯёЁіІ\s.\-]+$/.test(val))
                return 'University can only contain letters, spaces, dots, and hyphens';
            return null;
        });

        // Field of Study – аналогично
        const majorOk = validateField('profileMajor', v => {
            if (!v || !v.trim()) return null;
            const val = v.trim();
            if (val.length < 3) return 'Field of study must be at least 3 characters';
            if (!/^[a-zA-Zа-яА-ЯёЁіІ\s.\-]+$/.test(val))
                return 'Field of study can only contain letters, spaces, dots, and hyphens';
            return null;
        });

        // Graduation Year – через QadamValidators.gradYear
        const yearOk = validateField('profileGradYear', QadamValidators.gradYear);

        return nameOk && phoneOk && bioOk && cityOk && uniOk && majorOk && yearOk;
    }

    if (currentUser?.role === 'employer') {
        const cnOk  = validateField('profileCompanyName', QadamValidators.companyName);
        const urlOk = validateField('profileCompanyWebsite', QadamValidators.url);
        return nameOk && phoneOk && bioOk && cityOk && cnOk && urlOk;
    }

    return nameOk && phoneOk && bioOk && cityOk;
}

// ============================================================
// 4. DATA SANITIZER
// ============================================================
const QadamSanitizer = {
    text(val, maxLen = 500) {
        if (!val) return '';
        return String(val).trim().slice(0, maxLen);
    },
    url(val) {
        if (!val || !val.trim()) return '';
        val = val.trim();
        if (!val.startsWith('http')) val = 'https://' + val;
        try { new URL(val); return val; } catch { return ''; }
    },
    number(val, fallback = 0) {
        const n = parseInt(val);
        return isNaN(n) ? fallback : n;
    },
    email(val) {
        return (val || '').trim().toLowerCase().slice(0, 100);
    },
    tags(csvString) {
        return (csvString || '')
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length >= 1 && t.length <= 50 && /[a-zA-Zа-яА-Я]/.test(t))
            .slice(0, 20);
    }
};

// ============================================================
// 5. CSS FOR INLINE ERRORS
// ============================================================
(function injectValidationStyles() {
    if (document.getElementById('qadamValidationStyles')) return;
    const style = document.createElement('style');
    style.id = 'qadamValidationStyles';
    style.textContent = `
        .form-control.field-error {
            border-color: #ef4444 !important;
            background: #fff5f5;
            box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .field-error-msg {
            display: block;
            color: #dc2626;
            font-size: 0.78rem;
            margin-top: 4px;
            animation: slideDown 0.15s ease;
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            pointer-events: none;
        }
        .btn .btn-spinner {
            display: inline-block;
            width: 14px; height: 14px;
            border: 2px solid rgba(255,255,255,0.4);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            margin-right: 6px;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// 6. BUTTON LOADING STATE HELPER
// ============================================================
function setButtonLoading(btn) {
    if (!btn) return () => {};
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> Saving...`;
    return () => {
        btn.disabled = false;
        btn.innerHTML = original;
    };
}

// ============================================================
// 7. EXPORT TO WINDOW
// ============================================================
window.QadamValidators          = QadamValidators;
window.QadamSanitizer           = QadamSanitizer;
window.showFieldError           = showFieldError;
window.clearFieldError          = clearFieldError;
window.validateField            = validateField;
window.attachRealtimeValidation = attachRealtimeValidation;
window.validateSkillForm        = validateSkillForm;
window.validateProjectForm      = validateProjectForm;
window.validateCertificateForm  = validateCertificateForm;
window.validateRegisterForm     = validateRegisterForm;
window.validateProfileForm      = validateProfileForm;
window.setButtonLoading         = setButtonLoading;

// ============================================================
// 8. BACKWARD COMPATIBILITY
// ============================================================
// BUG FIX #11: isValidName was `(v) => !QadamValidators.name(v)`.
// Since name() now returns null (falsy) on success, !null = true = valid. ✓
window.isValidEmail    = (v) => !QadamValidators.email(v);
window.isValidName     = (v) => !QadamValidators.name(v);
window.isValidPassword = (v) => !QadamValidators.password(v);
window.isValidUrl      = (v) => !QadamValidators.url(v);
window.validateFormInput = (fieldName, value, rule) => QadamValidators[rule]?.(value) || null;