// static/js/modulo_leitura.js

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    configurarFechamentoModais();
});

function configurarFechamentoModais() {
    window.onclick = function(event) {
        const modal = document.getElementById('modalCadastro');
        if (event.target == modal) {
            fecharModalCadastro();
        }
    };

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('modalCadastro');
            if (modal && modal.classList.contains('active')) {
                fecharModalCadastro();
            }
        }
    });
}

// ==================== FUNÇÕES DE FILTRAGEM ====================
function filtrarEquipamentos() {
    const termo = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const itens = document.querySelectorAll('.equipamento-item');
    
    itens.forEach(item => {
        const nome = item.getAttribute('data-nome') || '';
        if (nome.includes(termo)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==================== FUNÇÕES DE MODAL ====================
function abrirModalCadastro() {
    document.getElementById('modalCadastro').classList.add('active');
}

function fecharModalCadastro() {
    document.getElementById('modalCadastro').classList.remove('active');
    document.getElementById('formCadastro').reset();
}

// ==================== FUNÇÕES DE CADASTRO ====================
async function cadastrarEquipamento(event) {
    event.preventDefault();
    
    const equipamento = {
        nome: document.getElementById('equipamentoNome')?.value,
        modelo: document.getElementById('equipamentoModelo')?.value,
        fabricante: document.getElementById('equipamentoFabricante')?.value,
        tipo: document.getElementById('equipamentoTipo')?.value,
        manual_pdf: document.getElementById('equipamentoManual')?.value
    };

    if (!equipamento.nome) {
        alert('Nome do equipamento é obrigatório');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/equipamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        console.error('Erro:', error);
        alert('Erro de conexão');
        hideLoading();
    }
}

// ==================== FUNÇÕES DE DOWNLOAD ====================
function baixarManual(id) {
    alert('Download do manual iniciado...\nEm produção, isso baixaria o PDF do equipamento ID: ' + id);
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

// Exportar funções para o escopo global
window.filtrarEquipamentos = filtrarEquipamentos;
window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
window.cadastrarEquipamento = cadastrarEquipamento;
window.baixarManual = baixarManual;
window.showLoading = showLoading;
window.hideLoading = hideLoading;