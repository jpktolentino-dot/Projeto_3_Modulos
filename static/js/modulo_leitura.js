function showLoading() {
        document.getElementById('loading').classList.add('active');
    }

    function hideLoading() {
        document.getElementById('loading').classList.remove('active');
    }

    function filtrarEquipamentos() {
        const termo = document.getElementById('searchInput').value.toLowerCase();
        const itens = document.querySelectorAll('.equipamento-item');
        
        itens.forEach(item => {
            const nome = item.getAttribute('data-nome');
            if (nome.includes(termo)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function abrirModalCadastro() {
        document.getElementById('modalCadastro').classList.add('active');
    }

    function fecharModalCadastro() {
        document.getElementById('modalCadastro').classList.remove('active');
        document.getElementById('formCadastro').reset();
    }

    async function cadastrarEquipamento(event) {
        event.preventDefault();
        
        const equipamento = {
            nome: document.getElementById('equipamentoNome').value,
            modelo: document.getElementById('equipamentoModelo').value,
            fabricante: document.getElementById('equipamentoFabricante').value,
            tipo: document.getElementById('equipamentoTipo').value,
            manual_pdf: document.getElementById('equipamentoManual').value
        };

        showLoading();

        try {
            const response = await fetch('/api/equipamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(equipamento)
            });

            const data = await response.json();

            if (data.success) {
                alert('Equipamento cadastrado com sucesso!');
                window.location.reload();
            } else {
                alert('Erro ao cadastrar: ' + data.message);
                hideLoading();
            }
        } catch (error) {
            alert('Erro de conexão');
            hideLoading();
        }
    }

    function baixarManual(id) {
        // Simular download do manual
        alert('Download do manual iniciado...\nEm produção, isso baixaria o PDF do equipamento ID: ' + id);
    }

    // Fechar modal ao clicar fora
    window.onclick = function(event) {
        const modal = document.getElementById('modalCadastro');
        if (event.target == modal) {
            fecharModalCadastro();
        }
    }