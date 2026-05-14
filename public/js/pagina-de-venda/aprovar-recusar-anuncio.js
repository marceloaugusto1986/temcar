const params = new URLSearchParams(window.location.search);
const context = params.get('context');
const anuncioId = params.get('id');

// ⚠️ só exibe se for admin
if (context === 'admin') {
    document.getElementById('adminActionBar').classList.remove('d-none');

    document.getElementById('btnAprovar').addEventListener('click', () => {
        aprovarAnuncio(anuncioId);
    });

    document.getElementById('btnReprovar').addEventListener('click', () => {
        reprovarAnuncio(anuncioId);
    });
}

async function aprovarAnuncio(anuncioId) {
    if (!confirm('Tem certeza que deseja APROVAR este anúncio?')) return;

    try {
        const response = await fetch(`/api/admin/publicando-anuncio/${anuncioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'Erro ao aprovar anúncio');
            return;
        }

        alert('✅ Anúncio aprovado com sucesso!');
        
        window.location.replace("/login");

    } catch (error) {
        console.error(error);
        alert('Erro ao aprovar anúncio');
    }
}

async function reprovarAnuncio(telefone) {
    if (!confirm('Tem certeza que deseja REPROVAR este anúncio?')) return;

    try {
        const response = await fetch(`/api/admin/reprovar-anuncio/${anuncioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || 'Erro ao reprovar anúncio');
            return;
        }

        alert('Anúncio reprovado com sucesso!');

        const mensagem = encodeURIComponent(
            'Olá! Seu anúncio foi analisado, mas precisa de ajustes antes de ser publicado. Pode falar comigo?'
        );

        const url = `https://wa.me/${telefone}?text=${mensagem}`;
        window.open(url, '_blank');

        window.location.replace("/login");

    } catch (error) {
        console.error(error);
        alert('Erro ao reprovar anúncio');
    }
}   