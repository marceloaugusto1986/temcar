function excluirAnuncio(id) {
    if (!confirm("Tem certeza que deseja excluir este anúncio? Essa ação não poderá ser desfeita.")) {
        return;
    }

    fetch(`/api/anunciante/anuncios/${id}`, {
        method: "DELETE",
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Erro ao excluir");
            return res.json();
        })
        .then(() => {
            alert("Anúncio excluído com sucesso!");
            carregarAnunciosUsuario();
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao excluir o anúncio.");
        });
}