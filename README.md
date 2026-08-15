# Tarkov HUD PT 0.4.0

Companion Windows em português para Escape from Tarkov.

## Entrada de screenshots

Por defeito a app monitoriza:

`C:\Medal\Screenshots\Escape From Tarkov`

A pasta pode ser alterada pelo botão **Medal**.

## O que esta versão corrige

- Monitorização recursiva da pasta Medal.
- Detecção de PNG/JPG/JPEG/WEBP.
- Usa a data/tamanho do ficheiro para detetar novas capturas.
- Não inventa X/Y/Z a partir do nome do ficheiro.
- Mostra o estado da captura e prepara a pipeline de localização visual.
- Calibração inicial do marcador.

## Limite importante

Uma screenshot normal de gameplay, como as capturas do Medal, não contém coordenadas GPS/XYZ nos metadados. A localização absoluta exige um motor de geolocalização visual com referências de imagens/mapas. Esta versão não finge ter essa informação quando ela não existe.

O próximo módulo deve ligar um conjunto de referências visuais EFT -> coordenadas do mapa e depois aplicar matching entre frames.

## Build

`npm install`

`npm run dist:win`
