 function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

async function iniciarChecklist(equipamentoId) {
    // Esta função agora é chamada diretamente com o ID do equipamento
    if (!equipamentoId) {
        // Se não tiver ID, tenta pegar do select (fallback)
        equipamentoId = document.getElementById('equipamentoSelect')?.value;
    }
    
    if (!equipamentoId) {
        alert('Selecione um equipamento');
        return;
    }

    showLoading();

    try {
        const response = await fetch('/api/checklist/iniciar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ equipamento_id: equipamentoId })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/modulo/checklist?checklist_id=' + data.checklist_id;
        } else {
            alert('Erro: ' + data.message);
            hideLoading();
        }
    } catch (error) {
        alert('Erro de conexão');
        hideLoading();
    }
}

async function atualizarItem(checklistId, itemId, concluido) {
    try {
        const response = await fetch(`/api/checklist/${checklistId}/item/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ concluido: concluido })
        });

        const data = await response.json();
        
        if (!data.success) {
            alert('Erro ao atualizar item');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

function finalizarChecklist(checklistId) {
    const observacoes = document.getElementById('observacoes').value;
    
    mostrarConfirmacao(
        'Concluir Checklist',
        'Tem certeza que deseja finalizar este checklist? O relatório será enviado ao PCM.',
        async () => {
            showLoading();
            
            try {
                const response = await fetch(`/api/checklist/${checklistId}/finalizar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ observacoes: observacoes })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Checklist finalizado com sucesso! Relatório enviado.');
                    window.location.reload();
                } else {
                    alert('Erro: ' + data.message);
                    hideLoading();
                }
            } catch (error) {
                alert('Erro de conexão');
                hideLoading();
            }
        }
    );
}

function visualizarRelatorio(checklistId) {
    // Em produção, abriria um PDF ou página com o relatório
    alert('Relatório do checklist #' + checklistId + '\nEm produção, isso abriria o PDF do relatório.');
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

function fecharModalConfirmacao() {
    document.getElementById('modalConfirmacao').classList.remove('active');
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalConfirmacao');
    if (event.target == modal) {
        fecharModalConfirmacao();
    }
}

function confirmarExcluirChecklist(id, equipamentoNome) {
    mostrarConfirmacao(
        'Excluir Checklist',
        `Tem certeza que deseja excluir o checklist do equipamento "${equipamentoNome}"? Esta ação não pode ser desfeita.`,
        async () => {
            showLoading();
            try {
                const response = await fetch(`/api/checklist/${id}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    alert('Checklist excluído com sucesso!');
                    window.location.reload();
                } else {
                    alert('Erro ao excluir: ' + data.message);
                    hideLoading();
                }
            } catch (error) {
                alert('Erro de conexão');
                hideLoading();
            }
        }
    );
}