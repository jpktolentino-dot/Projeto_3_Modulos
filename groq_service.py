import os
import pdfplumber
from groq import Groq
import json
import re
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class GroqPDFProcessor:
    def __init__(self):
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            print("AVISO: GROQ_API_KEY não encontrada nas variáveis de ambiente")
        
        self.client = Groq(
            api_key=api_key
        )
        # Modelo atualizado para um que está ativo
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
            print("Enviando para API Groq...")
            # Chamar API do Groq com o modelo atualizado
            completion = self.client.chat.completions.create(
                model=self.model,  # Usando o modelo definido na classe
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
            print("Resposta recebida da API")
            
            # Tentar extrair JSON da resposta
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_str = json_match.group()
                try:
                    items = json.loads(json_str)
                    print(f"JSON parseado com sucesso: {len(items)} itens encontrados")
                    return items
                except json.JSONDecodeError as e:
                    print(f"Erro ao fazer parse do JSON: {e}")
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
                print("Não foi possível encontrar JSON na resposta")
                print(f"Resposta: {response_text[:500]}...")
                return None
                
        except Exception as e:
            print(f"Erro ao processar com Groq: {e}")
            return None
    
    def process_checklist_pdf_and_save(self, pdf_path, equipamento_id, db_session):
        """Processa PDF e retorna itens extraídos (sem salvar)"""
        
        checklist_items = self.extract_checklist_table(pdf_path)
        
        if not checklist_items:
            print("Nenhum item extraído do PDF")
            return []
        
        print(f"Extraídos {len(checklist_items)} itens do PDF")
        return checklist_items

# Instância global para uso em toda a aplicação
groq_processor = GroqPDFProcessor()

# Função de teste atualizada
def test_groq_connection():
    """Testa se a API Groq está funcionando com o modelo atual"""
    try:
        client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Modelo atualizado
            messages=[
                {"role": "user", "content": "Responda apenas com a palavra 'OK'"}
            ],
            temperature=0.1,
            max_tokens=10
        )
        return True, completion.choices[0].message.content
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    # Teste rápido
    success, message = test_groq_connection()
    if success:
        print(f"✅ API Groq funcionando! Resposta: {message}")
    else:
        print(f"❌ Erro na API Groq: {message}")