/* LISTAR USUÁRIOS NA PLANILA */
async function carregarUsuarios() {
  try {
    const response = await fetch('/api/admin/usuarios');
    const data = await response.json();

    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = '';

    data.usuarios.forEach(usuario => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
          <td>${usuario.nome}</td>
          <td>${usuario.email}</td>
          <td>${usuario.tipo}</td>
          <td>${usuario.cidade || '-'}/${usuario.estado || '-'}</td>
          <td>${usuario.whatsapp || '-'}</td>
          <td>${new Date(usuario.criado_em).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-primary px-5" style="background-color: #C90B0C; border: none" onclick="verUsuario(${usuario.id})">
              Ver
            </button>
            <button class="btn btn-primary px-5" style="background-color: #C90B0C; border: none" onclick="excluirUsuario(${usuario.id})">
              Excluir
            </button>
          </td>
        `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    alert('Erro ao carregar usuários');
  }
}
carregarUsuarios();

/* OCULTAR PLANILHA DE USUÁRIOS E EXIBIR INFORMAÇÕES DE CADASTROS E ANÚNCIOS */
let usuarioAtualId = null;
async function verUsuario(id) {
  usuarioAtualId = id;

  const response = await fetch(`/api/admin/usuarios/${id}`);
  const { usuario } = await response.json();

  document.querySelector('.tabela-usuarios').classList.add('d-none');
  document.querySelector('.visualizar-usuario').classList.remove('d-none');

  const perfil = document.getElementById('perfilUsuario');

  perfil.innerHTML = `

    <div class="row g-4">

  <!-- 🔹 DADOS BÁSICOS -->
  <div class="col-12">
    <div class="border rounded-3 p-4 bg-white shadow-sm">
      <h6 class="text-uppercase text-muted mb-3">Informações Básicas</h6>

      <div class="row g-3">
        <div class="col-sm-6">
          <div class="info-box">
            <span class="info-label">Nome</span>
            <div class="info-value">${usuario.nome}</div>
          </div>
        </div>

        <div class="col-sm-6">
          <div class="info-box">
            <span class="info-label">E-mail</span>
            <div class="info-value">${usuario.email}</div>
          </div>
        </div>

        <div class="col-sm-4">
          <div class="info-box">
            <span class="info-label">Tipo</span>
            <div class="info-value">${usuario.tipo}</div>
          </div>
        </div>

        <div class="col-sm-4">
          <div class="info-box">
            <span class="info-label">Cadastro</span>
            <div class="info-value">
              ${new Date(usuario.criado_em).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🔹 CONTATO -->
  <div class="col-12">
    <div class="border rounded-3 p-4 bg-white shadow-sm">
      <h6 class="text-uppercase text-muted mb-3">Contato</h6>

      <div class="row g-3">
        <div class="col-sm-6 col-md-4">
          <div class="info-box">
            <span class="info-label">WhatsApp</span>
            <div class="info-value">${usuario.whatsapp || '-'}</div>
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="info-box">
            <span class="info-label">Telefone</span>
            <div class="info-value">${usuario.telefone || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🔹 ENDEREÇO -->
  <div class="col-12">
    <div class="border rounded-3 p-4 bg-white shadow-sm">
      <h6 class="text-uppercase text-muted mb-3">Endereço</h6>

      <div class="row g-3">
        <div class="col-6 col-md-3">
          <div class="info-box">
            <span class="info-label">CEP</span>
            <div class="info-value">${usuario.cep || '-'}</div>
          </div>
        </div>

        <div class="col-12 col-md-5">
          <div class="info-box">
            <span class="info-label">Rua</span>
            <div class="info-value">${usuario.rua || '-'}</div>
          </div>
        </div>

        <div class="col-6 col-md-2">
          <div class="info-box">
            <span class="info-label">Nº</span>
            <div class="info-value">${usuario.numero || '-'}</div>
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="info-box">
            <span class="info-label">Bairro</span>
            <div class="info-value">${usuario.bairro || '-'}</div>
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="info-box">
            <span class="info-label">Cidade</span>
            <div class="info-value">${usuario.cidade || '-'}</div>
          </div>
        </div>

        <div class="col-6 col-md-2">
          <div class="info-box">
            <span class="info-label">Estado</span>
            <div class="info-value">${usuario.estado || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🔹 SEGURANÇA -->
  <div class="col-12">
    <div class="border rounded-3 p-4 bg-white shadow-sm">
      <h6 class="text-uppercase text-muted mb-3">Segurança</h6>

      <div class="row g-3 align-items-end">
        <div class="col-sm-12 col-md-4">
          <label class="form-label small text-muted">Nova senha</label>
          <input type="password" id="novaSenha" class="form-control">
        </div>

        <div class="col-sm-12 col-md-4">
          <button class="btn btn-warning w-100" onclick="alterarSenha()">
            Alterar senha
          </button>
        </div>

        <div class="col-sm-12 col-md-4">
          <div id="senhaFeedback" class="small"></div>
        </div>
      </div>
    </div>
  </div>

</div>

  `;
  carregarAnunciosDoUsuario(id);
}

/* ALTERAR SENHA DO USUÁRIO */
async function alterarSenha() {
  const novaSenha = document.getElementById('novaSenha').value;
  const feedback = document.getElementById('senhaFeedback');

  feedback.textContent = '';

  if (!novaSenha || novaSenha.length < 6) {
    feedback.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    feedback.className = 'text-danger';
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/usuarios/${usuarioAtualId}/senha`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novaSenha })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      feedback.textContent = data.message || 'Erro ao alterar senha.';
      feedback.className = 'text-danger';
      return;
    }

    feedback.textContent = 'Senha alterada com sucesso.';
    feedback.className = 'text-success';
    document.getElementById('novaSenha').value = '';

  } catch (err) {
    console.error(err);
    feedback.textContent = 'Erro de comunicação com o servidor.';
    feedback.className = 'text-danger';
  }
}

/* OCULTAR INFORMAÇÕES DO USUÁRIO E EXIBIR A PLANILHA DE TODOS OS USUÁRIOS */
function fecharVisualizacao() {
  document.querySelector('.visualizar-usuario').classList.add('d-none');
  document.querySelector('.tabela-usuarios').classList.remove('d-none');
}

/* CARREGAR ANÚNCIOS DO USUÁRIO ESPECÍFICO */
async function carregarAnunciosDoUsuario(usuarioId) {
  const container = document.getElementById("cards-analise");
  container.innerHTML = `<p class="text-secondary">Carregando anúncios...</p>`;

  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioId}/anuncios`);
    const anuncios = await response.json();

    renderizarCardsUsuario(anuncios);

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-danger">Erro ao carregar anúncios.</p>`;
  }
}

/* CARREGAR CARDS DOS USUÁRIOS */
function renderizarCardsUsuario(anuncios) {
  const container = document.getElementById("cards-analise");
  container.innerHTML = "";

  if (!anuncios || anuncios.length === 0) {
    container.innerHTML = `<p class="text-secondary">Este usuário não possui anúncios.</p>`;
    return;
  }

  anuncios.forEach(anuncio => {

    const cardWrapper = document.createElement("div");
    cardWrapper.classList.add("position-relative");

    const statusLabel = anuncio.status === "analise"
            ? `<span class="badge bg-warning text-dark badge-status">Em análise</span>`
            : `<span class="badge bg-success badge-status">Ativo</span>`;

    cardWrapper.innerHTML = `
      ${statusLabel}

      <div class="card shadow-sm vehicle-card"
        style="width: 280px;"
        onclick="window.location.href='/venda?id=${anuncio.id}&context=admin'">
        

        <img 
          src="/uploads/anuncios/${anuncio.imagem}"
          class="card-img-top"
          style="height:180px; object-fit:cover;"
        >

        <div class="card-body">
          <h5 class="fw-bold mb-1">
            <span class="text-dark">${anuncio.marca}</span>
            <span style="color:#C90B0C;"> ${anuncio.versao}</span>
          </h5>

          <p class="mb-1 text-secondary small descricao-card">
            ${anuncio.descricao || ''}
          </p>

          <p class="fw-bold mb-1" style="color:#C90B0C;">
            R$ ${Number(anuncio.preco).toLocaleString("pt-BR")}
            <span class="text-dark"> | ${anuncio.ano_modelo}</span>
          </p>

          <p class="text-secondary small m-0">
            <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
            ${anuncio.cidade} - ${anuncio.estado}
          </p>
        </div>
      </div>
    `;

    container.appendChild(cardWrapper);
  });
}

/* EXCLUIR USUÁRIO */
async function excluirUsuario(usuarioId) {
  const confirmar = confirm(
    "⚠️ ATENÇÃO!\n\nIsso irá excluir:\n• O usuário\n• Todos os anúncios dele\n• Todas as imagens\n\nEssa ação é IRREVERSÍVEL.\n\nDeseja continuar?"
  );

  if (!confirmar) return;

  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Erro ao excluir usuário.");
      return;
    }

    alert("✅ Usuário excluído com sucesso.");

    // 🔄 Atualiza a lista (ajuste conforme sua função)
    carregarUsuarios();

  } catch (err) {
    console.error(err);
    alert("Erro inesperado ao excluir usuário.");
  }
}