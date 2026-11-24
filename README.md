# Smart Traffic Control

Jogo 2D em **Phaser 4** (Arcade Physics) para Sistemas Multimédia 2026/27 — Universidade Politécnica de Viana do Castelo (ECGM).
Tema: **sistemas inteligentes de apoio à decisão**.

Clicas nos semáforos de Viana do Castelo para dar passagem às ambulâncias até ao Hospital de Santa Luzia e escolher o melhor posto de carregamento para cada carro elétrico. Inspirado em jogos como Traffix e Traffic Command. Um Assistente de Tráfego sugere decisões, mas és tu que decides.

## Como executar
Abrir a pasta no VS Code e usar **Live Server** (`http://127.0.0.1:5500`). Não funciona a partir de `file://` (módulos ES). Não usa APIs nem internet.

## Níveis
A cidade cresce de nível para nível e há mais missões ao mesmo tempo.
1. Centro — grelha 2x2 (4 cruzamentos): 3 ambulâncias + 2 elétricos, 1 missão de cada vez.
2. Avenidas — grelha 3x2 (6 cruzamentos): 4 ambulâncias + 3 elétricos, até 2 em simultâneo.
3. Hora de ponta — grelha 3x3 (9 cruzamentos): 5 ambulâncias + 4 elétricos, até 3 em simultâneo.

Relógio global: começa em 40 s; cada entrega dá até +10 s (+9 no nível 2, +8 no nível 3), menos 1 s por cada 6 s que a missão demorou, com mínimo de 3 s (o tempo não reinicia). O tempo que sobra passa para o nível seguinte (+10 s). Se chegar a 0, o jogo termina. Penalizações: elétrico sem bateria (−10 s), congestionamento (−8 s).

Os mapas (assets/img/mapa1-3.png) e a geometria do hospital e dos postos (assets/data/niveis.json) foram gerados por código.

## Controlos
- Rato / toque: clicar num dos 4 semáforos de um cruzamento troca o verde; botões do painel; cartões e etiquetas dos postos.
- Teclado: `A` aceitar sugestão · `I` ignorar · `1`–`4` escolher posto · `Espaço` confirmar posto · `P`/`Esc` pausa · `Enter` no menu começa o jogo.
- O nível 1 tem um tutorial (seta) nas primeiras jogadas. Top 5 de pontuações com nome, guardado no browser.

## Conceitos técnicos (apoio à decisão)
- **Motor de regras SE–ENTÃO com explicação** (`MotorDSS.avaliarSemaforos`): ambulância, fila longa, espera longa.
- **Pontuação multicritério ponderada** (`MotorDSS.classificarPostos`): tempo total (viagem + espera + carga) e custo, com pesos que dependem do nível de bateria.
- **Dijkstra (caminho mais curto)** (`Grafo.rota`, `Grafo.caminhoDestino`): cada veículo segue a rota mais curta; para entrar num destino o jogo compara a entrada pelos dois sentidos da rua e escolhe a mais curta.
- Aleatoriedade controlada: intervalos de geração sorteados dentro de limites por nível; ocupação dos postos sorteada; bateria ajustada para o jogo ser justo.

## Estrutura
- `src/scenes/` — Preload, Menu, Instruções, Jogo, GameOver
- `src/classes/` — Constantes, Dados, Grafo, MotorDSS, Semaforo, Veiculo, GestorNiveis, Som, UI
- `assets/img`, `assets/audio` — imagens e sons

## Dados dos postos (aproximados)
Os locais são reais (Viana do Castelo): ESE-IPVC, Continente, Leroy Merlin, Área de Serviço A28. As **potências e preços são aproximados e inventados para o jogo** (gama típica 0,30–0,55 €/kWh); não são dados oficiais.

## Declaração de uso de IA
Imagens (mapa, carros, ícones) e sons foram gerados por código com assistência de IA (Claude). O código do jogo foi desenvolvido com assistência de IA e deve ser estudado e compreendido pelo autor.

Autor: Rodrigo Miguel Castro Vieira (n.º 33445)
