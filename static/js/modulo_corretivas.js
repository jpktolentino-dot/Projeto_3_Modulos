// static/js/modulo_corretivas.js

// ==================== VARIÁVEIS GLOBAIS ====================
let equipamentoHistoricoId = null;
let chamadoAtualId = null;
let novoStatusSelecionado = null;

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    inicializarComponentes();
    carregarChamados('meus');
});

function inicializarComponentes() {
    configurarFechamentoModais();
}

function configurarFechamentoModais() {
    window.onclick = function(event) {
        const modais = [
            'modalConfirmacao',
            'modalGerenciarEquipamentos',
            'modalEquipamento',
            'modalHistorico',
            'modalChamado',
            'modalAtualizarStatus'
        ];
        
        modais.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target == modal) {
                modal.classList.remove('active');
            }
        });
    };

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modais = [
                'modalConfirmacao',
                'modalGerenciarEquipamentos',
                'modalEquipamento',
                'modalHistorico',
                'modalChamado',
                'modalAtualizarStatus'
            ];
            
            modais.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}

// ==================== FUNÇÕES DE TOAST ====================
function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
    const container = document.getElementById('toastContainer') || criarToastContainer();
    const toast = document.createElement('div');
    
    const config = obterConfigToast(tipo);
    
    toast.className = `toast ${tipo}`;
    toast.style.cssText = `
        background: white;
        border-radius: 4px;
        padding: 16px 20px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        border-left: 4px solid ${config.iconColor};
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        cursor: pointer;
    `;
    
    toast.innerHTML = `
        <i class="fas ${config.icon}" style="color: ${config.iconColor}; font-size: 1.3rem;"></i>
        <div style="flex:1; font-size:0.95rem;">${mensagem}</div>
    `;
    
    toast.onclick = () => toast.remove();
    
    container.appendChild(toast);
    
    adicionarAnimacaoCSS();
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

function criarToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
    `;
    document.body.appendChild(container);
    return container;
}

function obterConfigToast(tipo) {
    switch (tipo) {
        case 'success':
            return {
                icon: 'fa-check-circle',
                iconColor: '#28a745'
            };
        case 'error':
            return {
                icon: 'fa-exclamation-circle',
                iconColor: '#dc3545'
            };
        case 'warning':
            return {
                icon: 'fa-exclamation-triangle',
                iconColor: '#ffc107'
            };
        default:
            return {
                icon: 'fa-info-circle',
                iconColor: '#17a2b8'
            };
    }
}

function adicionarAnimacaoCSS() {
    if (!document.getElementById('toastAnimation')) {
        const style = document.createElement('style');
        style.id = 'toastAnimation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE EQUIPAMENTOS ====================

function abrirModalGerenciarEquipamentos() {
    document.getElementById('modalGerenciarEquipamentos').classList.add('active');
}

function fecharModalGerenciarEquipamentos() {
    document.getElementById('modalGerenciarEquipamentos').classList.remove('active');
}

function abrirModalCadastroEquipamento() {
    document.getElementById('modalEquipamentoTitulo').textContent = 'Cadastrar Equipamento';
    document.getElementById('equipamentoId').value = '';
    document.getElementById('formEquipamento').reset();
    document.getElementById('modalEquipamento').classList.add('active');
    fecharModalGerenciarEquipamentos();
}

function fecharModalEquipamento() {
    document.getElementById('modalEquipamento').classList.remove('active');
}

async function editarEquipamento(id) {
    try {
        const response = await fetch('/api/equipamentos');
        const equipamentos = await response.json();
        const equipamento = equipamentos.find(e => e.id === id);
        
        if (equipamento) {
            document.getElementById('modalEquipamentoTitulo').textContent = 'Editar Equipamento';
            document.getElementById('equipamentoId').value = equipamento.id;
            document.getElementById('equipamentoNome').value = equipamento.nome;
            document.getElementById('equipamentoModelo').value = equipamento.modelo || '';
            document.getElementById('equipamentoFabricante').value = equipamento.fabricante || '';
            
            const tipoSelect = document.getElementById('equipamentoTipo');
            for (let i = 0; i < tipoSelect.options.length; i++) {
                if (tipoSelect.options[i].value === equipamento.tipo) {
                    tipoSelect.selectedIndex = i;
                    break;
                }
            }
            
            document.getElementById('equipamentoManual').value = equipamento.manual_pdf || '';
            document.getElementById('modalEquipamento').classList.add('active');
            fecharModalGerenciarEquipamentos();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro ao carregar dados do equipamento', 'error');
    }
}

async function salvarEquipamento(event) {
    event.preventDefault();
    
    const id = document.getElementById('equipamentoId').value;
    const equipamento = {
        nome: document.getElementById('equipamentoNome').value,
        modelo: document.getElementById('equipamentoModelo').value,
        fabricante: document.getElementById('equipamentoFabricante').value,
        tipo: document.getElementById('equipamentoTipo').value,
        manual_pdf: document.getElementById('equipamentoManual').value
    };

    if (!equipamento.nome) {
        mostrarToast('Nome do equipamento é obrigatório', 'error');
        return;
    }

    showLoading();

    try {
        let response;
        if (id) {
            response = await fetch(`/api/equipamentos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(equipamento)
            });
        } else {
            response = await fetch('/api/equipamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(equipamento)
            });
        }

        const data = await response.json();

        if (data.success) {
            mostrarToast(id ? 'Equipamento atualizado!' : 'Equipamento cadastrado!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            mostrarToast('Erro: ' + data.message, 'error');
            hideLoading();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
        hideLoading();
    }
}

function confirmarExcluirEquipamento(id, nome) {
    mostrarConfirmacao(
        'Excluir Equipamento',
        `Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita e todos os checklists e chamados relacionados serão perdidos.`,
        async () => {
            showLoading();
            try {
                const response = await fetch(`/api/equipamentos/${id}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                if (data.success) {
                    mostrarToast('Equipamento excluído!', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarToast('Erro ao excluir', 'error');
                    hideLoading();
                }
            } catch (error) {
                console.error('Erro:', error);
                mostrarToast('Erro de conexão', 'error');
                hideLoading();
            }
        }
    );
}

// ==================== FUNÇÕES DE HISTÓRICO ====================

function verHistoricoEquipamento(id, nome) {
    equipamentoHistoricoId = id;
    document.getElementById('modalHistoricoTitulo').textContent = `Histórico - ${nome}`;
    document.getElementById('modalHistorico').classList.add('active');
    fecharModalGerenciarEquipamentos();
    carregarHistoricoChecklists();
}

async function carregarHistoricoChecklists() {
    if (!equipamentoHistoricoId) return;
    
    try {
        const response = await fetch(`/api/equipamentos/${equipamentoHistoricoId}/checklists`);
        const checklists = await response.json();
        
        const container = document.getElementById('historicoContent');
        
        if (checklists.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#5a6f84; padding:20px;">Nenhum checklist encontrado</p>';
            return;
        }
        
        let html = '<h4 style="margin-bottom:15px;">Checklists Realizados</h4>';
        checklists.forEach(c => {
            html += `
                <div class="chamado-card" style="cursor: default; margin-bottom:10px;">
                    <div class="chamado-header">
                        <strong>Período: ${c.mes_ano}</strong>
                        <span class="chamado-status ${c.status === 'concluido' ? 'status-concluido' : 'status-andamento'}">${c.status}</span>
                    </div>
                    <p style="color:#5a6f84;">Operador: ${c.operador}</p>
                    <p style="font-size:0.85rem; color:#7c8b9f;">Execução: ${c.data_execucao}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar checklists:', error);
        mostrarToast('Erro ao carregar histórico', 'error');
    }
}

async function carregarHistoricoChamados() {
    if (!equipamentoHistoricoId) return;
    
    try {
        const response = await fetch(`/api/equipamentos/${equipamentoHistoricoId}/chamados`);
        const chamados = await response.json();
        
        const container = document.getElementById('historicoContent');
        
        if (chamados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#5a6f84; padding:20px;">Nenhum chamado encontrado</p>';
            return;
        }
        
        let html = '<h4 style="margin-bottom:15px;">Chamados Realizados</h4>';
        chamados.forEach(c => {
            let statusClass = '';
            if (c.status === 'aberto') statusClass = 'status-aberto';
            else if (c.status === 'em_andamento') statusClass = 'status-andamento';
            else if (c.status === 'concluido') statusClass = 'status-concluido';
            
            html += `
                <div class="chamado-card" style="cursor: default; margin-bottom:10px;">
                    <div class="chamado-header">
                        <strong>#${c.id} - ${c.causa}</strong>
                        <span class="chamado-status ${statusClass}">${c.status}</span>
                    </div>
                    <p style="color:#5a6f84;">${c.descricao.substring(0, 100)}${c.descricao.length > 100 ? '...' : ''}</p>
                    <p style="font-size:0.85rem; color:#7c8b9f;">Aberto em: ${c.data_abertura}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar chamados:', error);
        mostrarToast('Erro ao carregar histórico', 'error');
    }
}

function fecharModalHistorico() {
    document.getElementById('modalHistorico').classList.remove('active');
    equipamentoHistoricoId = null;
}

// ==================== FUNÇÕES DE CHAMADOS ====================

function mudarTab(tabName, event) {
    // Atualizar tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');

    if (tabName === 'meus') {
        carregarChamados('meus');
    } else if (tabName === 'todos') {
        carregarChamados('todos');
    }
}

async function abrirChamado() {
    const equipamentoId = document.getElementById('chamadoEquipamento')?.value;
    const causa = document.getElementById('chamadoCausa')?.value;
    const descricao = document.getElementById('chamadoDescricao')?.value;
    const dataInicial = document.getElementById('chamadoDataInicial')?.value;
    const dataFinal = document.getElementById('chamadoDataFinal')?.value;

    if (!equipamentoId || !causa || !descricao || !dataInicial) {
        mostrarToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/chamados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipamento_id: equipamentoId,
                causa: causa,
                descricao: descricao,
                data_hora_inicial: dataInicial,
                data_hora_final: dataFinal || new Date().toISOString().slice(0,16)
            })
        });

        const data = await response.json();

        if (data.success) {
            mostrarToast('Chamado aberto com sucesso!', 'success');
            limparFormularioChamado();
            mudarTab('meus', { target: document.querySelectorAll('.tab')[1] });
            carregarChamados('meus');
        } else {
            mostrarToast('Erro ao abrir chamado', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

function limparFormularioChamado() {
    document.getElementById('chamadoCausa').value = '';
    document.getElementById('chamadoDescricao').value = '';
    document.getElementById('chamadoEquipamento').value = '';
    document.getElementById('chamadoDataInicial').value = '';
    document.getElementById('chamadoDataFinal').value = '';
}

async function carregarChamados(tipo) {
    const listaId = tipo === 'meus' ? 'meusChamadosList' : 'todosChamadosList';
    const container = document.getElementById(listaId);
    
    if (!container) return;
    
    showLoading();
    
    try {
        const response = await fetch('/api/chamados');
        const chamados = await response.json();
        
        if (chamados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#5a6f84; padding:20px;">Nenhum chamado encontrado</p>';
            hideLoading();
            return;
        }
        
        let html = '';
        chamados.forEach(chamado => {
            let statusClass = '';
            if (chamado.status === 'aberto') statusClass = 'status-aberto';
            else if (chamado.status === 'em_andamento') statusClass = 'status-andamento';
            else if (chamado.status === 'concluido') statusClass = 'status-concluido';
            
            html += `
                <div class="chamado-card" onclick="verChamado(${chamado.id})">
                    <div class="chamado-header">
                        <strong>${chamado.equipamento}</strong>
                        <span class="chamado-status ${statusClass}">${chamado.status}</span>
                    </div>
                    <p style="color:#5a6f84;">Causa: ${chamado.causa}</p>
                    <p style="font-size:0.85rem; color:#7c8b9f;">Aberto em: ${chamado.data_abertura}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar chamados:', error);
        container.innerHTML = '<p style="text-align:center; color:#5a6f84;">Erro ao carregar chamados</p>';
    } finally {
        hideLoading();
    }
}

async function verChamado(id) {
    chamadoAtualId = id;
    
    try {
        const response = await fetch(`/api/chamados/${id}`);
        const chamado = await response.json();
        
        let statusClass = '';
        if (chamado.status === 'aberto') statusClass = 'status-aberto';
        else if (chamado.status === 'em_andamento') statusClass = 'status-andamento';
        else if (chamado.status === 'concluido') statusClass = 'status-concluido';
        
        const detalhes = document.getElementById('chamadoDetalhes');
        detalhes.innerHTML = `
            <p><strong>Chamado:</strong> #${chamado.id}</p>
            <p><strong>Equipamento:</strong> ${chamado.equipamento}</p>
            <p><strong>Causa:</strong> ${chamado.causa}</p>
            <p><strong>Descrição:</strong> ${chamado.descricao}</p>
            <p><strong>Data Abertura:</strong> ${chamado.data_abertura}</p>
            <p><strong>Status:</strong> <span class="chamado-status ${statusClass}">${chamado.status}</span></p>
        `;
    } catch (error) {
        console.error('Erro ao carregar chamado:', error);
        const detalhes = document.getElementById('chamadoDetalhes');
        detalhes.innerHTML = '<p style="text-align:center; color:#5a6f84;">Erro ao carregar detalhes</p>';
    }
    
    document.getElementById('modalChamado').classList.add('active');
}

function fecharModalChamado() {
    document.getElementById('modalChamado').classList.remove('active');
}

// ==================== FUNÇÕES DE ATUALIZAÇÃO DE STATUS ====================

function abrirModalAtualizarStatus() {
    if (!chamadoAtualId) return;
    
    document.getElementById('chamadoNumeroStatus').textContent = chamadoAtualId;
    document.getElementById('modalAtualizarStatus').classList.add('active');
    document.getElementById('modalChamado').classList.remove('active');
    
    // Resetar seleção
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    novoStatusSelecionado = null;
}

function fecharModalAtualizarStatus() {
    document.getElementById('modalAtualizarStatus').classList.remove('active');
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    novoStatusSelecionado = null;
}

function selecionarStatus(status) {
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    if (status === 'aberto') {
        document.getElementById('statusAberto').classList.add('selected');
        novoStatusSelecionado = 'aberto';
    } else if (status === 'em_andamento') {
        document.getElementById('statusAndamento').classList.add('selected');
        novoStatusSelecionado = 'em_andamento';
    } else if (status === 'concluido') {
        document.getElementById('statusConcluido').classList.add('selected');
        novoStatusSelecionado = 'concluido';
    }
}

async function confirmarAtualizarStatus() {
    if (!novoStatusSelecionado) {
        mostrarToast('Selecione um status', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/chamados/${chamadoAtualId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatusSelecionado })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarToast('Status atualizado com sucesso!', 'success');
            fecharModalAtualizarStatus();
            carregarChamados('meus');
            
            // Verificar se o usuário é PCM para recarregar a aba 'todos'
            const usuarioPerfil = document.querySelector('.badge')?.textContent;
            if (usuarioPerfil && usuarioPerfil.includes('pcm')) {
                carregarChamados('todos');
            }
            
            // Fechar modal do chamado se estiver aberto
            document.getElementById('modalChamado').classList.remove('active');
        } else {
            mostrarToast('Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNÇÕES UTILITÁRIAS ====================

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

function fecharModalConfirmacao() {
    document.getElementById('modalConfirmacao').classList.remove('active');
}

function mostrarConfirmacao(titulo, mensagem, callback) {
    const modal = document.getElementById('modalConfirmacao');
    document.getElementById('modalMensagem').textContent = mensagem;
    document.querySelector('#modalConfirmacao .modal-header h3').textContent = titulo;
    
    const confirmarBtn = document.getElementById('modalConfirmarBtn');
    confirmarBtn.onclick = function() {
        fecharModalConfirmacao();
        callback();
    };
    
    modal.classList.add('active');
}

// Exportar funções para o escopo global
window.mudarTab = mudarTab;
window.abrirChamado = abrirChamado;
window.carregarChamados = carregarChamados;
window.verChamado = verChamado;
window.fecharModalChamado = fecharModalChamado;
window.abrirModalAtualizarStatus = abrirModalAtualizarStatus;
window.fecharModalAtualizarStatus = fecharModalAtualizarStatus;
window.selecionarStatus = selecionarStatus;
window.confirmarAtualizarStatus = confirmarAtualizarStatus;
window.abrirModalGerenciarEquipamentos = abrirModalGerenciarEquipamentos;
window.fecharModalGerenciarEquipamentos = fecharModalGerenciarEquipamentos;
window.abrirModalCadastroEquipamento = abrirModalCadastroEquipamento;
window.fecharModalEquipamento = fecharModalEquipamento;
window.editarEquipamento = editarEquipamento;
window.salvarEquipamento = salvarEquipamento;
window.confirmarExcluirEquipamento = confirmarExcluirEquipamento;
window.verHistoricoEquipamento = verHistoricoEquipamento;
window.carregarHistoricoChecklists = carregarHistoricoChecklists;
window.carregarHistoricoChamados = carregarHistoricoChamados;
window.fecharModalHistorico = fecharModalHistorico;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.mostrarToast = mostrarToast;