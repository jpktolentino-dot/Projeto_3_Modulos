# app.py
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'aguia_sistemas_secret_key_2026'

# Configuração do banco de dados
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'aguia_manutencao.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==================== MODELOS ====================

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    login = db.Column(db.String(50), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)
    perfil = db.Column(db.String(20), nullable=False)  # 'manutentor', 'pcm', 'operador'
    modulo_acesso = db.Column(db.String(50))  # 'leitura', 'checklist', 'corretivas', 'todos'
    
    def __repr__(self):
        return f'<Usuario {self.login}>'

class Equipamento(db.Model):
    __tablename__ = 'equipamentos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    modelo = db.Column(db.String(50))
    fabricante = db.Column(db.String(100))
    tipo = db.Column(db.String(50))
    manual_pdf = db.Column(db.String(200))
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Equipamento {self.nome}>'

class Checklist(db.Model):
    __tablename__ = 'checklists'
    id = db.Column(db.Integer, primary_key=True)
    equipamento_id = db.Column(db.Integer, db.ForeignKey('equipamentos.id'))
    mes_ano = db.Column(db.String(7))  # MM/YYYY
    operador_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    status = db.Column(db.String(20), default='pendente')  # 'pendente', 'concluido'
    observacoes = db.Column(db.Text)
    data_execucao = db.Column(db.DateTime)
    
    equipamento = db.relationship('Equipamento')
    operador = db.relationship('Usuario')

class ItemChecklist(db.Model):
    __tablename__ = 'itens_checklist'
    id = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey('checklists.id'))
    descricao = db.Column(db.String(200), nullable=False)
    concluido = db.Column(db.Boolean, default=False)
    
    checklist = db.relationship('Checklist', backref='itens')

class ItemPadraoChecklist(db.Model):
    __tablename__ = 'itens_padrao_checklist'
    id = db.Column(db.Integer, primary_key=True)
    equipamento_id = db.Column(db.Integer, db.ForeignKey('equipamentos.id'))
    sistema = db.Column(db.String(100))  # Ex: "Motor Diesel", "Cabine", etc.
    descricao = db.Column(db.String(300), nullable=False)
    ordem = db.Column(db.Integer, default=0)
    
    equipamento = db.relationship('Equipamento', backref='itens_padrao')

class ChamadoCorretivo(db.Model):
    __tablename__ = 'chamados'
    id = db.Column(db.Integer, primary_key=True)
    equipamento_id = db.Column(db.Integer, db.ForeignKey('equipamentos.id'))
    manutentor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    causa = db.Column(db.String(200))
    descricao = db.Column(db.Text)
    data_hora_inicial = db.Column(db.DateTime)
    data_hora_final = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='aberto')  # 'aberto', 'em_andamento', 'concluido'
    data_abertura = db.Column(db.DateTime, default=datetime.utcnow)
    
    equipamento = db.relationship('Equipamento')
    manutentor = db.relationship('Usuario')

# ==================== DECORADORES DE LOGIN ====================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario_id' not in session:
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def modulo_required(modulo):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'usuario_id' not in session:
                return redirect(url_for('index'))
            
            usuario = Usuario.query.get(session['usuario_id'])
            if usuario.modulo_acesso != 'todos' and usuario.modulo_acesso != modulo:
                return redirect(url_for('index'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ==================== ROTAS PRINCIPAIS ====================

@app.route('/')
def index():
    """Página inicial com os módulos"""
    return render_template('index.html')

@app.route('/login/<modulo>', methods=['POST'])
def login(modulo):
    """Processa login para um módulo específico"""
    dados = request.get_json()
    login = dados.get('login')
    senha = dados.get('senha')
    
    usuario = Usuario.query.filter_by(login=login, senha=senha).first()
    
    if usuario:
        # Verifica se o usuário tem acesso ao módulo
        if usuario.modulo_acesso in ['todos', modulo]:
            session['usuario_id'] = usuario.id
            session['usuario_nome'] = usuario.nome
            session['usuario_perfil'] = usuario.perfil
            session['modulo_atual'] = modulo
            
            return jsonify({
                'success': True,
                'redirect': url_for(f'modulo_{modulo}'),
                'usuario': {
                    'nome': usuario.nome,
                    'perfil': usuario.perfil
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Usuário não tem acesso a este módulo'
            })
    else:
        return jsonify({
            'success': False,
            'message': 'Login ou senha inválidos'
        })

@app.route('/logout')
def logout():
    """Realiza logout do usuário"""
    session.clear()
    return redirect(url_for('index'))

# ==================== MÓDULO LEITURA ====================

@app.route('/modulo/leitura')
@login_required
@modulo_required('leitura')
def modulo_leitura():
    """Página do módulo de leitura"""
    equipamentos = Equipamento.query.all()
    usuario = Usuario.query.get(session['usuario_id'])
    return render_template('modulo_leitura.html', 
                         equipamentos=equipamentos, 
                         usuario=usuario)

@app.route('/api/equipamentos', methods=['GET'])
@login_required
def listar_equipamentos():
    """Lista todos os equipamentos"""
    equipamentos = Equipamento.query.all()
    return jsonify([{
        'id': e.id,
        'nome': e.nome,
        'modelo': e.modelo,
        'fabricante': e.fabricante,
        'manual_pdf': e.manual_pdf
    } for e in equipamentos])

@app.route('/api/equipamentos', methods=['POST'])
@login_required
def cadastrar_equipamento():
    """Cadastra um novo equipamento (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    dados = request.get_json()
    
    equipamento = Equipamento(
        nome=dados['nome'],
        modelo=dados.get('modelo', ''),
        fabricante=dados.get('fabricante', ''),
        tipo=dados.get('tipo', ''),
        manual_pdf=dados.get('manual_pdf', '')
    )
    
    db.session.add(equipamento)
    db.session.commit()
    
    return jsonify({'success': True, 'id': equipamento.id})

@app.route('/api/equipamentos/<int:id>', methods=['DELETE'])
@login_required
def deletar_equipamento(id):
    """Deleta um equipamento (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    equipamento = Equipamento.query.get_or_404(id)
    db.session.delete(equipamento)
    db.session.commit()
    
    return jsonify({'success': True})

# ==================== MÓDULO CHECKLIST ====================

@app.route('/modulo/checklist')
@login_required
@modulo_required('checklist')
def modulo_checklist():
    """Página do módulo de checklist"""
    usuario = Usuario.query.get(session['usuario_id'])
    data_atual = datetime.now()
    mes_ano = data_atual.strftime('%m/%Y')
    
    # Verificar se é para criar um novo checklist
    novo = request.args.get('new', type=int)
    
    # Busca TODOS os checklists do operador para este mês
    checklists = Checklist.query.filter_by(
        operador_id=usuario.id,
        mes_ano=mes_ano
    ).all()
    
    # Pega o ID do checklist selecionado (se houver)
    checklist_id = request.args.get('checklist_id', type=int)
    
    # Se for para criar novo ou não há checklists, não seleciona nenhum
    if novo or not checklists:
        checklist = None
    elif checklist_id:
        # Se um checklist específico foi selecionado, busca ele
        checklist = Checklist.query.get(checklist_id)
    else:
        # Se não, mostra o primeiro (ou None)
        checklist = checklists[0] if checklists else None
    
    equipamentos = Equipamento.query.all()
    
    return render_template('modulo_checklist.html',
                         usuario=usuario,
                         checklist=checklist,
                         checklists=checklists,  # Passa a lista completa
                         equipamentos=equipamentos,
                         mes_ano=mes_ano)

@app.route('/api/checklist/iniciar', methods=['POST'])
@login_required
def iniciar_checklist():
    """Inicia um novo checklist mensal"""
    dados = request.get_json()
    usuario_id = session['usuario_id']
    mes_ano = datetime.now().strftime('%m/%Y')
    equipamento_id = dados['equipamento_id']
    
    # VERIFICAÇÃO REMOVIDA - Agora permite múltiplos checklists por mês
    # (desde que sejam para equipamentos diferentes)
    
    checklist = Checklist(
        equipamento_id=equipamento_id,
        operador_id=usuario_id,
        mes_ano=mes_ano,
        status='pendente'
    )
    
    db.session.add(checklist)
    db.session.flush()
    
    # Busca os itens padrão para este equipamento
    itens_padrao = ItemPadraoChecklist.query.filter_by(
        equipamento_id=equipamento_id
    ).order_by(ItemPadraoChecklist.ordem).all()
    
    if itens_padrao:
        # Usa os itens específicos do equipamento
        for item_padrao in itens_padrao:
            item = ItemChecklist(
                checklist_id=checklist.id,
                descricao=f"{item_padrao.sistema} - {item_padrao.descricao}"
            )
            db.session.add(item)
    else:
        # Itens padrão genéricos para equipamentos sem checklist específico
        itens_genericos = [
            'Verificar nível de óleo',
            'Limpar filtros de ar',
            'Testar válvula de segurança',
            'Verificar correias',
            'Inspecionar conexões elétricas',
            'Lubrificar partes móveis',
            'Verificar pressão de trabalho',
            'Inspecionar vazamentos'
        ]
        
        for item_desc in itens_genericos:
            item = ItemChecklist(
                checklist_id=checklist.id,
                descricao=item_desc
            )
            db.session.add(item)
    
    db.session.commit()
    
    return jsonify({'success': True, 'checklist_id': checklist.id})

@app.route('/api/checklist/<int:id>/item/<int:item_id>', methods=['PUT'])
@login_required
def atualizar_item_checklist(id, item_id):
    """Atualiza status de um item do checklist"""
    dados = request.get_json()
    
    item = ItemChecklist.query.filter_by(
        id=item_id,
        checklist_id=id
    ).first_or_404()
    
    item.concluido = dados.get('concluido', item.concluido)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/checklist/<int:id>/finalizar', methods=['POST'])
@login_required
def finalizar_checklist(id):
    """Finaliza um checklist e envia relatório"""
    dados = request.get_json()
    
    checklist = Checklist.query.get_or_404(id)
    checklist.status = 'concluido'
    checklist.observacoes = dados.get('observacoes', '')
    checklist.data_execucao = datetime.now()
    
    db.session.commit()
    
    # Aqui você implementaria o envio de e-mail
    # send_email_report(checklist)
    
    return jsonify({'success': True, 'message': 'Checklist concluído com sucesso!'})

# Adicione esta nova rota após a rota /api/checklist/<int:id>/finalizar

@app.route('/api/checklist/<int:id>', methods=['DELETE'])
@login_required
def excluir_checklist(id):
    """Exclui um checklist (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    checklist = Checklist.query.get_or_404(id)
    
    # Exclui os itens do checklist primeiro
    for item in checklist.itens:
        db.session.delete(item)
    
    db.session.delete(checklist)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Checklist excluído com sucesso'})

# ==================== MÓDULO CORRETIVAS ====================

@app.route('/modulo/corretivas')
@login_required
@modulo_required('corretivas')
def modulo_corretivas():
    """Página do módulo de manutenções corretivas"""
    usuario = Usuario.query.get(session['usuario_id'])
    equipamentos = Equipamento.query.all()
    
    if usuario.perfil == 'pcm':
        chamados = ChamadoCorretivo.query.all()
    else:
        chamados = ChamadoCorretivo.query.filter_by(manutentor_id=usuario.id).all()
    
    return render_template('modulo_corretivas.html',
                         usuario=usuario,
                         equipamentos=equipamentos,
                         chamados=chamados)

@app.route('/api/chamados', methods=['POST'])
@login_required
def abrir_chamado():
    """Abre um novo chamado corretivo"""
    dados = request.get_json()
    
    chamado = ChamadoCorretivo(
        equipamento_id=dados['equipamento_id'],
        manutentor_id=session['usuario_id'],
        causa=dados['causa'],
        descricao=dados['descricao'],
        data_hora_inicial=datetime.fromisoformat(dados['data_hora_inicial']),
        data_hora_final=datetime.fromisoformat(dados['data_hora_final']),
        status='aberto'
    )
    
    db.session.add(chamado)
    db.session.commit()
    
    return jsonify({'success': True, 'chamado_id': chamado.id})

@app.route('/api/chamados/<int:id>', methods=['GET'])
@login_required
def get_chamado(id):
    """Retorna detalhes de um chamado"""
    chamado = ChamadoCorretivo.query.get_or_404(id)
    return jsonify({
        'id': chamado.id,
        'equipamento': chamado.equipamento.nome,
        'causa': chamado.causa,
        'descricao': chamado.descricao,
        'status': chamado.status,
        'data_abertura': chamado.data_abertura.strftime('%d/%m/%Y %H:%M')
    })

@app.route('/api/chamados/<int:id>', methods=['PUT'])
@login_required
def atualizar_chamado(id):
    """Atualiza status de um chamado"""
    dados = request.get_json()
    
    chamado = ChamadoCorretivo.query.get_or_404(id)
    chamado.status = dados.get('status', chamado.status)
    
    if chamado.status == 'concluido':
        chamado.data_hora_final = datetime.now()
    
    db.session.commit()
    
    return jsonify({'success': True})

# ==================== ROTA PARA LISTAR CHAMADOS (GET) ====================

@app.route('/api/chamados', methods=['GET'])
@login_required
def listar_chamados():
    """Lista todos os chamados do usuário atual"""
    usuario_id = session['usuario_id']
    usuario = Usuario.query.get(usuario_id)
    
    if usuario.perfil == 'pcm':
        chamados = ChamadoCorretivo.query.all()
    else:
        chamados = ChamadoCorretivo.query.filter_by(manutentor_id=usuario_id).all()
    
    return jsonify([{
        'id': c.id,
        'equipamento': c.equipamento.nome if c.equipamento else 'N/A',
        'causa': c.causa,
        'descricao': c.descricao,
        'status': c.status,
        'data_abertura': c.data_abertura.strftime('%d/%m/%Y %H:%M')
    } for c in chamados])

# ==================== INICIALIZAÇÃO DO BANCO ====================

def init_db():
    """Cria as tabelas e adiciona dados iniciais"""
    db.create_all()
    
    # Verifica se já existem usuários
    if Usuario.query.count() == 0:
        # Criar usuários de exemplo
        usuarios = [
            Usuario(nome='Carlos Silva', login='carlos.pcm', senha='123456', perfil='pcm', modulo_acesso='todos'),
            Usuario(nome='João Oliveira', login='joao.manut', senha='123456', perfil='manutentor', modulo_acesso='todos'),
            Usuario(nome='Maria Santos', login='maria.leit', senha='123456', perfil='manutentor', modulo_acesso='leitura'),
            Usuario(nome='Pedro Costa', login='pedro.check', senha='123456', perfil='operador', modulo_acesso='checklist'),
        ]
        db.session.add_all(usuarios)
    
    if Equipamento.query.count() == 0:
        # Criar equipamentos de exemplo
        equipamentos = [
            Equipamento(nome='Prensa Hidráulica PH-2000', modelo='PH-2000', fabricante='HydroPress', tipo='Hidráulico'),
            Equipamento(nome='Braço Robótico ZX-7', modelo='ZX-7', fabricante='RoboTech', tipo='Robótica'),
            Equipamento(nome='Compressor Atlas', modelo='AT-1500', fabricante='Atlas Copco', tipo='Pneumático'),
            Equipamento(nome='Torno Mecânico CNC', modelo='TNC-42', fabricante='Romi', tipo='Usinagem'),
            Equipamento(nome='Fresadora Universal', modelo='FU-5', fabricante='Bridgeport', tipo='Usinagem'),
            Equipamento(
                nome='Caminhão Trator DAF 510 6x2', 
                modelo='DAF 510', 
                fabricante='DAF', 
                tipo='Veículo Pesado',
                manual_pdf='/static/manuais/daf_510.pdf'
            ),
        ]
        db.session.add_all(equipamentos)
        db.session.flush()  # Para obter os IDs
        
        # Adicionar itens padrão para o DAF 510
        daf = Equipamento.query.filter_by(nome='Caminhão Trator DAF 510 6x2').first()
        
        if daf:
            itens_daf = [
                # SISTEMA HIDRÁULICO
                {'sistema': 'Bomba Hidráulica', 'descricao': 'Mangueiras - vazamentos', 'ordem': 1},
                {'sistema': 'Bomba Hidráulica', 'descricao': 'Bomba - ruídos anormais', 'ordem': 2},
                {'sistema': 'Comando Hidráulico', 'descricao': 'Mangueiras, tubos e vazamentos', 'ordem': 3},
                
                # CABINE
                {'sistema': 'Cabine', 'descricao': 'Ruídos internos', 'ordem': 4},
                {'sistema': 'Cabine', 'descricao': 'Banco do operador/motorista e Cinto de Segurança', 'ordem': 5},
                {'sistema': 'Cabine', 'descricao': 'Braço e palheta do limpador parabrisas', 'ordem': 6},
                {'sistema': 'Cabine', 'descricao': 'Buzina', 'ordem': 7},
                {'sistema': 'Cabine', 'descricao': 'Canopla de câmbio', 'ordem': 8},
                {'sistema': 'Cabine', 'descricao': 'Chefe diário de bordo do operador', 'ordem': 9},
                {'sistema': 'Cabine', 'descricao': 'Cinto de segurança - Passageiros', 'ordem': 10},
                {'sistema': 'Cabine', 'descricao': 'Condições dos bancos e do piso', 'ordem': 11},
                {'sistema': 'Cabine', 'descricao': 'Escada de acesso', 'ordem': 12},
                {'sistema': 'Cabine', 'descricao': 'Espelho retrovisor', 'ordem': 13},
                {'sistema': 'Cabine', 'descricao': 'Falhas refletivas', 'ordem': 14},
                {'sistema': 'Cabine', 'descricao': 'Farol alto', 'ordem': 15},
                {'sistema': 'Cabine', 'descricao': 'Farol baixo', 'ordem': 16},
                {'sistema': 'Cabine', 'descricao': 'Folga na alavanca de câmbio', 'ordem': 17},
                {'sistema': 'Cabine', 'descricao': 'Funcionamento/acionamento dos pedais', 'ordem': 18},
                {'sistema': 'Cabine', 'descricao': 'Mangueiras/cabos obstruindo os pedais', 'ordem': 19},
                {'sistema': 'Cabine', 'descricao': 'Iluminação interna', 'ordem': 20},
                {'sistema': 'Cabine', 'descricao': 'Infiltração de poeira e água', 'ordem': 21},
                {'sistema': 'Cabine', 'descricao': 'Limpeza e asseio', 'ordem': 22},
                {'sistema': 'Cabine', 'descricao': 'Luz de freio', 'ordem': 23},
                {'sistema': 'Cabine', 'descricao': 'Luz de placa', 'ordem': 24},
                {'sistema': 'Cabine', 'descricao': 'Luz de ré', 'ordem': 25},
                {'sistema': 'Cabine', 'descricao': 'Macaco, chave e triângulo', 'ordem': 26},
                {'sistema': 'Cabine', 'descricao': 'Para-brisas - riscos e trincas', 'ordem': 27},
                {'sistema': 'Cabine', 'descricao': 'Pisca direito', 'ordem': 28},
                {'sistema': 'Cabine', 'descricao': 'Pisca esquerdo', 'ordem': 29},
                {'sistema': 'Cabine', 'descricao': 'Portas da Cabine, Fechaduras e Saída de Emergência', 'ordem': 30},
                {'sistema': 'Cabine', 'descricao': 'Sirene de Ré/Alarme de Deslocamento/Câmera de Ré', 'ordem': 31},
                {'sistema': 'Cabine', 'descricao': 'Suporte de bateria', 'ordem': 32},
                {'sistema': 'Cabine', 'descricao': 'Tacógrafo', 'ordem': 33},
                {'sistema': 'Cabine', 'descricao': 'Freio de estacionamento', 'ordem': 34},
                
                # BATERIA
                {'sistema': 'Caixa da Bateria', 'descricao': 'Cabos de bateria, aterramento e chave geral', 'ordem': 35},
                {'sistema': 'Caixa da Bateria', 'descricao': 'Polos derretidos da bateria e limpeza do compartimento', 'ordem': 36},
                
                # CHASSI
                {'sistema': 'Chassi', 'descricao': 'Estrutura do chassi', 'ordem': 37},
                {'sistema': 'Chassi', 'descricao': 'Para-barro', 'ordem': 38},
                {'sistema': 'Chassi', 'descricao': 'Para-barro - carreta', 'ordem': 39},
                {'sistema': 'Chassi', 'descricao': 'Pára-choques', 'ordem': 40},
                
                # COMBATE INCÊNDIO
                {'sistema': 'Combate Incêndio', 'descricao': 'Carga e validade dos extintores de incêndio', 'ordem': 41},
                
                # DIREÇÃO/ARTICULAÇÃO
                {'sistema': 'Direção', 'descricao': 'Mangueiras da direção', 'ordem': 42},
                {'sistema': 'Direção', 'descricao': 'Trincas/Folgas na articulação do chassi', 'ordem': 43},
                {'sistema': 'Direção', 'descricao': 'Vazamentos no sistema', 'ordem': 44},
                {'sistema': 'Direção', 'descricao': 'Caixa de direção', 'ordem': 45},
                {'sistema': 'Direção', 'descricao': 'Terminais da barra de direção direito', 'ordem': 46},
                {'sistema': 'Direção', 'descricao': 'Terminais da barra de direção esquerda', 'ordem': 47},
                {'sistema': 'Direção', 'descricao': 'Terminais da caixa de direção', 'ordem': 48},
                
                # DOCUMENTAÇÃO
                {'sistema': 'Documentação', 'descricao': 'Aferição do tacógrafo', 'ordem': 49},
                {'sistema': 'Documentação', 'descricao': 'Carteira de motorista D ou E', 'ordem': 50},
                {'sistema': 'Documentação', 'descricao': 'Licenciamento', 'ordem': 51},
                
                # FREIO
                {'sistema': 'Freio', 'descricao': 'Cilindros de freio', 'ordem': 52},
                {'sistema': 'Freio', 'descricao': 'Mangueiras de freio', 'ordem': 53},
                {'sistema': 'Freio', 'descricao': 'Vazamentos no sistema de freio', 'ordem': 54},
                {'sistema': 'Freio', 'descricao': 'Lona, flexível e campanas de freio dianteiro', 'ordem': 55},
                {'sistema': 'Freio', 'descricao': 'Lona, flexível e campanas de freio traseiro', 'ordem': 56},
                {'sistema': 'Freio', 'descricao': 'Vazamento de ar/óleo de freio', 'ordem': 57},
                
                # MOTOR DIESEL
                {'sistema': 'Motor Diesel', 'descricao': 'Vazamentos em geral', 'ordem': 58},
                {'sistema': 'Motor Diesel', 'descricao': 'Ruídos anormais', 'ordem': 59},
                {'sistema': 'Motor Diesel', 'descricao': 'Cano de escape', 'ordem': 60},
                {'sistema': 'Motor Diesel', 'descricao': 'Cabo do motor diesel', 'ordem': 61},
                {'sistema': 'Motor Diesel', 'descricao': 'Chicotes elétricos das laterais do bloco do motor (isolamento)', 'ordem': 62},
                {'sistema': 'Motor Diesel', 'descricao': 'Chicotes elétricos do ALTERNADOR (isolamento e sinais de derretimento)', 'ordem': 63},
                {'sistema': 'Motor Diesel', 'descricao': 'Chicotes elétricos do MOTOR DE PARTIDA (isolamento e sinais de derretimento)', 'ordem': 64},
                {'sistema': 'Motor Diesel', 'descricao': 'Chicotes elétricos que passam por baixo do cárter (isolamento)', 'ordem': 65},
                {'sistema': 'Motor Diesel', 'descricao': 'Chicotes elétricos que passam por cima do cabeçote (isolamento)', 'ordem': 66},
                {'sistema': 'Motor Diesel', 'descricao': 'Compressor ar condicionado', 'ordem': 67},
                {'sistema': 'Motor Diesel', 'descricao': 'Correias', 'ordem': 68},
                {'sistema': 'Motor Diesel', 'descricao': 'Coxim de fixação do motor', 'ordem': 69},
                {'sistema': 'Motor Diesel', 'descricao': 'Emissão de fumaça preta', 'ordem': 70},
                {'sistema': 'Motor Diesel', 'descricao': 'Escapamento e Silencioso', 'ordem': 71},
                {'sistema': 'Motor Diesel', 'descricao': 'Filtro de ar', 'ordem': 72},
                {'sistema': 'Motor Diesel', 'descricao': 'Hélice do radiador', 'ordem': 73},
                {'sistema': 'Motor Diesel', 'descricao': 'Proteção e Mangueira do radiador de água', 'ordem': 74},
                {'sistema': 'Motor Diesel', 'descricao': 'Manta térmica do escapamento, silencioso e turbina', 'ordem': 75},
                {'sistema': 'Motor Diesel', 'descricao': 'Nível de óleo do motor', 'ordem': 76},
                {'sistema': 'Motor Diesel', 'descricao': 'Radiador água e Ar condicionado (coxins, fixação e vazamentos)', 'ordem': 77},
                {'sistema': 'Motor Diesel', 'descricao': 'Radiador óleo', 'ordem': 78},
                {'sistema': 'Motor Diesel', 'descricao': 'Sensores de alarme', 'ordem': 79},
                {'sistema': 'Motor Diesel', 'descricao': 'Mangueira de Lubrificação da Turbina', 'ordem': 80},
                
                # PNEUS
                {'sistema': 'Pneus', 'descricao': 'Realizar APRM - Serviços de Borracharia', 'ordem': 81},
                {'sistema': 'Pneus', 'descricao': 'Calibragem', 'ordem': 82},
                {'sistema': 'Pneus', 'descricao': 'Desgastes', 'ordem': 83},
                {'sistema': 'Pneus', 'descricao': 'Pneu sobressalente', 'ordem': 84},
                {'sistema': 'Pneus', 'descricao': 'Posição de rodagem', 'ordem': 85},
                {'sistema': 'Pneus', 'descricao': 'Rasgos nas Laterais EXTERNAS, INTERNAS e BANDA DE RODAGEM', 'ordem': 86},
                
                # TANGUÉ COMBUSTÍVEL
                {'sistema': 'Tanque Combustível', 'descricao': 'Limpeza do tanque', 'ordem': 87},
                {'sistema': 'Tanque Combustível', 'descricao': 'Peneira e respiro', 'ordem': 88},
                {'sistema': 'Tanque Combustível', 'descricao': 'Sensor de nível', 'ordem': 89},
                {'sistema': 'Tanque Combustível', 'descricao': 'Mangueiras de combustível', 'ordem': 90},
                
                # TANGUÉ HIDRÁULICO
                {'sistema': 'Tanque Hidráulico', 'descricao': 'Nível de óleo hidráulico', 'ordem': 91},
                {'sistema': 'Tanque Hidráulico', 'descricao': 'Sensores de temperatura', 'ordem': 92},
                
                # TRANSMISSÃO
                {'sistema': 'Transmissão', 'descricao': 'Mangueiras da transmissão', 'ordem': 93},
                {'sistema': 'Transmissão', 'descricao': 'Vazamentos na transmissão', 'ordem': 94},
                {'sistema': 'Transmissão', 'descricao': 'Vareta de Nível', 'ordem': 95},
                {'sistema': 'Transmissão', 'descricao': 'Ruídos anormais', 'ordem': 96},
                {'sistema': 'Transmissão', 'descricao': 'Chicotes elétricos da transmissão', 'ordem': 97},
                {'sistema': 'Transmissão', 'descricao': 'Cardan dianteiro (Cruzetas, parafusos)', 'ordem': 98},
                {'sistema': 'Transmissão', 'descricao': 'Cardan traseiro (Cruzetas, parafusos)', 'ordem': 99},
                {'sistema': 'Transmissão', 'descricao': 'Cruzetas do cardã', 'ordem': 100},
                {'sistema': 'Transmissão', 'descricao': 'Cintas de segurança do cardã', 'ordem': 101},
                {'sistema': 'Transmissão', 'descricao': 'Flange do Cardã', 'ordem': 102},
                {'sistema': 'Transmissão', 'descricao': 'Diferencial dianteiro e traseiro', 'ordem': 103},
                {'sistema': 'Transmissão', 'descricao': 'Vazamento de óleo do diferencial', 'ordem': 104},
                {'sistema': 'Transmissão', 'descricao': 'Prisioneiros/porca de roda', 'ordem': 105},
                {'sistema': 'Transmissão', 'descricao': 'Verificar desgaste das cremalheiras', 'ordem': 106}
            ]
            
            for item in itens_daf:
                item_padrao = ItemPadraoChecklist(
                    equipamento_id=daf.id,
                    sistema=item['sistema'],
                    descricao=item['descricao'],
                    ordem=item['ordem']
                )
                db.session.add(item_padrao)
    
    db.session.commit()

# Criar tabelas e dados iniciais
with app.app_context():
    init_db()

# ==================== ROTA PARA RENDERIZAR TEMPLATES ====================

@app.route('/modulo/leitura/template')
@login_required
def template_leitura():
    usuario = Usuario.query.get(session['usuario_id'])
    equipamentos = Equipamento.query.all()
    return render_template('modulo_leitura.html', usuario=usuario, equipamentos=equipamentos)

@app.route('/modulo/checklist/template')
@login_required
def template_checklist():
    usuario = Usuario.query.get(session['usuario_id'])
    equipamentos = Equipamento.query.all()
    return render_template('modulo_checklist.html', usuario=usuario, equipamentos=equipamentos)

@app.route('/modulo/corretivas/template')
@login_required
def template_corretivas():
    usuario = Usuario.query.get(session['usuario_id'])
    equipamentos = Equipamento.query.all()
    return render_template('modulo_corretivas.html', usuario=usuario, equipamentos=equipamentos)

# ==================== ROTAS PARA GERENCIAMENTO DE EQUIPAMENTOS (NOVAS) ====================

@app.route('/api/equipamentos/<int:id>', methods=['PUT'])
@login_required
def atualizar_equipamento(id):
    """Atualiza um equipamento existente (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    dados = request.get_json()
    equipamento = Equipamento.query.get_or_404(id)
    
    equipamento.nome = dados.get('nome', equipamento.nome)
    equipamento.modelo = dados.get('modelo', equipamento.modelo)
    equipamento.fabricante = dados.get('fabricante', equipamento.fabricante)
    equipamento.tipo = dados.get('tipo', equipamento.tipo)
    equipamento.manual_pdf = dados.get('manual_pdf', equipamento.manual_pdf)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Equipamento atualizado com sucesso'})

@app.route('/api/equipamentos/<int:id>/itens-padrao', methods=['GET'])
@login_required
def listar_itens_padrao(id):
    """Lista os itens padrão de um equipamento"""
    equipamento = Equipamento.query.get_or_404(id)
    itens = ItemPadraoChecklist.query.filter_by(equipamento_id=id).order_by(ItemPadraoChecklist.ordem).all()
    
    return jsonify([{
        'id': item.id,
        'sistema': item.sistema,
        'descricao': item.descricao,
        'ordem': item.ordem
    } for item in itens])

@app.route('/api/equipamentos/<int:id>/itens-padrao', methods=['POST'])
@login_required
def adicionar_item_padrao(id):
    """Adiciona um item padrão ao equipamento (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    dados = request.get_json()
    
    item = ItemPadraoChecklist(
        equipamento_id=id,
        sistema=dados.get('sistema', 'Geral'),
        descricao=dados['descricao'],
        ordem=dados.get('ordem', 0)
    )
    
    db.session.add(item)
    db.session.commit()
    
    return jsonify({'success': True, 'id': item.id})

@app.route('/api/equipamentos/itens-padrao/<int:id>', methods=['DELETE'])
@login_required
def deletar_item_padrao(id):
    """Deleta um item padrão (apenas PCM)"""
    if session.get('usuario_perfil') != 'pcm':
        return jsonify({'success': False, 'message': 'Acesso negado'}), 403
    
    item = ItemPadraoChecklist.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/equipamentos/<int:id>/checklists', methods=['GET'])
@login_required
def listar_checklists_equipamento(id):
    """Lista todos os checklists de um equipamento"""
    checklists = Checklist.query.filter_by(equipamento_id=id).order_by(Checklist.data_execucao.desc()).all()
    
    return jsonify([{
        'id': c.id,
        'mes_ano': c.mes_ano,
        'operador': c.operador.nome if c.operador else 'N/A',
        'status': c.status,
        'data_execucao': c.data_execucao.strftime('%d/%m/%Y %H:%M') if c.data_execucao else 'Pendente'
    } for c in checklists])

@app.route('/api/equipamentos/<int:id>/chamados', methods=['GET'])
@login_required
def listar_chamados_equipamento(id):
    """Lista todos os chamados de um equipamento"""
    chamados = ChamadoCorretivo.query.filter_by(equipamento_id=id).order_by(ChamadoCorretivo.data_abertura.desc()).all()
    
    return jsonify([{
        'id': c.id,
        'causa': c.causa,
        'descricao': c.descricao,
        'status': c.status,
        'data_abertura': c.data_abertura.strftime('%d/%m/%Y %H:%M')
    } for c in chamados])

if __name__ == '__main__':
    app.run(debug=True)