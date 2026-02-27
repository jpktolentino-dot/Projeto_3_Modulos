// static/js/checklist_daf_510.js

// Itens do checklist do DAF 510 baseado no PDF
const itensChecklistDAF = [
    // SISTEMA HIDRÁULICO
    { sistema: 'Bomba Hidráulica', item: 'Mangueiras - vazamentos' },
    { sistema: 'Bomba Hidráulica', item: 'Bomba - ruídos anormais' },
    { sistema: 'Comando Hidráulico', item: 'Mangueiras, tubos e vazamentos' },
    
    // CABINE
    { sistema: 'Cabine', item: 'Ruídos internos' },
    { sistema: 'Cabine', item: 'Banco do operador/motorista e Cinto de Segurança' },
    { sistema: 'Cabine', item: 'Braço e palheta do limpador parabrisas' },
    { sistema: 'Cabine', item: 'Buzina' },
    { sistema: 'Cabine', item: 'Canopla de câmbio' },
    { sistema: 'Cabine', item: 'Chefe diário de bordo do operador' },
    { sistema: 'Cabine', item: 'Cinto de segurança - Passageiros' },
    { sistema: 'Cabine', item: 'Condições dos bancos e do piso' },
    { sistema: 'Cabine', item: 'Escada de acesso' },
    { sistema: 'Cabine', item: 'Espelho retrovisor' },
    { sistema: 'Cabine', item: 'Falhas refletivas' },
    { sistema: 'Cabine', item: 'Farol alto' },
    { sistema: 'Cabine', item: 'Farol baixo' },
    { sistema: 'Cabine', item: 'Folga na alavanca de câmbio' },
    { sistema: 'Cabine', item: 'Funcionamento/acionamento dos pedais' },
    { sistema: 'Cabine', item: 'Mangueiras/cabos obstruindo os pedais' },
    { sistema: 'Cabine', item: 'Iluminação interna' },
    { sistema: 'Cabine', item: 'Infiltração de poeira e água' },
    { sistema: 'Cabine', item: 'Limpeza e asseio' },
    { sistema: 'Cabine', item: 'Luz de freio' },
    { sistema: 'Cabine', item: 'Luz de placa' },
    { sistema: 'Cabine', item: 'Luz de ré' },
    { sistema: 'Cabine', item: 'Macaco, chave e triângulo' },
    { sistema: 'Cabine', item: 'Para-brisas - riscos e trincas' },
    { sistema: 'Cabine', item: 'Pisca direito' },
    { sistema: 'Cabine', item: 'Pisca esquerdo' },
    { sistema: 'Cabine', item: 'Portas da Cabine, Fechaduras e Saída de Emergência' },
    { sistema: 'Cabine', item: 'Sirene de Ré/Alarme de Deslocamento/Câmera de Ré' },
    { sistema: 'Cabine', item: 'Suporte de bateria' },
    { sistema: 'Cabine', item: 'Tacógrafo' },
    { sistema: 'Cabine', item: 'Freio de estacionamento' },
    
    // BATERIA
    { sistema: 'Caixa da Bateria', item: 'Cabos de bateria, aterramento e chave geral' },
    { sistema: 'Caixa da Bateria', item: 'Polos derretidos da bateria e limpeza do compartimento' },
    
    // CHASSI
    { sistema: 'Chassi', item: 'Estrutura do chassi' },
    { sistema: 'Chassi', item: 'Para-barro' },
    { sistema: 'Chassi', item: 'Para-barro - carreta' },
    { sistema: 'Chassi', item: 'Pára-choques' },
    
    // COMBATE INCÊNDIO
    { sistema: 'Combate Incêndio', item: 'Carga e validade dos extintores de incêndio' },
    
    // DIREÇÃO/ARTICULAÇÃO
    { sistema: 'Direção', item: 'Mangueiras da direção' },
    { sistema: 'Direção', item: 'Trincas/Folgas na articulação do chassi' },
    { sistema: 'Direção', item: 'Vazamentos no sistema' },
    { sistema: 'Direção', item: 'Caixa de direção' },
    { sistema: 'Direção', item: 'Terminais da barra de direção direito' },
    { sistema: 'Direção', item: 'Terminais da barra de direção esquerda' },
    { sistema: 'Direção', item: 'Terminais da caixa de direção' },
    
    // DOCUMENTAÇÃO
    { sistema: 'Documentação', item: 'Aferição do tacógrafo' },
    { sistema: 'Documentação', item: 'Carteira de motorista D ou E' },
    { sistema: 'Documentação', item: 'Licenciamento' },
    
    // FREIO
    { sistema: 'Freio', item: 'Cilindros de freio' },
    { sistema: 'Freio', item: 'Mangueiras de freio' },
    { sistema: 'Freio', item: 'Vazamentos no sistema de freio' },
    { sistema: 'Freio', item: 'Lona, flexível e campanas de freio dianteiro' },
    { sistema: 'Freio', item: 'Lona, flexível e campanas de freio traseiro' },
    { sistema: 'Freio', item: 'Vazamento de ar/óleo de freio' },
    
    // MOTOR DIESEL
    { sistema: 'Motor Diesel', item: 'Vazamentos em geral' },
    { sistema: 'Motor Diesel', item: 'Ruídos anormais' },
    { sistema: 'Motor Diesel', item: 'Cano de escape' },
    { sistema: 'Motor Diesel', item: 'Cabo do motor diesel' },
    { sistema: 'Motor Diesel', item: 'Chicotes elétricos das laterais do bloco do motor (isolamento)' },
    { sistema: 'Motor Diesel', item: 'Chicotes elétricos do ALTERNADOR (isolamento e sinais de derretimento)' },
    { sistema: 'Motor Diesel', item: 'Chicotes elétricos do MOTOR DE PARTIDA (isolamento e sinais de derretimento)' },
    { sistema: 'Motor Diesel', item: 'Chicotes elétricos que passam por baixo do cárter (isolamento)' },
    { sistema: 'Motor Diesel', item: 'Chicotes elétricos que passam por cima do cabeçote (isolamento)' },
    { sistema: 'Motor Diesel', item: 'Compressor ar condicionado' },
    { sistema: 'Motor Diesel', item: 'Correias' },
    { sistema: 'Motor Diesel', item: 'Coxim de fixação do motor' },
    { sistema: 'Motor Diesel', item: 'Emissão de fumaça preta' },
    { sistema: 'Motor Diesel', item: 'Escapamento e Silencioso' },
    { sistema: 'Motor Diesel', item: 'Filtro de ar' },
    { sistema: 'Motor Diesel', item: 'Hélice do radiador' },
    { sistema: 'Motor Diesel', item: 'Proteção e Mangueira do radiador de água' },
    { sistema: 'Motor Diesel', item: 'Manta térmica do escapamento, silencioso e turbina' },
    { sistema: 'Motor Diesel', item: 'Nível de óleo do motor' },
    { sistema: 'Motor Diesel', item: 'Radiador água e Ar condicionado (coxins, fixação e vazamentos)' },
    { sistema: 'Motor Diesel', item: 'Radiador óleo' },
    { sistema: 'Motor Diesel', item: 'Sensores de alarme' },
    { sistema: 'Motor Diesel', item: 'Mangueira de Lubrificação da Turbina' },
    
    // PNEUS
    { sistema: 'Pneus', item: 'Realizar APRM - Serviços de Borracharia' },
    { sistema: 'Pneus', item: 'Calibragem' },
    { sistema: 'Pneus', item: 'Desgastes' },
    { sistema: 'Pneus', item: 'Pneu sobressalente' },
    { sistema: 'Pneus', item: 'Posição de rodagem' },
    { sistema: 'Pneus', item: 'Rasgos nas Laterais EXTERNAS, INTERNAS e BANDA DE RODAGEM' },
    
    // TANGUÉ COMBUSTÍVEL
    { sistema: 'Tanque Combustível', item: 'Limpeza do tanque' },
    { sistema: 'Tanque Combustível', item: 'Peneira e respiro' },
    { sistema: 'Tanque Combustível', item: 'Sensor de nível' },
    { sistema: 'Tanque Combustível', item: 'Mangueiras de combustível' },
    
    // TANGUÉ HIDRÁULICO
    { sistema: 'Tanque Hidráulico', item: 'Nível de óleo hidráulico' },
    { sistema: 'Tanque Hidráulico', item: 'Sensores de temperatura' },
    
    // TRANSMISSÃO
    { sistema: 'Transmissão', item: 'Mangueiras da transmissão' },
    { sistema: 'Transmissão', item: 'Vazamentos na transmissão' },
    { sistema: 'Transmissão', item: 'Vareta de Nível' },
    { sistema: 'Transmissão', item: 'Ruídos anormais' },
    { sistema: 'Transmissão', item: 'Chicotes elétricos da transmissão' },
    { sistema: 'Transmissão', item: 'Cardan dianteiro (Cruzetas, parafusos)' },
    { sistema: 'Transmissão', item: 'Cardan traseiro (Cruzetas, parafusos)' },
    { sistema: 'Transmissão', item: 'Cruzetas do cardã' },
    { sistema: 'Transmissão', item: 'Cintas de segurança do cardã' },
    { sistema: 'Transmissão', item: 'Flange do Cardã' },
    { sistema: 'Transmissão', item: 'Diferencial dianteiro e traseiro' },
    { sistema: 'Transmissão', item: 'Vazamento de óleo do diferencial' },
    { sistema: 'Transmissão', item: 'Prisioneiros/porca de roda' },
    { sistema: 'Transmissão', item: 'Verificar desgaste das cremalheiras' }
];