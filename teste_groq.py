from groq_service import test_groq_connection, GroqPDFProcessor

# Testar conexão
print("Testando conexão com API Groq...")
success, message = test_groq_connection()

if success:
    print(f"✅ API Groq funcionando! Resposta: {message}")
    
    # Testar processador
    processor = GroqPDFProcessor()
    print(f"Modelo configurado: {processor.model}")
else:
    print(f"❌ Erro na API Groq: {message}")