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
let usuarioAtualCidadesAtendimento = [];

function obterCidadesAtendimento(usuario) {
  if (!usuario || !usuario.cidades_atendimento) return [];
  if (Array.isArray(usuario.cidades_atendimento)) return usuario.cidades_atendimento;

  try {
    return JSON.parse(usuario.cidades_atendimento) || [];
  } catch (error) {
    return [];
  }
}

function chaveCidadeAtendimento(cidade) {
  return `${cidade.nome || cidade.cidade}|${cidade.estado}`.toLowerCase();
}

function renderizarPillsCidades(cidades) {
  if (!cidades || !cidades.length) return '<span class="text-muted">Nenhuma cidade adicional cadastrada.</span>';

  return cidades
    .map(cidade => `<span class="badge bg-light text-dark border me-1 mb-1">${cidade.cidade || cidade.nome} / ${cidade.estado}</span>`)
    .join('');
}

function renderizarCidadesAtendimentoAdmin() {
  const lista = document.getElementById('adminCidadesAtendimentoLista');
  if (!lista) return;

  lista.innerHTML = '';

  if (!usuarioAtualCidadesAtendimento.length) {
    lista.innerHTML = '<span class="text-muted">Nenhuma cidade adicional cadastrada.</span>';
    return;
  }

  usuarioAtualCidadesAtendimento.forEach((cidade, index) => {
    const item = document.createElement('span');
    item.className = 'badge bg-light text-dark border me-1 mb-1';
    item.textContent = `${cidade.nome || cidade.cidade} / ${cidade.estado}`;

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'btn btn-link btn-sm p-0 ms-2 text-danger text-decoration-none';
    remover.textContent = 'x';
    remover.addEventListener('click', () => {
      usuarioAtualCidadesAtendimento.splice(index, 1);
      renderizarCidadesAtendimentoAdmin();
    });

    item.appendChild(remover);
    lista.appendChild(item);
  });
}

async function carregarSelectCidadesAtendimentoAdmin() {
  const select = document.getElementById('adminCidadeAtendimento');
  if (!select) return;

  try {
    const response = await fetch('/api/cidades');
    if (!response.ok) throw new Error('Erro ao carregar cidades');
    const cidades = await response.json();

    cidades
      .sort((a, b) => `${a.nome} ${a.estado}`.localeCompare(`${b.nome} ${b.estado}`, 'pt-BR'))
      .forEach(cidade => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ nome: cidade.nome, estado: cidade.estado });
        option.textContent = `${cidade.nome} / ${cidade.estado}`;
        select.appendChild(option);
      });
  } catch (error) {
    console.error(error);
  }
}

async function verUsuario(id) {
  usuarioAtualId = id;

  const response = await fetch(`/api/admin/usuarios/${id}`);
  const { usuario } = await response.json();
  usuarioAtualCidadesAtendimento = obterCidadesAtendimento(usuario)
    .map(item => ({
      nome: item.nome || item.cidade,
      cidade: item.cidade || item.nome,
      estado: item.estado
    }))
    .filter(item => (item.nome || item.cidade) && item.estado);

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

	  ${usuario.tipo === 'revenda' ? `
	  <div class="col-12">
	    <div class="border rounded-3 p-4 bg-white shadow-sm">
	      <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
	        <h6 class="text-uppercase text-muted mb-0">Imagem de capa</h6>
	        <a id="btnDownloadCapaUsuario" class="btn btn-sm btn-outline-secondary d-none" href="#" download>
	          Baixar imagem
	        </a>
	      </div>

	      <div class="row g-3 align-items-end">
	        <div class="col-sm-12 col-md-4">
	          <img id="imagemCapaUsuario"
	            alt="Imagem de capa"
	            class="img-fluid rounded border bg-light d-none"
	            style="width:100%;max-width:260px;aspect-ratio:16/9;object-fit:contain;">
            <div id="imagemCapaUsuarioVazia"
              class="rounded border bg-light text-muted small d-flex align-items-center justify-content-center"
              style="width:100%;max-width:260px;aspect-ratio:16/9;">
              Sem imagem
            </div>
	        </div>

	        <div class="col-sm-12 col-md-5">
	          <label class="form-label small text-muted">Nova imagem</label>
	          <input type="file" id="inputCapaUsuario" class="form-control" accept="image/*">
	        </div>

	        <div class="col-sm-12 col-md-3">
	          <button class="btn btn-danger w-100" onclick="uploadCapaUsuario()">
	            Enviar imagem
	          </button>
	        </div>

	        <div class="col-12">
	          <div id="capaFeedback" class="small"></div>
	        </div>
	      </div>
	    </div>
	  </div>
	  ` : ''}
	
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

  ${usuario.tipo === 'revenda' ? `
  <!-- 🔹 CIDADES DE ATUAÇÃO -->
  <div class="col-12">
    <div class="border rounded-3 p-4 bg-white shadow-sm">
      <h6 class="text-uppercase text-muted mb-3">Cidades onde os anúncios são encontrados</h6>

      <div class="mb-3">
        ${renderizarPillsCidades(usuarioAtualCidadesAtendimento)}
      </div>

      <div class="row g-3 align-items-end">
        <div class="col-md-8">
          <label class="form-label small text-muted">Cidade de atuação</label>
          <select id="adminCidadeAtendimento" class="form-control">
            <option value="">Selecione uma cidade</option>
          </select>
        </div>
        <div class="col-md-4">
          <button type="button" class="btn btn-outline-danger w-100" onclick="adicionarCidadeAtendimentoAdmin()">
            Adicionar cidade
          </button>
        </div>
      </div>

      <div id="adminCidadesAtendimentoLista" class="mt-3"></div>

      <div class="mt-3 d-flex gap-2 align-items-center flex-wrap">
        <button type="button" class="btn btn-danger" onclick="salvarCidadesAtendimentoAdmin()">
          Salvar cidades
        </button>
        <span id="adminCidadesFeedback" class="small"></span>
      </div>
    </div>
  </div>
  ` : ''}

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
	  if (usuario.tipo === 'revenda') {
	    carregarCapaUsuario(id);
	    carregarSelectCidadesAtendimentoAdmin();
	    renderizarCidadesAtendimentoAdmin();
	  }
	  carregarAnunciosDoUsuario(id);
	}

async function carregarCapaUsuario(usuarioId) {
  const img = document.getElementById('imagemCapaUsuario');
  const vazio = document.getElementById('imagemCapaUsuarioVazia');
  const download = document.getElementById('btnDownloadCapaUsuario');
  const feedback = document.getElementById('capaFeedback');

  if (!img || !download) return;

  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioId}/capa`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao carregar imagem.');
    }

    const capa = data.capa || null;

    if (capa) {
      img.src = capa;
      img.classList.remove('d-none');
      vazio?.classList.add('d-none');
      download.href = capa;
      download.classList.remove('d-none');
    } else {
      img.removeAttribute('src');
      img.classList.add('d-none');
      vazio?.classList.remove('d-none');
      download.classList.add('d-none');
    }

    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'small';
    }
  } catch (err) {
    console.error(err);
    if (feedback) {
      feedback.textContent = 'Não foi possível carregar a imagem de capa.';
      feedback.className = 'small text-danger';
    }
  }
}

async function uploadCapaUsuario() {
  const input = document.getElementById('inputCapaUsuario');
  const feedback = document.getElementById('capaFeedback');

  if (!input?.files?.length) {
    feedback.textContent = 'Selecione uma imagem para enviar.';
    feedback.className = 'small text-danger';
    return;
  }

  const formData = new FormData();
  formData.append('capa', input.files[0]);

  try {
    feedback.textContent = 'Enviando imagem...';
    feedback.className = 'small text-muted';

    const response = await fetch(`/api/admin/usuarios/${usuarioAtualId}/capa`, {
      method: 'PUT',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      feedback.textContent = data.message || 'Erro ao enviar imagem.';
      feedback.className = 'small text-danger';
      return;
    }

    input.value = '';
    feedback.textContent = 'Imagem atualizada com sucesso.';
    feedback.className = 'small text-success';
    carregarCapaUsuario(usuarioAtualId);

  } catch (err) {
    console.error(err);
    feedback.textContent = 'Erro de comunicação com o servidor.';
    feedback.className = 'small text-danger';
  }
}

function adicionarCidadeAtendimentoAdmin() {
  const select = document.getElementById('adminCidadeAtendimento');
  if (!select || !select.value) return;

  const cidade = JSON.parse(select.value);
  const jaExiste = usuarioAtualCidadesAtendimento.some(item =>
    chaveCidadeAtendimento(item) === chaveCidadeAtendimento(cidade)
  );

  if (!jaExiste) {
    usuarioAtualCidadesAtendimento.push({
      nome: cidade.nome,
      cidade: cidade.nome,
      estado: cidade.estado
    });
    renderizarCidadesAtendimentoAdmin();
  }

  select.value = '';
}

async function salvarCidadesAtendimentoAdmin() {
  const feedback = document.getElementById('adminCidadesFeedback');
  if (feedback) {
    feedback.textContent = 'Salvando...';
    feedback.className = 'small text-muted';
  }

  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioAtualId}/cidades-atendimento`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cidadesAtendimento: usuarioAtualCidadesAtendimento })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao salvar cidades.');
    }

    if (feedback) {
      feedback.textContent = 'Cidades atualizadas com sucesso.';
      feedback.className = 'small text-success';
    }
  } catch (error) {
    console.error(error);
    if (feedback) {
      feedback.textContent = error.message || 'Erro ao salvar cidades.';
      feedback.className = 'small text-danger';
    }
  }
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
