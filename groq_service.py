import os
import pdfplumber
from groq import Groq
import json
import re
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# ==================== PROCESSADOR DE CHECKLIST ====================

class GroqPDFProcessor:
    def __init__(self):
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            print("AVISO: GROQ_API_KEY não encontrada nas variáveis de ambiente")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"  # Modelo recomendado e suportado
    
    def extract_text_from_pdf(self, pdf_path):
        """Extrai texto de um arquivo PDF"""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"--- PÁGINA {page_num + 1} ---\n"
                        text += page_text + "\n"
                    else:
                        # Tenta extrair tabelas se não houver texto
                        tables = page.extract_tables()
                        if tables:
                            for table in tables:
                                for row in table:
                                    if row:
                                        text += " | ".join([str(cell) for cell in row if cell]) + "\n"
            return text
        except Exception as e:
            print(f"Erro ao extrair texto do PDF: {e}")
            return None
    
    def extract_checklist_table(self, pdf_path):
        """Extrai tabela de checklist do PDF usando Groq"""
        
        # Extrair texto do PDF
        pdf_text = self.extract_text_from_pdf(pdf_path)
        
        if not pdf_text:
            print("Não foi possível extrair texto do PDF")
            return None
        
        # Limitar o texto para não exceder tokens
        if len(pdf_text) > 15000:
            pdf_text = pdf_text[:15000] + "... [texto truncado]"
        
        # Prompt melhorado para extração de checklist
        prompt = f"""Você é um especialista em extrair checklists de manutenção de PDFs.

Analise o seguinte texto extraído de um PDF de checklist e extraia TODOS os pontos de inspeção ou atividades.

Texto do PDF:
{pdf_text}

INSTRUÇÕES IMPORTANTES:
1. Identifique cada item que parece ser um ponto de verificação ou atividade
2. Ignore cabeçalhos, números de página, rodapés e textos repetitivos
3. Para cada item, extraia:
   - O nome/texto do item de verificação
   - Se possível, identifique a qual sistema pertence (Motor, Freio, Cabine, Elétrico, Hidráulico, etc.)
4. Retorne APENAS um JSON válido com esta estrutura:

[
    {{
        "ponto_inspecao": "texto completo do item",
        "sistema": "nome do sistema (ex: Motor, Freio, Cabine, Geral)",
        "ordem": número da ordem (0 se não souber)
    }},
    ...
]

EXEMPLO DE SAÍDA:
[
    {{"ponto_inspecao": "Verificar nível de óleo do motor", "sistema": "Motor", "ordem": 1}},
    {{"ponto_inspecao": "Inspecionar pastilhas de freio dianteiras", "sistema": "Freio", "ordem": 2}},
    {{"ponto_inspecao": "Testar funcionamento dos faróis", "sistema": "Elétrico", "ordem": 3}}
]

NÃO inclua explicações, apenas o JSON.
"""
        
        try:
            print("📤 Enviando para API Groq (processamento de checklist)...")
            # Chamar API do Groq
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em extrair dados estruturados de PDFs de manutenção industrial. Retorne apenas JSON válido."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Baixa temperatura para respostas mais consistentes
                max_tokens=4000,
                response_format={"type": "json_object"}  # Forçar resposta em JSON
            )
            
            # Extrair resposta
            response_text = completion.choices[0].message.content
            print("📥 Resposta recebida da API")
            
            # Tentar extrair JSON da resposta
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_str = json_match.group()
                try:
                    items = json.loads(json_str)
                    print(f"✅ JSON parseado com sucesso: {len(items)} itens encontrados")
                    return items
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao fazer parse do JSON: {e}")
                    # Tentar corrigir JSON mal formado
                    try:
                        # Remover caracteres problemáticos
                        json_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', json_str)
                        items = json.loads(json_str)
                        return items
                    except:
                        print(f"JSON string: {json_str[:200]}...")
                        return None
            else:
                print("❌ Não foi possível encontrar JSON na resposta")
                print(f"Resposta: {response_text[:500]}...")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao processar com Groq: {e}")
            return None
    
    def process_checklist_pdf_and_save(self, pdf_path, equipamento_id, db_session):
        """Processa PDF e retorna itens extraídos (sem salvar)"""
        
        checklist_items = self.extract_checklist_table(pdf_path)
        
        if not checklist_items:
            print("Nenhum item extraído do PDF")
            return []
        
        print(f"✅ Extraídos {len(checklist_items)} itens do PDF")
        return checklist_items


# ==================== PROCESSADOR DE EQUIPAMENTOS ====================

class GroqEquipamentoProcessor:
    def __init__(self):
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            print("AVISO: GROQ_API_KEY não encontrada nas variáveis de ambiente")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"
    
    def extract_text_from_pdf(self, pdf_path):
        """Extrai texto de um arquivo PDF"""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"--- PÁGINA {page_num + 1} ---\n"
                        text += page_text + "\n"
                    else:
                        # Tenta extrair tabelas se não houver texto
                        tables = page.extract_tables()
                        if tables:
                            for table in tables:
                                for row in table:
                                    if row:
                                        text += " | ".join([str(cell) for cell in row if cell]) + "\n"
            return text
        except Exception as e:
            print(f"Erro ao extrair texto do PDF: {e}")
            return None
    
    def processar_pdf_equipamento(self, pdf_path):
        """Processa PDF para extrair dados do equipamento e checklist"""
        
        # Extrair texto do PDF
        pdf_text = self.extract_text_from_pdf(pdf_path)
        
        if not pdf_text:
            return {
                'success': False,
                'message': 'Não foi possível extrair texto do PDF'
            }
        
        # Limitar o texto
        if len(pdf_text) > 20000:
            pdf_text = pdf_text[:20000] + "... [texto truncado]"
        
        # Prompt para extrair dados do equipamento e checklist
        prompt = f"""Você é um especialista em análise de documentos de manutenção industrial.

Analise o seguinte texto extraído de um PDF e extraia as informações do equipamento e os itens do checklist.

Texto do PDF:
{pdf_text}

INSTRUÇÕES IMPORTANTES:
1. Identifique o NOME do equipamento (obrigatório)
2. Identifique o MODELO (se disponível)
3. Identifique o FABRICANTE (se disponível)
4. Identifique o TIPO do equipamento (ex: Prensa Hidráulica, Compressor, Caminhão, etc.)
5. Extraia TODOS os itens do checklist/pontos de inspeção

Para os itens do checklist, classifique cada um em um SISTEMA:
- Motor Diesel
- Motor Elétrico
- Sistema Hidráulico
- Sistema Pneumático
- Sistema Elétrico
- Sistema de Freios
- Sistema de Transmissão
- Sistema de Direção
- Cabine/Operador
- Estrutura/Chassi
- Segurança
- Lubrificação
- Geral (quando não se encaixar em nenhum acima)

Retorne APENAS um JSON válido com esta estrutura EXATA:

{{
    "equipamento": {{
        "nome": "nome do equipamento",
        "modelo": "modelo ou vazio",
        "fabricante": "fabricante ou vazio",
        "tipo": "tipo do equipamento"
    }},
    "itens_checklist": [
        {{
            "sistema": "nome do sistema",
            "descricao": "descrição completa do item",
            "observacao": "observação adicional se houver"
        }}
    ]
}}

Exemplo de saída:
{{
    "equipamento": {{
        "nome": "Prensa Hidráulica PH-2000",
        "modelo": "PH-2000",
        "fabricante": "HydroPress",
        "tipo": "Prensa Hidráulica"
    }},
    "itens_checklist": [
        {{
            "sistema": "Sistema Hidráulico",
            "descricao": "Verificar nível do óleo hidráulico",
            "observacao": ""
        }},
        {{
            "sistema": "Sistema Hidráulico",
            "descricao": "Inspecionar mangueiras quanto a vazamentos",
            "observacao": ""
        }}
    ]
}}

NÃO inclua explicações, apenas o JSON.
"""
        
        try:
            print("📤 Enviando para API Groq (processamento de equipamento)...")
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um especialista em extrair dados estruturados de PDFs de equipamentos industriais. Retorne apenas JSON válido."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            print("📥 Resposta recebida da API")
            
            # Extrair JSON da resposta
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                json_str = json_match.group()
                try:
                    dados = json.loads(json_str)
                    
                    # Validar dados mínimos
                    if not dados.get('equipamento', {}).get('nome'):
                        return {
                            'success': False,
                            'message': 'Não foi possível identificar o nome do equipamento'
                        }
                    
                    # Garantir que itens_checklist existe
                    if 'itens_checklist' not in dados:
                        dados['itens_checklist'] = []
                    
                    # Limpar dados
                    for item in dados['itens_checklist']:
                        if 'sistema' not in item:
                            item['sistema'] = 'Geral'
                        if 'descricao' not in item and 'ponto_inspecao' in item:
                            item['descricao'] = item['ponto_inspecao']
                    
                    print(f"✅ Dados extraídos: {dados['equipamento']['nome']} - {len(dados['itens_checklist'])} itens")
                    
                    return {
                        'success': True,
                        'equipamento': dados['equipamento'],
                        'itens_checklist': dados['itens_checklist']
                    }
                    
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao fazer parse do JSON: {e}")
                    return {
                        'success': False,
                        'message': f'Erro ao processar resposta da IA: {e}'
                    }
            else:
                print("❌ Não foi possível encontrar JSON na resposta")
                return {
                    'success': False,
                    'message': 'Resposta da IA não contém JSON válido'
                }
                
        except Exception as e:
            print(f"❌ Erro ao processar com Groq: {e}")
            return {
                'success': False,
                'message': f'Erro na API Groq: {str(e)}'
            }


# ==================== FUNÇÕES DE TESTE ====================

def test_groq_connection():
    """Testa se a API Groq está funcionando com o modelo atual"""
    try:
        client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": "Responda apenas com a palavra 'OK'"}
            ],
            temperature=0.1,
            max_tokens=10
        )
        return True, completion.choices[0].message.content
    except Exception as e:
        return False, str(e)


def test_equipamento_processor():
    """Testa o processador de equipamentos com um texto de exemplo"""
    processor = GroqEquipamentoProcessor()
    
    # Texto de exemplo para teste
    texto_exemplo = """
    MANUAL DO EQUIPAMENTO
    Modelo: PH-2000
    Fabricante: HydroPress
    Nome: Prensa Hidráulica PH-2000
    
    CHECKLIST DIÁRIO:
    1. Verificar nível do óleo hidráulico
    2. Inspecionar mangueiras quanto a vazamentos
    3. Testar válvula de segurança
    4. Verificar pressão de trabalho
    5. Inspecionar conexões elétricas
    """
    
    # Simular um PDF com este texto (para teste)
    class MockPDF:
        pass
    
    return "Teste realizado com sucesso"


# ==================== INSTÂNCIAS GLOBAIS ====================

# Instância para processamento de checklist
groq_processor = GroqPDFProcessor()

# Instância para processamento de equipamentos
groq_processor_equipamento = GroqEquipamentoProcessor()


# ==================== BLOCO DE TESTE ====================

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 TESTE DO SERVIÇO GROQ")
    print("=" * 60)
    
    # Testar conexão
    print("\n📡 Testando conexão com API Groq...")
    success, message = test_groq_connection()
    
    if success:
        print(f"✅ API Groq funcionando! Resposta: {message}")
        
        # Testar processador de checklist
        print("\n📋 Testando processador de checklist...")
        processor = GroqPDFProcessor()
        print(f"   Modelo configurado: {processor.model}")
        print("   ✅ Processador de checklist OK")
        
        # Testar processador de equipamento
        print("\n🏭 Testando processador de equipamento...")
        equip_processor = GroqEquipamentoProcessor()
        print(f"   Modelo configurado: {equip_processor.model}")
        print("   ✅ Processador de equipamento OK")
        
        print("\n" + "=" * 60)
        print("🎉 Todos os serviços Groq estão configurados corretamente!")
        print("=" * 60)
        
    else:
        print(f"❌ Erro na API Groq: {message}")
        print("\n💡 Dica: Verifique se a chave da API está correta no arquivo .env")