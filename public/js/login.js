document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userEmailLogin = document.getElementById('userEmailLogin').value;
    const senhaLogin = document.getElementById('senhaLogin').value;

    if (userEmailLogin === '' || senhaLogin === '') {
        alert('Preencha todos os campos.');
        return;
    }

    try {
        const response = await fetch('/login/autenticar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userEmailLogin, senhaLogin })
        });

        if (response.ok) {
            const data = await response.json();

            localStorage.setItem('token', data.token);

            window.location.href = data.redirectUrl;
        } else {
            const errorMessage = await response.json();
            if (errorMessage.message) {
                alert(errorMessage.message);
            } else {
                alert('Erro desconhecido');
                window.location.reload();
            }
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
    }
});
