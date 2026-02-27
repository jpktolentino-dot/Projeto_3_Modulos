function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showLoginScreen(modulo) {
    showScreen('login-' + modulo);
}

function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

function showError(modulo, message) {
    const errorDiv = document.getElementById('login-error-' + modulo);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('active');
        setTimeout(() => {
            errorDiv.classList.remove('active');
        }, 3000);
    }
}

async function fazerLogin(modulo) {
    const login = document.getElementById(`login-user-${modulo}`).value;
    const senha = document.getElementById(`login-pass-${modulo}`).value;

    if (!login || !senha) {
        showError(modulo, 'Preencha usuário e senha');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/login/${modulo}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, senha })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            hideLoading();
            showError(modulo, data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showError(modulo, 'Erro de conexão com o servidor');
    }
}