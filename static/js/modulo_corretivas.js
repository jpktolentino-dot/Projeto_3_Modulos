let chamadoAtualId = null;

function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

function mudarTab(tabName) {
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
    const equipamentoId = document.getElementById('chamadoEquipamento').value;
    const causa = document.getElementById('chamadoCausa').value;
    const descricao = document.getElementById('chamadoDescricao').value;
    const dataInicial = document.getElementById('chamadoDataInicial').value;
    const dataFinal = document.getElementById('chamadoDataFinal').value;

    if (!equipamentoId || !causa || !descricao || !dataInicial) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/chamados', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            alert('Chamado aberto com sucesso! Nº: ' + data.chamado_id);
            document.getElementById('chamadoCausa').value = '';
            document.getElementById('chamadoDescricao').value = '';
            document.getElementById('chamadoEquipamento').value = '';
            document.getElementById('chamadoDataInicial').value = '';
            document.getElementById('chamadoDataFinal').value = '';
            mudarTab('meus');
            carregarChamados('meus');
        } else {
            alert('Erro ao abrir chamado');
            hideLoading();
        }
    } catch (error) {
        alert('Erro de conexão');
        hideLoading();
    }
}

async function carregarChamados(tipo) {
    const listaId = tipo === 'meus' ? 'meusChamadosList' : 'todosChamadosList';
    const container = document.getElementById(listaId);
    
    showLoading();
    
    try {
        // Tenta carregar da API
        const response = await fetch('/api/chamados');
        const chamados = await response.json();
        
        if (chamados.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#5a6f84;">Nenhum chamado encontrado</p>';
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
        // Fallback para dados mockados
        container.innerHTML = `
            <div class="chamado-card" onclick="verChamado(1)">
                <div class="chamado-header">
                    <strong>Prensa Hidráulica PH-2000</strong>
                    <span class="chamado-status status-aberto">Aberto</span>
                </div>
                <p style="color:#5a6f84;">Causa: Superaquecimento do motor</p>
                <p style="font-size:0.85rem; color:#7c8b9f;">Aberto em: 20/05/2025 08:30</p>
            </div>
            <div class="chamado-card" onclick="verChamado(2)">
                <div class="chamado-header">
                    <strong>Compressor Atlas</strong>
                    <span class="chamado-status status-andamento">Em andamento</span>
                </div>
                <p style="color:#5a6f84;">Causa: Vazamento de ar</p>
                <p style="font-size:0.85rem; color:#7c8b9f;">Aberto em: 19/05/2025 14:15</p>
            </div>
        `;
    }
    
    hideLoading();
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
        // Fallback para dados mockados
        const detalhes = document.getElementById('chamadoDetalhes');
        detalhes.innerHTML = `
            <p><strong>Chamado:</strong> #${id}</p>
            <p><strong>Equipamento:</strong> Prensa Hidráulica PH-2000</p>
            <p><strong>Causa:</strong> Superaquecimento do motor</p>
            <p><strong>Descrição:</strong> Motor apresentando temperatura acima do normal, necessidade de verificação urgente.</p>
            <p><strong>Data Abertura:</strong> 20/05/2025 08:30</p>
            <p><strong>Data Prevista:</strong> 20/05/2025 11:00</p>
            <p><strong>Status:</strong> <span class="chamado-status status-aberto">Aberto</span></p>
        `;
    }
    
    document.getElementById('modalChamado').classList.add('active');
}

function fecharModalChamado() {
    document.getElementById('modalChamado').classList.remove('active');
    chamadoAtualId = null;
}

async function atualizarStatusChamado() {
    if (!chamadoAtualId) return;
    
    const novoStatus = prompt('Digite o novo status (aberto/em_andamento/concluido):');
    if (!novoStatus) return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/chamados/${chamadoAtualId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: novoStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Status atualizado com sucesso!');
            fecharModalChamado();
            carregarChamados('todos');
        } else {
            alert('Erro ao atualizar status');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
    
    hideLoading();
}

// Carregar chamados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    carregarChamados('meus');
});

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalChamado');
    if (event.target == modal) {
        fecharModalChamado();
    }
}