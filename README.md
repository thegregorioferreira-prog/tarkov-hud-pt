# Tarkov HUD PT

Companion desktop para Escape from Tarkov, em português, com interface tática tipo GPS/HUD.

## O que esta versão já faz
- Interface desktop Windows via Electron.
- Seleção dos principais mapas.
- Monitorização automática da pasta de screenshots.
- Atualização visual da posição a partir de coordenadas presentes no nome do screenshot.
- HUD com X/Y/Z e rumo.
- Painel de squad e camadas.
- Código preparado para receber o módulo de mapas reais e sincronização online.

## Importante sobre "tempo real"
O método seguro é trabalhar com dados externos ao processo do jogo, como screenshots. Ferramentas comunitárias existentes usam precisamente este modelo para geolocalização e overlay, em vez de ler memória do jogo.

## Criar o instalador Windows
Requer Node.js 20+.

    npm install
    npm run dist:win

O instalador será criado em `dist/`.

## Próxima fase
Para uma versão final distribuível, falta ligar:
1. mapas SVG reais e dados de POI;
2. parser robusto do formato de screenshots atual do EFT;
3. overlay sempre-no-top;
4. backend de squad (WebSocket/Supabase);
5. ícones/markers de extrações, bosses, quests e perigos;
6. atualizador automático.

Os dados de mapas podem ser alimentados por projetos comunitários como tarkov.dev/tarkovdata.