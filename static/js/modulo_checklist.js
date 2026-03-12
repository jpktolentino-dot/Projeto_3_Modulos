// static/js/modulo_checklist.js

// Variáveis globais
let equipamentoAtualId = null;
let itensExtraidos = [];
let itemParaExcluir = null;
let chamadoAtualId = null;

// ==================== FUNÇÕES DE UPLOAD DE PDF ====================

/**
 * Abre o modal de upload de PDF
 */
function abrirModalUploadPDF() {
    const modal = document.getElementById('modalUploadPDF');
    if (modal) {
        modal.classList.add('active');
        resetUploadForm();
    }
}

/**
 * Fecha o modal de upload de PDF
 */
function fecharModalUploadPDF() {
    const modal = document.getElementById('modalUploadPDF');
    if (modal) {
        modal.classList.remove('active');
        resetUploadForm();
    }
}

/**
 * Reseta o formulário de upload
 */
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

/**
 * Manipula a seleção de arquivo
 */
function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
        const fileName = document.getElementById('fileName');
        const fileInfo = document.getElementById('fileInfo');
        
        if (fileName) fileName.textContent = file.name;
        if (fileInfo) fileInfo.style.display = 'block';
    }
}

/**
 * Configura o drag and drop para upload de PDF
 */
function setupDragAndDrop() {
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

/**
 * Faz upload e processa o PDF com a API Groq
 */
async function uploadChecklistPDF(event) {
    event.preventDefault();
    
    const equipamentoId = document.getElementById('uploadEquipamentoId')?.value;
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput?.files[0];
    
    if (!equipamentoId || !file) {
        mostrarToast('Selecione um equipamento e um arquivo PDF', 'error');
        return;
    }
    
    // Validar tamanho do arquivo (16MB max)
    if (file.size > 16 * 1024 * 1024) {
        mostrarToast('Arquivo muito grande. Tamanho máximo: 16MB', 'error');
        return;
    }
    
    // Mostrar progresso
    const uploadProgress = document.getElementById('uploadProgress');
    const btnUpload = document.getElementById('btnUploadPDF');
    const progressStatus = document.getElementById('progressStatus');
    const progressFill = document.getElementById('progressFill');
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (btnUpload) btnUpload.disabled = true;
    if (progressStatus) progressStatus.textContent = 'Enviando arquivo...';
    if (progressFill) progressFill.style.width = '30%';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('equipamento_id', equipamentoId);
    
    try {
        const response = await fetch('/api/upload-checklist-pdf', {
            method: 'POST',
            body: formData
        });
        
        if (progressFill) progressFill.style.width = '80%';
        if (progressStatus) progressStatus.textContent = 'Processando resposta...';
        
        const data = await response.json();
        
        if (progressFill) progressFill.style.width = '100%';
        
        if (data.success) {
            if (progressStatus) progressStatus.textContent = '✅ PDF processado com sucesso!';
            mostrarToast(data.message, 'success');
            
            // Se houver preview dos itens, mostrar
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
            if (progressStatus) progressStatus.textContent = '❌ Erro no processamento';
            mostrarToast(data.message || 'Erro ao processar PDF', 'error');
            if (btnUpload) btnUpload.disabled = false;
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        if (progressStatus) progressStatus.textContent = '❌ Erro de conexão';
        mostrarToast('Erro de conexão: ' + error.message, 'error');
        if (btnUpload) btnUpload.disabled = false;
    }
}

// ==================== FUNÇÕES DE PROCESSAMENTO DE TEXTO ====================

/**
 * Abre o modal de processamento de texto
 */
function abrirModalProcessarTexto() {
    const modal = document.getElementById('modalProcessarTexto');
    if (modal) {
        modal.classList.add('active');
        fecharModalItensPadrao();
    }
}

/**
 * Fecha o modal de processamento de texto
 */
function fecharModalProcessarTexto() {
    const modal = document.getElementById('modalProcessarTexto');
    const form = document.getElementById('formProcessarTexto');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

/**
 * Processa texto de checklist manualmente
 */
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
            headers: {
                'Content-Type': 'application/json',
            },
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

/**
 * Mostra preview dos itens extraídos
 */
function mostrarPreviewItens(itens, equipamentoId) {
    const previewContent = document.getElementById('previewContent');
    const modal = document.getElementById('modalPreview');
    const itemCount = document.getElementById('itemCount');
    
    if (!previewContent || !modal) return;
    
    // Agrupar itens por sistema (se disponível)
    const itensPorSistema = {};
    itens.forEach(item => {
        const sistema = item.sistema || 'Geral';
        if (!itensPorSistema[sistema]) {
            itensPorSistema[sistema] = [];
        }
        itensPorSistema[sistema].push(item);
    });
    
    let html = '<h4>Itens Encontrados:</h4>';
    html += '<div style="margin-top:15px; max-height: 400px; overflow-y: auto;">';
    
    // Mostrar estatísticas
    html += `
        <div style="background: #e9eff5; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
            <strong>Total:</strong> ${itens.length} itens | 
            <strong>Sistemas:</strong> ${Object.keys(itensPorSistema).length}
        </div>
    `;
    
    // Mostrar itens por sistema
    for (const [sistema, itensDoSistema] of Object.entries(itensPorSistema)) {
        html += `
            <div style="margin-bottom: 15px;">
                <h5 style="color: #20643f; margin-bottom: 8px;">
                    <i class="fas fa-folder"></i> ${sistema} (${itensDoSistema.length})
                </h5>
        `;
        
        itensDoSistema.forEach((item, index) => {
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
    }
    
    html += '</div>';
    
    if (itemCount) {
        itemCount.textContent = ` ${itens.length} itens`;
    }
    
    previewContent.innerHTML = html;
    modal.classList.add('active');
    
    // Configurar botão de confirmação
    const btnConfirmar = document.getElementById('btnConfirmarImportacao');
    if (btnConfirmar) {
        btnConfirmar.onclick = () => confirmarImportacao(equipamentoId);
    }
}

/**
 * Fecha o modal de preview
 */
function fecharModalPreview() {
    const modal = document.getElementById('modalPreview');
    if (modal) modal.classList.remove('active');
}

/**
 * Confirma a importação dos itens extraídos
 */
async function confirmarImportacao(equipamentoId) {
    if (!itensExtraidos || itensExtraidos.length === 0) {
        mostrarToast('Nenhum item para importar', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        let itensImportados = 0;
        let itensComErro = 0;
        
        // Para cada item extraído, adicionar ao banco
        for (const item of itensExtraidos) {
            try {
                const descricao = item.ponto_inspecao || item.descricao;
                if (!descricao) continue;
                
                const response = await fetch(`/api/equipamentos/${equipamentoId}/itens-padrao`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
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
        
        // Recarregar a página após 1.5 segundos
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Erro na importação:', error);
        mostrarToast('Erro ao importar itens: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== FUNÇÕES DE TESTE DA API GROQ ====================

/**
 * Testa a conexão com a API Groq
 */
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

// ==================== FUNÇÕES DE TOAST ====================

/**
 * Mostra uma notificação toast
 */
function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
    // Verificar se já existe um container de toast
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
    
    // Definir cor baseada no tipo
    let bgColor, icon, iconColor;
    switch (tipo) {
        case 'success':
            bgColor = '#d4edda';
            icon = 'fa-check-circle';
            iconColor = '#28a745';
            break;
        case 'error':
            bgColor = '#f8d7da';
            icon = 'fa-exclamation-circle';
            iconColor = '#dc3545';
            break;
        case 'warning':
            bgColor = '#fff3cd';
            icon = 'fa-exclamation-triangle';
            iconColor = '#ffc107';
            break;
        default:
            bgColor = '#d1ecf1';
            icon = 'fa-info-circle';
            iconColor = '#17a2b8';
    }
    
    toast.style.cssText = `
        background: ${bgColor};
        color: ${tipo === 'warning' ? '#856404' : '#155724'};
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        border-left: 4px solid ${iconColor};
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        cursor: pointer;
        font-size: 0.95rem;
    `;
    
    toast.innerHTML = `
        <i class="fas ${icon}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
        <div style="flex: 1;">${mensagem}</div>
    `;
    
    toast.onclick = () => toast.remove();
    
    container.appendChild(toast);
    
    // Adicionar animação
    const style = document.createElement('style');
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
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE EQUIPAMENTOS ====================

/**
 * Abre o modal de gerenciamento de equipamentos
 */
function abrirModalGerenciarEquipamentos() {
    const modal = document.getElementById('modalGerenciarEquipamentos');
    if (modal) modal.classList.add('active');
}

/**
 * Fecha o modal de gerenciamento de equipamentos
 */
function fecharModalGerenciarEquipamentos() {
    const modal = document.getElementById('modalGerenciarEquipamentos');
    if (modal) modal.classList.remove('active');
}

/**
 * Abre o modal de cadastro de equipamento
 */
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

/**
 * Fecha o modal de equipamento
 */
function fecharModalEquipamento() {
    const modal = document.getElementById('modalEquipamento');
    if (modal) modal.classList.remove('active');
}

/**
 * Edita um equipamento existente
 */
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
            if (tipoSelect) {
                for (let i = 0; i < tipoSelect.options.length; i++) {
                    if (tipoSelect.options[i].value === equipamento.tipo) {
                        tipoSelect.selectedIndex = i;
                        break;
                    }
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

/**
 * Salva um equipamento (cria ou atualiza)
 */
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

/**
 * Confirma exclusão de equipamento
 */
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

/**
 * Gerencia os itens padrão de um equipamento
 */
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

/**
 * Carrega os itens padrão de um equipamento
 */
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
                <div class="item-padrao" style="background: #f9fbfd; border: 1px solid #e0e5ec; border-radius: 4px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                    <div class="item-padrao-info" style="flex: 1;">
                        <div class="item-padrao-sistema" style="font-size: 0.85rem; color: #40b049; font-weight: 600; margin-bottom: 4px;">${item.sistema || 'Geral'}</div>
                        <div class="item-padrao-descricao" style="font-size: 0.95rem;">${item.descricao}</div>
                        <div class="item-padrao-ordem" style="font-size: 0.8rem; color: #5a6f84;">Ordem: ${item.ordem || 0}</div>
                    </div>
                    <div class="equipamento-actions" style="display: flex; gap: 8px;">
                        <button class="action-btn edit" onclick="editarItemPadrao(${item.id}, '${item.sistema?.replace(/'/g, "\\'") || ''}', '${item.descricao.replace(/'/g, "\\'")}', ${item.ordem || 0})" title="Editar" style="background: none; border: none; width: 36px; height: 36px; border-radius: 4px; cursor: pointer; color: #5a6f84;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="confirmarExcluirItemPadrao(${item.id})" title="Excluir" style="background: none; border: none; width: 36px; height: 36px; border-radius: 4px; cursor: pointer; color: #5a6f84;">
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

/**
 * Fecha o modal de itens padrão
 */
function fecharModalItensPadrao() {
    const modal = document.getElementById('modalItensPadrao');
    if (modal) modal.classList.remove('active');
    equipamentoAtualId = null;
}

/**
 * Abre o modal de cadastro de item padrão
 */
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

/**
 * Fecha o modal de item padrão
 */
function fecharModalItemPadrao() {
    const modal = document.getElementById('modalItemPadrao');
    if (modal) modal.classList.remove('active');
}

/**
 * Edita um item padrão
 */
function editarItemPadrao(id, sistema, descricao, ordem) {
    document.getElementById('modalItemTitulo').textContent = 'Editar Item';
    document.getElementById('itemPadraoId').value = id;
    document.getElementById('itemPadraoSistema').value = sistema;
    document.getElementById('itemPadraoDescricao').value = descricao;
    document.getElementById('itemPadraoOrdem').value = ordem;
    document.getElementById('modalItemPadrao').classList.add('active');
}

/**
 * Salva um item padrão
 */
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
            // Implementar edição quando necessário
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

/**
 * Confirma exclusão de item padrão
 */
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

/**
 * Inicia um novo checklist
 */
function iniciarChecklist(equipamentoId) {
    if (!equipamentoId) {
        mostrarToast('Selecione um equipamento', 'warning');
        return;
    }

    showLoading();

    fetch('/api/checklist/iniciar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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

/**
 * Atualiza um item do checklist
 */
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
            mostrarToast('Erro ao atualizar item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
    }
}

/**
 * Finaliza um checklist
 */
function finalizarChecklist(checklistId) {
    const observacoes = document.getElementById('observacoes')?.value || '';
    
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

/**
 * Visualiza relatório do checklist
 */
function visualizarRelatorio(checklistId) {
    // Em produção, abriria um PDF ou página com o relatório
    mostrarToast('Relatório do checklist #' + checklistId + '\nEm produção, isso abriria o PDF do relatório.', 'info');
}

/**
 * Confirma exclusão de checklist
 */
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

// ==================== FUNÇÕES UTILITÁRIAS ====================

/**
 * Mostra o loading
 */
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

/**
 * Esconde o loading
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

/**
 * Fecha o modal de confirmação
 */
function fecharModalConfirmacao() {
    const modal = document.getElementById('modalConfirmacao');
    if (modal) modal.classList.remove('active');
}

/**
 * Mostra modal de confirmação
 */
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

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicializa a página
 */
document.addEventListener('DOMContentLoaded', function() {
    // Configurar drag and drop para upload de PDF
    setupDragAndDrop();
    
    // Adicionar listener para fechar modais com ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modais = [
                'modalConfirmacao',
                'modalGerenciarEquipamentos',
                'modalEquipamento',
                'modalItensPadrao',
                'modalItemPadrao',
                'modalUploadPDF',
                'modalProcessarTexto',
                'modalPreview'
            ];
            
            modais.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
        }
    });
});

// Fechar modais ao clicar fora
window.onclick = function(event) {
    const modais = [
        'modalConfirmacao',
        'modalGerenciarEquipamentos',
        'modalEquipamento',
        'modalItensPadrao',
        'modalItemPadrao',
        'modalUploadPDF',
        'modalProcessarTexto',
        'modalPreview'
    ];
    
    modais.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target == modal) {
            modal.classList.remove('active');
        }
    });
};