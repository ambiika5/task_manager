document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://127.0.0.1:8000';

    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const closeModal = document.querySelector('.close-modal');
    const toggleAuth = document.getElementById('toggleAuth');
    const authForm = document.getElementById('authForm');
    const modalTitle = document.getElementById('modalTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('switchText');
    const nameGroup = document.getElementById('nameGroup');

    let isLogin = true;


    const openModal = (mode) => {
        isLogin = mode === 'login';
        updateModalUI();
        authModal.style.display = 'flex';
    };

    const updateModalUI = () => {
        modalTitle.textContent = isLogin ? 'Login' : 'Create Account';
        authSubmitBtn.textContent = isLogin ? 'Login' : 'Sign Up';
        switchText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
        toggleAuth.textContent = isLogin ? 'Sign Up' : 'Login';
        nameGroup.style.display = isLogin ? 'none' : 'block';
    };

    const startForFreeBtn = document.getElementById('startForFreeBtn');

    loginBtn.addEventListener('click', () => openModal('login'));
    signupBtn.addEventListener('click', () => openModal('signup'));

    if (startForFreeBtn) {
        startForFreeBtn.addEventListener('click', () => openModal('signup'));
    }

    closeModal.addEventListener('click', () => authModal.style.display = 'none');
    
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        updateModalUI();
    });

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = isLogin ? null : document.getElementById('name').value;

        const endpoint = isLogin ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/signup`;
        const payload = isLogin ? { email, password } : { name, email, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data = {};
            try { data = await response.json(); } catch (_) { data = {}; }

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/dashboard.html';
            } else {
                alert(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong. Please try again.');
        }
    });
});