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
    
    # Busca checklist do mês atual para o operador
    checklist = Checklist.query.filter_by(
        operador_id=usuario.id,
        mes_ano=mes_ano
    ).first()
    
    equipamentos = Equipamento.query.all()
    
    return render_template('modulo_checklist.html',
                         usuario=usuario,
                         checklist=checklist,
                         equipamentos=equipamentos,
                         mes_ano=mes_ano)

@app.route('/api/checklist/iniciar', methods=['POST'])
@login_required
def iniciar_checklist():
    """Inicia um novo checklist mensal"""
    dados = request.get_json()
    usuario_id = session['usuario_id']
    mes_ano = datetime.now().strftime('%m/%Y')
    
    # Verifica se já existe checklist para este mês
    existente = Checklist.query.filter_by(
        operador_id=usuario_id,
        mes_ano=mes_ano
    ).first()
    
    if existente:
        return jsonify({'success': False, 'message': 'Checklist já existe para este mês'})
    
    checklist = Checklist(
        equipamento_id=dados['equipamento_id'],
        operador_id=usuario_id,
        mes_ano=mes_ano,
        status='pendente'
    )
    
    db.session.add(checklist)
    db.session.flush()
    
    # Itens padrão do checklist
    itens_padrao = [
        'Verificar nível de óleo',
        'Limpar filtros de ar',
        'Testar válvula de segurança',
        'Verificar correias',
        'Inspecionar conexões elétricas',
        'Lubrificar partes móveis',
        'Verificar pressão de trabalho',
        'Inspecionar vazamentos'
    ]
    
    for item_desc in itens_padrao:
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
        ]
        db.session.add_all(equipamentos)
    
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

if __name__ == '__main__':
    app.run(debug=True)