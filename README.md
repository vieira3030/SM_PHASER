# Smart Traffic Control

Jogo 2D em **Phaser 4** (Arcade Physics) para Sistemas Multimédia 2026/27 — Universidade Politécnica de Viana do Castelo (ECGM).
Tema: **sistemas inteligentes de apoio à decisão**.

Clicas nos semáforos de Viana do Castelo para dar passagem às ambulâncias até ao Hospital de Santa Luzia e escolher o melhor posto de carregamento para cada carro elétrico. Inspirado em jogos como Traffix e Traffic Command. Um Assistente de Tráfego sugere decisões, mas és tu que decides.

## Como executar
Abrir a pasta no VS Code e usar **Live Server** (`http://127.0.0.1:5500`). Não funciona a partir de `file://` (módulos ES). Não usa APIs nem internet.

## Níveis
1. Emergência — 4 ambulâncias ao hospital.
2. Carregamento — 4 carros elétricos: escolher o posto (tempo total + custo).
3. Hora de ponta — 3 ambulâncias + 3 carros elétricos.

## Conceitos técnicos (apoio à decisão)
- **Motor de regras SE–ENTÃO com explicação** (`MotorDSS.avaliarSemaforos`): ambulância, fila longa, espera longa.
- **Pontuação multicritério ponderada** (`MotorDSS.classificarPostos`): tempo total (viagem + espera + carga) e custo, com pesos que dependem do nível de bateria.
- **Dijkstra com custos dinâmicos** (`Grafo.rota`): filas e semáforos vermelhos alteram o custo das ruas.
- Aleatoriedade controlada: intervalos de geração sorteados dentro de limites por nível; ocupação dos postos sorteada; bateria ajustada para o jogo ser justo.

## Estrutura
- `src/scenes/` — Preload, Menu, Instruções, Jogo, GameOver
- `src/classes/` — Constantes, Dados, Grafo, MotorDSS, Semaforo, Veiculo, GestorNiveis, Som, UI
- `assets/img`, `assets/audio` — imagens e sons

## Dados dos postos (aproximados)
Os locais são reais (Viana do Castelo): ESE-IPVC, Continente, Leroy Merlin, Área de Serviço A28. As **potências e preços são aproximados e inventados para o jogo** (gama típica 0,30–0,55 €/kWh); não são dados oficiais.

## Declaração de uso de IA
Imagens (mapa, carros, ícones) e sons foram gerados por código com assistência de IA (Claude). O código do jogo foi desenvolvido com assistência de IA e deve ser estudado e compreendido pelo autor.

Autor: André Alves Flores (n.º 33117)
