// static/js/modulo_leitura.js

// ==================== VARIÁVEIS GLOBAIS ====================
let dadosExtraidosIA = null;

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    configurarFechamentoModais();
    configurarDragAndDrop();
});

function configurarFechamentoModais() {
    window.onclick = function(event) {
        const modais = [
            'modalCadastro',
            'modalUploadIA',
            'modalUploadManual',
            'modalConfirmacao'
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
                'modalCadastro',
                'modalUploadIA',
                'modalUploadManual',
                'modalConfirmacao'
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
            const fileInput = document.getElementById('iaPdfFile');
            if (fileInput) {
                fileInput.files = e.dataTransfer.files;
                handleIAFileSelect(fileInput);
            }
        } else {
            mostrarToast('Por favor, arraste apenas arquivos PDF', 'error');
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

// ==================== FUNÇÕES DE DOWNLOAD ====================

async function baixarManual(id) {
    try {
        showLoading();
        
        const response = await fetch('/api/equipamentos');
        const equipamentos = await response.json();
        const equipamento = equipamentos.find(e => e.id === id);
        
        if (!equipamento) {
            mostrarToast('Equipamento não encontrado', 'error');
            hideLoading();
            return;
        }
        
        if (!equipamento.manual_pdf) {
            mostrarToast('Este equipamento não possui manual cadastrado', 'warning');
            hideLoading();
            return;
        }
        
        mostrarToast(`Preparando download: ${equipamento.nome}...`, 'info');
        
        // Verificar se o manual é uma URL externa ou arquivo local
        if (equipamento.manual_pdf.startsWith('http')) {
            // URL externa - abrir em nova aba
            window.open(equipamento.manual_pdf, '_blank');
            hideLoading();
            mostrarToast('Abrindo manual em nova aba', 'success');
        } else {
            // Arquivo local - extrair apenas o nome do arquivo
            let filename = equipamento.manual_pdf;
            
            // Se começar com /uploads/, remover
            if (filename.startsWith('/uploads/')) {
                filename = filename.replace('/uploads/', '');
            }
            
            // Construir URL correta para download
            const downloadUrl = `/uploads/${filename}`;
            
            console.log('Tentando baixar:', downloadUrl); // Para debug
            
            // Criar link temporário para download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename.split('_').pop() || 'manual.pdf'; // Nome original
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Verificar se o download foi bem sucedido (timeout para dar tempo do download iniciar)
            setTimeout(() => {
                hideLoading();
                mostrarToast(`Download de "${equipamento.nome}" iniciado!`, 'success');
            }, 1000);
        }
    } catch (error) {
        console.error('Erro no download:', error);
        mostrarToast('Erro ao baixar manual: ' + error.message, 'error');
        hideLoading();
    }
}

// ==================== FUNÇÕES DE UPLOAD DE MANUAL ====================

async function uploadManual(equipamentoId, file) {
    if (!file) {
        mostrarToast('Selecione um arquivo', 'error');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        mostrarToast('Apenas arquivos PDF são permitidos', 'error');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        mostrarToast('Arquivo muito grande. Tamanho máximo: 16MB', 'error');
        return;
    }
    
    showLoading();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('equipamento_id', equipamentoId);
    
    try {
        const response = await fetch('/api/upload-manual-pdf', {  // ← URL ATUALIZADA
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarToast('Manual enviado com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            mostrarToast(data.message || 'Erro ao enviar manual', 'error');
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        mostrarToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

function abrirModalUploadManual(equipamentoId, equipamentoNome) {
    const modal = document.getElementById('modalUploadManual');
    const titulo = document.getElementById('modalUploadManualTitulo');
    const input = document.getElementById('uploadManualEquipamentoId');
    const fileInput = document.getElementById('manualFile');
    
    if (titulo) titulo.textContent = `Upload de Manual - ${equipamentoNome}`;
    if (input) input.value = equipamentoId;
    if (fileInput) fileInput.value = ''; // Limpar input de arquivo
    if (modal) modal.classList.add('active');
}

function fecharModalUploadManual() {
    const modal = document.getElementById('modalUploadManual');
    const form = document.getElementById('formUploadManual');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

// ==================== FUNÇÕES DE MODAL (CADASTRO) ====================
function abrirModalCadastro() {
    document.getElementById('modalCadastroTitulo').textContent = 'Cadastrar Equipamento';
    document.getElementById('equipamentoId').value = '';
    document.getElementById('formCadastro').reset();
    document.getElementById('modalCadastro').classList.add('active');
}

function fecharModalCadastro() {
    document.getElementById('modalCadastro').classList.remove('active');
    document.getElementById('formCadastro').reset();
}

// ==================== FUNÇÕES DE UPLOAD COM IA ====================

function abrirModalUploadIA() {
    document.getElementById('modalUploadIA').classList.add('active');
    resetUploadForm();
}

function fecharModalUploadIA() {
    document.getElementById('modalUploadIA').classList.remove('active');
    resetUploadForm();
    dadosExtraidosIA = null;
}

function resetUploadForm() {
    const form = document.getElementById('formUploadIA');
    if (form) form.reset();
    
    const uploadProgress = document.getElementById('iaUploadProgress');
    const previewArea = document.getElementById('iaPreviewArea');
    const fileInfo = document.getElementById('iaFileInfo');
    const btnUpload = document.getElementById('btnUploadIA');
    const progressFill = document.getElementById('iaProgressFill');
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (previewArea) previewArea.style.display = 'none';
    if (fileInfo) fileInfo.style.display = 'none';
    if (btnUpload) {
        btnUpload.disabled = false;
        btnUpload.style.display = 'block';
    }
    if (progressFill) progressFill.style.width = '0%';
    
    // Remover botão de confirmar se existir
    const btnConfirmar = document.getElementById('btnConfirmarIA');
    if (btnConfirmar) btnConfirmar.remove();
}

function handleIAFileSelect(input) {
    const file = input.files[0];
    if (file) {
        document.getElementById('iaFileName').textContent = file.name;
        document.getElementById('iaFileInfo').style.display = 'block';
    }
}

async function uploadEquipamentoIA(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('iaPdfFile');
    const file = fileInput?.files[0];
    
    if (!file) {
        mostrarToast('Selecione um arquivo PDF', 'error');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        mostrarToast('Arquivo muito grande. Tamanho máximo: 16MB', 'error');
        return;
    }
    
    // Mostrar progresso
    document.getElementById('iaUploadProgress').style.display = 'block';
    document.getElementById('btnUploadIA').disabled = true;
    document.getElementById('iaProgressStatus').textContent = 'Enviando arquivo...';
    document.getElementById('iaProgressFill').style.width = '30%';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload-manual-ia', {
            method: 'POST',
            body: formData
        });
        
        document.getElementById('iaProgressFill').style.width = '80%';
        document.getElementById('iaProgressStatus').textContent = 'Processando com IA...';
        
        const data = await response.json();
        
        document.getElementById('iaProgressFill').style.width = '100%';
        
        if (data.success) {
            document.getElementById('iaProgressStatus').textContent = '✅ Processado com sucesso!';
            
            // Guardar dados extraídos
            dadosExtraidosIA = data;
            
            // Mostrar preview
            mostrarPreviewDados(data);
            
            mostrarToast('Dados extraídos com sucesso!', 'success');
            
            // Esconder botão de upload e mostrar botão de confirmar
            document.getElementById('btnUploadIA').style.display = 'none';
            
            // Adicionar botão de confirmar se não existir
            if (!document.getElementById('btnConfirmarIA')) {
                const btnConfirmar = document.createElement('button');
                btnConfirmar.id = 'btnConfirmarIA';
                btnConfirmar.className = 'btn';
                btnConfirmar.style.cssText = 'flex:2; background: #40b049;';
                btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar e Salvar';
                btnConfirmar.onclick = confirmarSalvarEquipamento;
                
                const botoesDiv = document.querySelector('#formUploadIA > div:last-child');
                botoesDiv.appendChild(btnConfirmar);
            }
        } else {
            document.getElementById('iaProgressStatus').textContent = '❌ Erro no processamento';
            mostrarToast(data.message || 'Erro ao processar PDF', 'error');
            document.getElementById('btnUploadIA').disabled = false;
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        document.getElementById('iaProgressStatus').textContent = '❌ Erro de conexão';
        mostrarToast('Erro de conexão: ' + error.message, 'error');
        document.getElementById('btnUploadIA').disabled = false;
    }
}

function mostrarPreviewDados(dados) {
    const previewArea = document.getElementById('iaPreviewArea');
    const previewContent = document.getElementById('iaPreviewContent');
    
    let html = `
        <div style="background: white; padding: 15px; border-radius: 4px;">
            <p><strong>🏭 Nome:</strong> ${dados.equipamento.nome}</p>
            <p><strong>🔖 Modelo:</strong> ${dados.equipamento.modelo || 'Não informado'}</p>
            <p><strong>🏢 Fabricante:</strong> ${dados.equipamento.fabricante || 'Não informado'}</p>
            <p><strong>📋 Tipo:</strong> ${dados.equipamento.tipo || 'Não informado'}</p>
    `;
    
    if (dados.manual_pdf) {
        html += `<p><strong>📄 PDF:</strong> <span style="color: #40b049;">Salvo com sucesso!</span></p>`;
    }
    
    html += `</div>`;
    
    previewContent.innerHTML = html;
    previewArea.style.display = 'block';
}

async function confirmarSalvarEquipamento() {
    if (!dadosExtraidosIA || !dadosExtraidosIA.equipamento) {
        mostrarToast('Nenhum dado para salvar', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const equipamento = {
            nome: dadosExtraidosIA.equipamento.nome,
            modelo: dadosExtraidosIA.equipamento.modelo || '',
            fabricante: dadosExtraidosIA.equipamento.fabricante || '',
            tipo: dadosExtraidosIA.equipamento.tipo || '',
            manual_pdf: dadosExtraidosIA.manual_pdf || ''
        };
        
        const response = await fetch('/api/equipamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipamento)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarToast('Equipamento cadastrado com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            mostrarToast('Erro ao salvar: ' + data.message, 'error');
            hideLoading();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro de conexão', 'error');
        hideLoading();
    }
}

// ==================== FUNÇÕES DE CADASTRO ====================
async function salvarEquipamento(event) {
    event.preventDefault();
    
    const id = document.getElementById('equipamentoId')?.value;
    const tipoSelect = document.getElementById('equipamentoTipoSelect');
    const tipoInput = document.getElementById('equipamentoTipoInput');
    
    // Determinar o tipo (prioridade para o input personalizado se tiver valor)
    let tipo = tipoInput.value || tipoSelect.value;
    
    const equipamento = {
        nome: document.getElementById('equipamentoNome')?.value,
        modelo: document.getElementById('equipamentoModelo')?.value || '',
        fabricante: document.getElementById('equipamentoFabricante')?.value || '',
        tipo: tipo,
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

// ==================== FUNÇÕES DE EDIÇÃO ====================
async function editarEquipamento(id) {
    try {
        const response = await fetch('/api/equipamentos');
        const equipamentos = await response.json();
        const equipamento = equipamentos.find(e => e.id === id);
        
        if (equipamento) {
            document.getElementById('modalCadastroTitulo').textContent = 'Editar Equipamento';
            document.getElementById('equipamentoId').value = equipamento.id;
            document.getElementById('equipamentoNome').value = equipamento.nome;
            document.getElementById('equipamentoModelo').value = equipamento.modelo || '';
            document.getElementById('equipamentoFabricante').value = equipamento.fabricante || '';
            
            // Preencher tipo
            const tipoSelect = document.getElementById('equipamentoTipoSelect');
            const tipoInput = document.getElementById('equipamentoTipoInput');
            
            // Verificar se o tipo existe no select
            let found = false;
            for (let i = 0; i < tipoSelect.options.length; i++) {
                if (tipoSelect.options[i].value === equipamento.tipo) {
                    tipoSelect.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            
            if (!found && equipamento.tipo) {
                // Tipo personalizado
                tipoInput.value = equipamento.tipo;
                tipoSelect.value = '';
            } else {
                tipoInput.value = '';
            }
            
            document.getElementById('equipamentoManual').value = equipamento.manual_pdf || '';
            document.getElementById('modalCadastro').classList.add('active');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro ao carregar dados do equipamento', 'error');
    }
}

// ==================== FUNÇÕES DE EXCLUSÃO ====================
function confirmarExcluirEquipamento(id, nome) {
    mostrarConfirmacao(
        'Excluir Equipamento',
        `Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`,
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

// ==================== FUNÇÕES DE TIPO PERSONALIZADO ====================
function usarTipoPersonalizado() {
    const tipoInput = document.getElementById('equipamentoTipoInput');
    const tipoSelect = document.getElementById('equipamentoTipoSelect');
    
    if (tipoInput.value) {
        // Criar nova opção no select
        const option = document.createElement('option');
        option.value = tipoInput.value;
        option.text = tipoInput.value + ' (personalizado)';
        option.selected = true;
        tipoSelect.add(option);
        
        // Limpar input
        tipoInput.value = '';
    }
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

// ==================== FUNÇÕES DE CONFIRMAÇÃO ====================
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

// ==================== FUNÇÕES UTILITÁRIAS ====================
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

// ==================== EVENT LISTENER PARA UPLOAD DE MANUAL ====================
document.addEventListener('DOMContentLoaded', function() {
    const formUpload = document.getElementById('formUploadManual');
    if (formUpload) {
        formUpload.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const equipamentoId = document.getElementById('uploadManualEquipamentoId').value;
            const fileInput = document.getElementById('manualFile');
            const file = fileInput.files[0];
            
            await uploadManual(equipamentoId, file);
        });
    }
});

// ==================== EXPORTAÇÃO DAS FUNÇÕES PARA O ESCOPO GLOBAL ====================
window.filtrarEquipamentos = filtrarEquipamentos;
window.baixarManual = baixarManual;
window.abrirModalUploadManual = abrirModalUploadManual;
window.fecharModalUploadManual = fecharModalUploadManual;
window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
window.abrirModalUploadIA = abrirModalUploadIA;
window.fecharModalUploadIA = fecharModalUploadIA;
window.handleIAFileSelect = handleIAFileSelect;
window.uploadEquipamentoIA = uploadEquipamentoIA;
window.salvarEquipamento = salvarEquipamento;
window.editarEquipamento = editarEquipamento;
window.confirmarExcluirEquipamento = confirmarExcluirEquipamento;
window.usarTipoPersonalizado = usarTipoPersonalizado;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.mostrarToast = mostrarToast;