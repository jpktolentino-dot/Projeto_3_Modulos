// static/js/modulo_checklist.js

// ==================== VARIÁVEIS GLOBAIS ====================
let equipamentoAtualId = null;
let itensExtraidos = [];
let itemParaExcluir = null;
let checklistAtualId = null;
let itemObservacaoAtual = { checklistId: null, itemId: null };

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    inicializarComponentes();
    configurarEventListeners();
    
    // Inicializar estatísticas se estiver em um checklist
    if (document.getElementById('checklist-items-container')) {
        atualizarEstatisticas();
    }
});

function inicializarComponentes() {
    configurarDragAndDrop();
    configurarFechamentoModais();
}

function configurarEventListeners() {
    // Fechar modais com ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            fecharTodosModais();
        }
    });
}

function configurarFechamentoModais() {
    // Fechar modais ao clicar fora
    window.onclick = function(event) {
        const modais = obterListaModais();
        modais.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target == modal) {
                modal.classList.remove('active');
            }
        });
    };
}

function fecharTodosModais() {
    const modais = obterListaModais();
    modais.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

function obterListaModais() {
    return [
        'modalConfirmacao',
        'modalGerenciarEquipamentos',
        'modalEquipamento',
        'modalItensPadrao',
        'modalItemPadrao',
        'modalUploadPDF',
        'modalProcessarTexto',
        'modalPreview',
        'modalAdicionarItem',
        'modalMultiplasLinhas',
        'modalObservacao'
    ];
}

// ==================== FUNÇÕES DE UPLOAD DE PDF ====================

function abrirModalUploadPDF() {
    document.getElementById('modalUploadPDF').classList.add('active');
    resetUploadForm();
}

function fecharModalUploadPDF() {
    document.getElementById('modalUploadPDF').classList.remove('active');
    resetUploadForm();
}

function resetUploadForm() {
    const form = document.getElementById('formUploadPDF');
    if (form) form.reset();
    
    const uploadProgress = document.getElementById('uploadProgress');
    const previewArea = document.getElementById('previewArea');
    const fileInfo = document.getElementById('fileInfo');
    const btnUpload = document.getElementById('btnUploadPDF');
    const progressFill = document.getElementById('progressFill');
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (previewArea) previewArea.style.display = 'none';
    if (fileInfo) fileInfo.style.display = 'none';
    if (btnUpload) btnUpload.disabled = false;
    if (progressFill) progressFill.style.width = '0%';
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
        const fileName = document.getElementById('fileName');
        const fileInfo = document.getElementById('fileInfo');
        
        if (fileName) fileName.textContent = file.name;
        if (fileInfo) fileInfo.style.display = 'block';
    }
}

function configurarDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            const fileInput = document.getElementById('pdfFile');
            if (fileInput) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(fileInput);
            }
        } else {
            mostrarToast('Por favor, arraste apenas arquivos PDF', 'error');
        }
    });
}

async function uploadChecklistPDF(event) {
    event.preventDefault();
    
    const equipamentoId = document.getElementById('uploadEquipamentoId')?.value;
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput?.files[0];
    
    if (!equipamentoId || !file) {
        mostrarToast('Selecione um equipamento e um arquivo PDF', 'error');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        mostrarToast('Arquivo muito grande. Tamanho máximo: 16MB', 'error');
        return;
    }
    
    mostrarProgressoUpload();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('equipamento_id', equipamentoId);
    
    try {
        const response = await fetch('/api/upload-checklist-pdf', {
            method: 'POST',
            body: formData
        });
        
        atualizarProgresso(80, 'Processando resposta...');
        
        const data = await response.json();
        
        atualizarProgresso(100, '✅ Processado!');
        
        if (data.success) {
            mostrarToast(data.message, 'success');
            if (data.itens && data.itens.length > 0) {
                itensExtraidos = data.itens;
                mostrarPreviewItens(data.itens, equipamentoId);
            } else {
                setTimeout(() => {
                    fecharModalUploadPDF();
                    window.location.reload();
                }, 1500);
            }
        } else {
            mostrarToast(data.message || 'Erro ao processar PDF', 'error');
            document.getElementById('btnUploadPDF').disabled = false;
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        mostrarToast('Erro de conexão: ' + error.message, 'error');
        document.getElementById('btnUploadPDF').disabled = false;
    }
}

function mostrarProgressoUpload() {
    const uploadProgress = document.getElementById('uploadProgress');
    const btnUpload = document.getElementById('btnUploadPDF');
    const progressStatus = document.getElementById('progressStatus');
    const progressFill = document.getElementById('progressFill');
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (btnUpload) btnUpload.disabled = true;
    if (progressStatus) progressStatus.textContent = 'Enviando arquivo...';
    if (progressFill) progressFill.style.width = '30%';
}

function atualizarProgresso(percentual, mensagem) {
    const progressStatus = document.getElementById('progressStatus');
    const progressFill = document.getElementById('progressFill');
    
    if (progressFill) progressFill.style.width = percentual + '%';
    if (progressStatus && mensagem) progressStatus.textContent = mensagem;
}

// ==================== FUNÇÕES DE PROCESSAMENTO DE TEXTO ====================

function abrirModalProcessarTexto() {
    const modal = document.getElementById('modalProcessarTexto');
    if (modal) {
        modal.classList.add('active');
        fecharModalItensPadrao();
    }
}

function fecharModalProcessarTexto() {
    const modal = document.getElementById('modalProcessarTexto');
    const form = document.getElementById('formProcessarTexto');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

async function processarTextoChecklist(event) {
    event.preventDefault();
    
    const equipamentoId = document.getElementById('textoEquipamentoId')?.value;
    const texto = document.getElementById('checklistTexto')?.value;
    
    if (!equipamentoId || !texto) {
        mostrarToast('Selecione um equipamento e insira o texto', 'error');
        return;
    }
    
    if (texto.length < 50) {
        mostrarToast('Texto muito curto. Insira um checklist completo.', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/processar-checklist-texto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipamento_id: equipamentoId,
                texto: texto
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            itensExtraidos = data.itens || [];
            mostrarToast(`${itensExtraidos.length} itens extraídos com sucesso!`, 'success');
            mostrarPreviewItens(itensExtraidos, equipamentoId);
            fecharModalProcessarTexto();
        } else {
            mostrarToast(data.message || 'Erro ao processar texto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNÇÕES DE PREVIEW E IMPORTAÇÃO ====================

function mostrarPreviewItens(itens, equipamentoId) {
    const previewContent = document.getElementById('previewContent');
    const modal = document.getElementById('modalPreview');
    const itemCount = document.getElementById('itemCount');
    
    if (!previewContent || !modal) return;
    
    const itensPorSistema = agruparItensPorSistema(itens);
    
    let html = '<h4>Itens Encontrados:</h4>';
    html += '<div style="margin-top:15px; max-height: 400px; overflow-y: auto;">';
    
    html += `
        <div style="background: #e9eff5; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
            <strong>Total:</strong> ${itens.length} itens | 
            <strong>Sistemas:</strong> ${Object.keys(itensPorSistema).length}
        </div>
    `;
    
    for (const [sistema, itensDoSistema] of Object.entries(itensPorSistema)) {
        html += gerarHtmlSistemaPreview(sistema, itensDoSistema);
    }
    
    html += '</div>';
    
    if (itemCount) {
        itemCount.textContent = ` ${itens.length} itens`;
    }
    
    previewContent.innerHTML = html;
    modal.classList.add('active');
    
    configurarBotaoConfirmarImportacao(equipamentoId);
}

function agruparItensPorSistema(itens) {
    const itensPorSistema = {};
    itens.forEach(item => {
        const sistema = item.sistema || 'Geral';
        if (!itensPorSistema[sistema]) {
            itensPorSistema[sistema] = [];
        }
        itensPorSistema[sistema].push(item);
    });
    return itensPorSistema;
}

function gerarHtmlSistemaPreview(sistema, itens) {
    let html = `
        <div style="margin-bottom: 15px;">
            <h5 style="color: #20643f; margin-bottom: 8px;">
                <i class="fas fa-folder"></i> ${sistema} (${itens.length})
            </h5>
    `;
    
    itens.forEach((item, index) => {
        const conformeClass = item.conforme === 'Sim' ? 'badge-success' : 
                             item.conforme === 'Não' ? 'badge-error' : 'badge-warning';
        
        html += `
            <div class="preview-item">
                <i class="fas fa-check-circle" style="color: #40b049;"></i>
                <div style="flex:1;">
                    <div><strong>${item.ponto_inspecao || item.descricao || 'Item sem descrição'}</strong></div>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <span class="sistema">${item.sistema || 'Geral'}</span>
                        ${item.conforme ? `<span class="${conformeClass}">${item.conforme}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function configurarBotaoConfirmarImportacao(equipamentoId) {
    const btnConfirmar = document.getElementById('btnConfirmarImportacao');
    if (btnConfirmar) {
        btnConfirmar.onclick = () => confirmarImportacao(equipamentoId);
    }
}

function fecharModalPreview() {
    const modal = document.getElementById('modalPreview');
    if (modal) modal.classList.remove('active');
}

async function confirmarImportacao(equipamentoId) {
    if (!itensExtraidos || itensExtraidos.length === 0) {
        mostrarToast('Nenhum item para importar', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        let itensImportados = 0;
        let itensComErro = 0;
        
        for (const item of itensExtraidos) {
            const descricao = item.ponto_inspecao || item.descricao;
            if (!descricao) continue;
            
            try {
                const response = await fetch(`/api/equipamentos/${equipamentoId}/itens-padrao`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sistema: item.sistema || 'Geral',
                        descricao: descricao,
                        ordem: item.ordem || 0
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    itensImportados++;
                } else {
                    itensComErro++;
                }
            } catch (error) {
                console.error('Erro ao importar item:', error);
                itensComErro++;
            }
        }
        
        fecharModalPreview();
        
        if (itensComErro === 0) {
            mostrarToast(`✅ ${itensImportados} itens importados com sucesso!`, 'success');
        } else {
            mostrarToast(`⚠️ ${itensImportados} importados, ${itensComErro} falhas`, 'warning');
        }
        
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (error) {
        console.error('Erro na importação:', error);
        mostrarToast('Erro ao importar itens: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNÇÕES DE TESTE DA API GROQ ====================

async function testarGroqAPI() {
    showLoading();
    
    try {
        const response = await fetch('/api/testar-groq');
        const data = await response.json();
        
        if (data.success) {
            mostrarToast('✅ API Groq está funcionando!', 'success');
            console.log('Resposta da API:', data.resposta);
        } else {
            mostrarToast('❌ Erro na API Groq: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE EQUIPAMENTOS ====================

function abrirModalGerenciarEquipamentos() {
    const modal = document.getElementById('modalGerenciarEquipamentos');
    if (modal) modal.classList.add('active');
}

function fecharModalGerenciarEquipamentos() {
    const modal = document.getElementById('modalGerenciarEquipamentos');
    if (modal) modal.classList.remove('active');
}

function abrirModalCadastroEquipamento() {
    const modalTitulo = document.getElementById('modalEquipamentoTitulo');
    const equipamentoId = document.getElementById('equipamentoId');
    const form = document.getElementById('formEquipamento');
    const modal = document.getElementById('modalEquipamento');
    
    if (modalTitulo) modalTitulo.textContent = 'Cadastrar Equipamento';
    if (equipamentoId) equipamentoId.value = '';
    if (form) form.reset();
    if (modal) modal.classList.add('active');
    
    fecharModalGerenciarEquipamentos();
}

function fecharModalEquipamento() {
    const modal = document.getElementById('modalEquipamento');
    if (modal) modal.classList.remove('active');
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
            
            const tipoInput = document.getElementById('equipamentoTipo');
            if (tipoInput) {
                tipoInput.value = equipamento.tipo || '';
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
    
    const id = document.getElementById('equipamentoId')?.value;
    const equipamento = {
        nome: document.getElementById('equipamentoNome')?.value,
        modelo: document.getElementById('equipamentoModelo')?.value || '',
        fabricante: document.getElementById('equipamentoFabricante')?.value || '',
        tipo: document.getElementById('equipamentoTipo')?.value || '',
        manual_pdf: document.getElementById('equipamentoManual')?.value || ''
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

// ==================== FUNÇÕES DE ITENS PADRÃO ====================

async function gerenciarItensPadrao(equipamentoId, equipamentoNome) {
    equipamentoAtualId = equipamentoId;
    
    const modalTitulo = document.getElementById('modalItensTitulo');
    const itemEquipamentoId = document.getElementById('itemPadraoEquipamentoId');
    
    if (modalTitulo) modalTitulo.textContent = `Itens - ${equipamentoNome}`;
    if (itemEquipamentoId) itemEquipamentoId.value = equipamentoId;
    
    await carregarItensPadrao(equipamentoId);
    
    const modal = document.getElementById('modalItensPadrao');
    if (modal) modal.classList.add('active');
    
    fecharModalGerenciarEquipamentos();
}

async function carregarItensPadrao(equipamentoId) {
    try {
        const response = await fetch(`/api/equipamentos/${equipamentoId}/itens-padrao`);
        const itens = await response.json();
        
        const container = document.getElementById('itensPadraoList');
        if (!container) return;
        
        if (itens.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#5a6f84; padding: 20px;">Nenhum item cadastrado</p>';
            return;
        }
        
        let html = '';
        itens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).forEach(item => {
            html += `
                <div class="item-padrao">
                    <div class="item-padrao-info">
                        <div class="item-padrao-sistema">${item.sistema || 'Geral'}</div>
                        <div class="item-padrao-descricao">${item.descricao}</div>
                        <div class="item-padrao-ordem">Ordem: ${item.ordem || 0}</div>
                    </div>
                    <div class="equipamento-actions">
                        <button class="action-btn edit" onclick="editarItemPadrao(${item.id}, '${item.sistema?.replace(/'/g, "\\'") || ''}', '${item.descricao.replace(/'/g, "\\'")}', ${item.ordem || 0})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="confirmarExcluirItemPadrao(${item.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        mostrarToast('Erro ao carregar itens', 'error');
    }
}

function fecharModalItensPadrao() {
    const modal = document.getElementById('modalItensPadrao');
    if (modal) modal.classList.remove('active');
    equipamentoAtualId = null;
}

function abrirModalItemPadrao() {
    const modalTitulo = document.getElementById('modalItemTitulo');
    const itemId = document.getElementById('itemPadraoId');
    const form = document.getElementById('formItemPadrao');
    const modal = document.getElementById('modalItemPadrao');
    
    if (modalTitulo) modalTitulo.textContent = 'Novo Item';
    if (itemId) itemId.value = '';
    if (form) form.reset();
    if (modal) modal.classList.add('active');
}

function fecharModalItemPadrao() {
    const modal = document.getElementById('modalItemPadrao');
    if (modal) modal.classList.remove('active');
}

function editarItemPadrao(id, sistema, descricao, ordem) {
    document.getElementById('modalItemTitulo').textContent = 'Editar Item';
    document.getElementById('itemPadraoId').value = id;
    document.getElementById('itemPadraoSistema').value = sistema;
    document.getElementById('itemPadraoDescricao').value = descricao;
    document.getElementById('itemPadraoOrdem').value = ordem;
    document.getElementById('modalItemPadrao').classList.add('active');
}

async function salvarItemPadrao(event) {
    event.preventDefault();
    
    const id = document.getElementById('itemPadraoId')?.value;
    const equipamentoId = equipamentoAtualId;
    const item = {
        sistema: document.getElementById('itemPadraoSistema')?.value || 'Geral',
        descricao: document.getElementById('itemPadraoDescricao')?.value,
        ordem: parseInt(document.getElementById('itemPadraoOrdem')?.value) || 0
    };

    if (!equipamentoId) {
        mostrarToast('Erro: ID do equipamento não encontrado', 'error');
        return;
    }

    if (!item.descricao) {
        mostrarToast('Descrição do item é obrigatória', 'error');
        return;
    }

    showLoading();

    try {
        let response;
        if (id) {
            mostrarToast('Edição de item será implementada em breve', 'warning');
            hideLoading();
            return;
        } else {
            response = await fetch(`/api/equipamentos/${equipamentoId}/itens-padrao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }

        const data = await response.json();

        if (data.success) {
            fecharModalItemPadrao();
            await carregarItensPadrao(equipamentoId);
            mostrarToast('Item adicionado com sucesso!', 'success');
            hideLoading();
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

function confirmarExcluirItemPadrao(id) {
    itemParaExcluir = id;
    mostrarConfirmacao(
        'Excluir Item',
        'Tem certeza que deseja excluir este item do checklist?',
        async () => {
            showLoading();
            try {
                const response = await fetch(`/api/equipamentos/itens-padrao/${itemParaExcluir}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    await carregarItensPadrao(equipamentoAtualId);
                    mostrarToast('Item excluído com sucesso!', 'success');
                    hideLoading();
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

// ==================== FUNÇÕES DO CHECKLIST ====================

function iniciarChecklist(equipamentoId) {
    if (!equipamentoId) {
        mostrarToast('Selecione um equipamento', 'warning');
        return;
    }

    showLoading();

    fetch('/api/checklist/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipamento_id: equipamentoId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/modulo/checklist?checklist_id=' + data.checklist_id;
        } else {
            mostrarToast('Erro: ' + data.message, 'error');
            hideLoading();
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
        hideLoading();
    });
}

async function atualizarItem(checklistId, itemId, concluido) {
    try {
        const response = await fetch(`/api/checklist/${checklistId}/item/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concluido: concluido })
        });

        const data = await response.json();
        
        if (!data.success) {
            mostrarToast('Erro ao atualizar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    }
}

// ==================== NOVAS FUNÇÕES PARA O CHECKLIST ====================

// Atualizar estatísticas do checklist
function atualizarEstatisticas() {
    const linhas = document.querySelectorAll('.checklist-row');
    let totalSim = 0, totalNao = 0, totalNA = 0;
    
    linhas.forEach(linha => {
        const statusSim = linha.querySelector('.status-option.sim.active');
        const statusNao = linha.querySelector('.status-option.nao.active');
        const statusNA = linha.querySelector('.status-option.na.active');
        
        if (statusSim) totalSim++;
        if (statusNao) totalNao++;
        if (statusNA) totalNA++;
    });
    
    const totalSimElement = document.getElementById('totalSim');
    const totalNaoElement = document.getElementById('totalNao');
    const totalNAElement = document.getElementById('totalNA');
    
    if (totalSimElement) totalSimElement.textContent = totalSim;
    if (totalNaoElement) totalNaoElement.textContent = totalNao;
    if (totalNAElement) totalNAElement.textContent = totalNA;
}

// Atualizar status de um item
async function atualizarStatusItem(checklistId, itemId, status) {
    try {
        const response = await fetch(`/api/checklist/${checklistId}/item/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });

        const data = await response.json();
        
        if (data.success) {
            // Atualizar UI
            const linha = document.querySelector(`.checklist-row[data-item-id="${itemId}"]`);
            if (linha) {
                // Remover classe active de todos os botões de status
                linha.querySelectorAll('.status-option').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Adicionar classe active ao botão clicado
                const botoes = linha.querySelectorAll('.status-option');
                if (status === 'sim') botoes[0].classList.add('active');
                if (status === 'nao') botoes[1].classList.add('active');
                if (status === 'na') botoes[2].classList.add('active');
            }
            
            atualizarEstatisticas();
        } else {
            mostrarToast('Erro ao atualizar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    }
}

// Abrir modal para adicionar observação
function abrirModalObservacao(checklistId, itemId, observacaoAtual) {
    itemObservacaoAtual = { checklistId, itemId };
    document.getElementById('observacaoChecklistId').value = checklistId;
    document.getElementById('observacaoItemId').value = itemId;
    document.getElementById('observacaoTexto').value = observacaoAtual || '';
    document.getElementById('modalObservacao').classList.add('active');
}

// Fechar modal de observação
function fecharModalObservacao() {
    document.getElementById('modalObservacao').classList.remove('active');
    itemObservacaoAtual = { checklistId: null, itemId: null };
}

// Salvar observação do item
async function salvarObservacao() {
    const { checklistId, itemId } = itemObservacaoAtual;
    const observacao = document.getElementById('observacaoTexto').value;
    
    if (!checklistId || !itemId) return;
    
    try {
        const response = await fetch(`/api/checklist/${checklistId}/item/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observacao: observacao })
        });

        const data = await response.json();
        
        if (data.success) {
            mostrarToast('Observação salva!', 'success');
            fecharModalObservacao();
            
            // Atualizar UI
            const linha = document.querySelector(`.checklist-row[data-item-id="${itemId}"] .checklist-descricao`);
            if (linha) {
                // Remover observação antiga se existir
                const obsAntiga = linha.querySelector('small');
                if (obsAntiga) obsAntiga.remove();
                
                // Adicionar nova observação se não estiver vazia
                if (observacao) {
                    const obsElement = document.createElement('small');
                    obsElement.innerHTML = `<i class="fas fa-comment"></i> ${observacao}`;
                    linha.appendChild(obsElement);
                }
            }
        } else {
            mostrarToast('Erro ao salvar observação', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    }
}

// Abrir modal para adicionar item
function abrirModalAdicionarItem() {
    document.getElementById('modalAdicionarItem').classList.add('active');
}

// Fechar modal de adicionar item
function fecharModalAdicionarItem() {
    document.getElementById('modalAdicionarItem').classList.remove('active');
    document.getElementById('novoItemDescricao').value = '';
}

// Adicionar item ao checklist
async function adicionarItemChecklist() {
    const descricao = document.getElementById('novoItemDescricao').value;
    const checklistId = obterChecklistIdAtual();
    
    if (!descricao) {
        mostrarToast('Digite a descrição do item', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/checklist/${checklistId}/itens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descricao: descricao })
        });

        const data = await response.json();
        
        if (data.success) {
            mostrarToast('Item adicionado!', 'success');
            fecharModalAdicionarItem();
            
            // Adicionar item à UI
            adicionarItemNaUI(checklistId, data.item_id, descricao);
        } else {
            mostrarToast('Erro ao adicionar item', 'error');
            hideLoading();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
        hideLoading();
    }
}

// Adicionar item à interface
function adicionarItemNaUI(checklistId, itemId, descricao) {
    const container = document.getElementById('checklist-items-container');
    
    const novaLinha = document.createElement('div');
    novaLinha.className = 'checklist-row';
    novaLinha.setAttribute('data-item-id', itemId);
    
    novaLinha.innerHTML = `
        <div class="checklist-descricao">
            ${descricao}
        </div>
        <div class="checklist-status-group">
            <button class="status-option sim" onclick="atualizarStatusItem(${checklistId}, ${itemId}, 'sim')">SIM</button>
            <button class="status-option nao" onclick="atualizarStatusItem(${checklistId}, ${itemId}, 'nao')">NÃO</button>
            <button class="status-option na" onclick="atualizarStatusItem(${checklistId}, ${itemId}, 'na')">N/A</button>
        </div>
        <div class="checklist-actions">
            <button class="edit" onclick="abrirModalObservacao(${checklistId}, ${itemId}, '')" title="Adicionar observação">
                <i class="fas fa-comment"></i>
            </button>
            <button class="delete" onclick="removerItemChecklist(${checklistId}, ${itemId})" title="Remover item">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(novaLinha);
    
    // Atualizar contagem total
    const totalItens = document.querySelectorAll('.checklist-row').length;
    const totalElement = document.querySelector('.stat-card.total .stat-info h4');
    if (totalElement) totalElement.textContent = totalItens;
    
    hideLoading();
}

// Remover item do checklist
async function removerItemChecklist(checklistId, itemId) {
    mostrarConfirmacao(
        'Remover Item',
        'Tem certeza que deseja remover este item do checklist?',
        async () => {
            showLoading();
            
            try {
                const response = await fetch(`/api/checklist/${checklistId}/item/${itemId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();
                
                if (data.success) {
                    mostrarToast('Item removido!', 'success');
                    
                    // Remover da UI
                    const linha = document.querySelector(`.checklist-row[data-item-id="${itemId}"]`);
                    if (linha) linha.remove();
                    
                    // Atualizar contagem e estatísticas
                    const totalItens = document.querySelectorAll('.checklist-row').length;
                    const totalElement = document.querySelector('.stat-card.total .stat-info h4');
                    if (totalElement) totalElement.textContent = totalItens;
                    
                    atualizarEstatisticas();
                } else {
                    mostrarToast('Erro ao remover item', 'error');
                }
            } catch (error) {
                console.error('Erro:', error);
                mostrarToast('Erro de conexão', 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// Obter ID do checklist atual da URL
function obterChecklistIdAtual() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('checklist_id');
}

// Adicionar múltiplas linhas em branco
function adicionarLinhasEmBranco() {
    const qtd = parseInt(document.getElementById('qtdLinhas')?.value) || 5;
    abrirModalMultiplasLinhas(qtd);
}

// Abrir modal para adicionar múltiplas linhas
function abrirModalMultiplasLinhas(qtdSugerida) {
    document.getElementById('qtdMultiplasLinhas').value = qtdSugerida || 5;
    document.getElementById('prefixoLinhas').value = '';
    document.getElementById('modalMultiplasLinhas').classList.add('active');
}

// Fechar modal de múltiplas linhas
function fecharModalMultiplasLinhas() {
    document.getElementById('modalMultiplasLinhas').classList.remove('active');
}

// Adicionar múltiplas linhas
async function adicionarMultiplasLinhas() {
    const qtd = parseInt(document.getElementById('qtdMultiplasLinhas').value);
    const prefixo = document.getElementById('prefixoLinhas').value;
    const checklistId = obterChecklistIdAtual();
    
    if (qtd < 1 || qtd > 20) {
        mostrarToast('Quantidade deve ser entre 1 e 20', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        let sucessos = 0;
        
        for (let i = 1; i <= qtd; i++) {
            const descricao = prefixo ? `${prefixo} ${i}` : `Item ${i}`;
            
            const response = await fetch(`/api/checklist/${checklistId}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descricao: descricao })
            });
            
            const data = await response.json();
            if (data.success) {
                sucessos++;
                adicionarItemNaUI(checklistId, data.item_id, descricao);
            }
        }
        
        mostrarToast(`${sucessos} de ${qtd} itens adicionados!`, sucessos === qtd ? 'success' : 'warning');
        fecharModalMultiplasLinhas();
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

// Sobrescrever a função finalizarChecklist para incluir estatísticas
function finalizarChecklist(checklistId) {
    const observacoes = document.getElementById('observacoes')?.value || '';
    
    // Calcular estatísticas para mostrar no relatório
    const totalSim = document.getElementById('totalSim')?.textContent || '0';
    const totalNao = document.getElementById('totalNao')?.textContent || '0';
    const totalNA = document.getElementById('totalNA')?.textContent || '0';
    const totalItens = document.querySelectorAll('.checklist-row').length;
    
    const mensagemConfirmacao = `Total de itens: ${totalItens}\n✓ Conforme: ${totalSim}\n✗ Não conforme: ${totalNao}\n- Não aplicável: ${totalNA}\n\nTem certeza que deseja finalizar este checklist?`;
    
    mostrarConfirmacao(
        'Concluir Checklist',
        mensagemConfirmacao,
        async () => {
            showLoading();
            
            try {
                const response = await fetch(`/api/checklist/${checklistId}/finalizar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ observacoes: observacoes })
                });

                const data = await response.json();

                if (data.success) {
                    mostrarToast('Checklist finalizado com sucesso! Relatório enviado.', 'success');
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
    );
}

// Função original para visualizar relatório
function visualizarRelatorio(checklistId) {
    mostrarToast('Relatório do checklist #' + checklistId, 'info');
}

// Função para confirmar exclusão de checklist
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
                    mostrarToast('Checklist excluído com sucesso!', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarToast('Erro ao excluir: ' + data.message, 'error');
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

// ==================== FUNÇÕES DE TOAST ====================

function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
    let container = document.getElementById('toastContainer');
    
    if (!container) {
        container = document.createElement('div');
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
    }
    
    const toast = document.createElement('div');
    const config = obterConfigToast(tipo);
    
    toast.style.cssText = `
        background: ${config.bgColor};
        color: ${config.textColor};
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        border-left: 4px solid ${config.iconColor};
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        cursor: pointer;
        font-size: 0.95rem;
    `;
    
    toast.innerHTML = `
        <i class="fas ${config.icon}" style="color: ${config.iconColor}; font-size: 1.2rem;"></i>
        <div style="flex: 1;">${mensagem}</div>
    `;
    
    toast.onclick = () => toast.remove();
    
    container.appendChild(toast);
    
    adicionarAnimacaoCSS();
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

function obterConfigToast(tipo) {
    switch (tipo) {
        case 'success':
            return {
                bgColor: '#d4edda',
                textColor: '#155724',
                icon: 'fa-check-circle',
                iconColor: '#28a745'
            };
        case 'error':
            return {
                bgColor: '#f8d7da',
                textColor: '#721c24',
                icon: 'fa-exclamation-circle',
                iconColor: '#dc3545'
            };
        case 'warning':
            return {
                bgColor: '#fff3cd',
                textColor: '#856404',
                icon: 'fa-exclamation-triangle',
                iconColor: '#ffc107'
            };
        default:
            return {
                bgColor: '#d1ecf1',
                textColor: '#0c5460',
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
    const modal = document.getElementById('modalConfirmacao');
    if (modal) modal.classList.remove('active');
}

function mostrarConfirmacao(titulo, mensagem, callback) {
    const modal = document.getElementById('modalConfirmacao');
    const modalMensagem = document.getElementById('modalMensagem');
    const modalTitulo = document.querySelector('#modalConfirmacao .modal-header h3');
    const confirmarBtn = document.getElementById('modalConfirmarBtn');
    
    if (modalMensagem) modalMensagem.textContent = mensagem;
    if (modalTitulo) modalTitulo.textContent = titulo;
    
    if (confirmarBtn) {
        confirmarBtn.onclick = function() {
            fecharModalConfirmacao();
            callback();
        };
    }
    
    if (modal) modal.classList.add('active');
}

// ==================== EXPORTAÇÃO DAS FUNÇÕES PARA O ESCOPO GLOBAL ====================

window.abrirModalUploadPDF = abrirModalUploadPDF;
window.fecharModalUploadPDF = fecharModalUploadPDF;
window.handleFileSelect = handleFileSelect;
window.uploadChecklistPDF = uploadChecklistPDF;
window.abrirModalProcessarTexto = abrirModalProcessarTexto;
window.fecharModalProcessarTexto = fecharModalProcessarTexto;
window.processarTextoChecklist = processarTextoChecklist;
window.fecharModalPreview = fecharModalPreview;
window.testarGroqAPI = testarGroqAPI;
window.abrirModalGerenciarEquipamentos = abrirModalGerenciarEquipamentos;
window.fecharModalGerenciarEquipamentos = fecharModalGerenciarEquipamentos;
window.abrirModalCadastroEquipamento = abrirModalCadastroEquipamento;
window.fecharModalEquipamento = fecharModalEquipamento;
window.editarEquipamento = editarEquipamento;
window.salvarEquipamento = salvarEquipamento;
window.confirmarExcluirEquipamento = confirmarExcluirEquipamento;
window.gerenciarItensPadrao = gerenciarItensPadrao;
window.fecharModalItensPadrao = fecharModalItensPadrao;
window.abrirModalItemPadrao = abrirModalItemPadrao;
window.fecharModalItemPadrao = fecharModalItemPadrao;
window.editarItemPadrao = editarItemPadrao;
window.salvarItemPadrao = salvarItemPadrao;
window.confirmarExcluirItemPadrao = confirmarExcluirItemPadrao;
window.iniciarChecklist = iniciarChecklist;
window.atualizarItem = atualizarItem;
window.visualizarRelatorio = visualizarRelatorio;
window.confirmarExcluirChecklist = confirmarExcluirChecklist;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// NOVAS FUNÇÕES EXPORTADAS
window.atualizarStatusItem = atualizarStatusItem;
window.abrirModalObservacao = abrirModalObservacao;
window.fecharModalObservacao = fecharModalObservacao;
window.salvarObservacao = salvarObservacao;
window.abrirModalAdicionarItem = abrirModalAdicionarItem;
window.fecharModalAdicionarItem = fecharModalAdicionarItem;
window.adicionarItemChecklist = adicionarItemChecklist;
window.removerItemChecklist = removerItemChecklist;
window.adicionarLinhasEmBranco = adicionarLinhasEmBranco;
window.abrirModalMultiplasLinhas = abrirModalMultiplasLinhas;
window.fecharModalMultiplasLinhas = fecharModalMultiplasLinhas;
window.adicionarMultiplasLinhas = adicionarMultiplasLinhas;
window.finalizarChecklist = finalizarChecklist;