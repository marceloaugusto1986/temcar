const nomeDoUsuarioLogado = document.getElementById('nome_do_usuario_logado');

let nomeUsuario = '';

async function fetchInformacoesDoUsuario() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token não encontrado no localStorage.');
        }

        const response = await fetch('/api/usuario', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar o nome do usuário.');
        }

        const data = await response.json();
        nomeUsuario = data.infoUsuarioLogado.nome;
        const emailUsuario = data.infoUsuarioLogado.email;

        const inputNomeUsuario = document.getElementById('nome_do_usuario');
        const inputEmailUsuario = document.getElementById('email_do_usuario');

        if (inputNomeUsuario) {
            inputNomeUsuario.placeholder = nomeUsuario;
        }

        if (inputEmailUsuario) {
            inputEmailUsuario.placeholder = emailUsuario;
        }

    } catch (error) {
        console.error('Erro ao buscar o nome do usuário:', error);
        nomeDoUsuarioLogado.innerText = 'Nome não encontrado';
    }
}

fetchInformacoesDoUsuario();