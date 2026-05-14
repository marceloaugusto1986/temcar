function voltar_para_pagina_anterior() {
  window.history.back();

  window.addEventListener('popstate', function () {
    location.reload(true);
  });
}

function ir_para_home() {
  window.location.href = '/';
}

function logout() {
  localStorage.removeItem('token');

  fetch('/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        console.error('Erro ao fazer logout');
      }
    })
    .catch(error => {
      console.error('Erro ao fazer logout', error);
    });
}