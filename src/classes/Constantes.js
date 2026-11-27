// =====================================================================================================
//  CONSTANTES GLOBAIS DO JOGO  —  GUIA "ONDE MUDAR O QUÊ" (útil para a defesa)
// =====================================================================================================
//  Velocidade dos carros ............ VEL_NORMAL / VEL_AMB / VEL_EV (aqui, em px/s)
//  Aceleração / travagem ............ ACELERACAO / TRAVAGEM (aqui)
//  Tamanho dos veículos ............. ESCALA_VEICULO (aqui)
//  Distância entre carros ........... DIST_SEGURANCA (aqui)
//  Onde os carros param no sinal .... DIST_PARAGEM (aqui)
//  Tempo automático dos semáforos ... SEMAFORO_AUTO (aqui, segundos)
//  Área de clique dos semáforos ..... AREA_TOQUE (aqui, px)
//  Gasto de bateria dos elétricos ... CONSUMO_BATERIA (aqui, % por segundo)
//  Tempo para escolher o posto ...... TEMPO_ESCOLHA (aqui)
//  Penalizações de tempo ............ PENAL_BATERIA / PENAL_CONGESTAO (aqui)
//  Tempo inicial e bónus ............ TEMPO_INICIAL / BONUS_NIVEL / bonus de cada nível (GestorNiveis.js)
//  Nº de missões, trânsito, etc. .... NIVEIS em GestorNiveis.js (objetivos, simultaneas, carros, missao)
//  Postos: nome, kW, preço .......... POSTOS em Dados.js
//  Pesos da escolha de postos ....... MotorDSS.classificarPostos (linha "const w = ...": w.t tempo, w.c custo)
//  Regras do Assistente ............. MotorDSS.avaliarSemaforos (R1, R2, R3)
//  Cores e letra .................... COR / FONTE (aqui)
//  Mapa de cada nível ............... assets/img/mapa1-3.png + assets/data/niveis.json
// =====================================================================================================
// --- ecrã: o jogo usa coordenadas de 800x480 (mapa 600x480 + painel 200x480) ---
export const LARGURA = 800;
export const ALTURA = 480;
export const ESCALA = 2;                // resolução do canvas (2x) para a imagem ficar nítida
export const MAPA_L = 600;              // largura da área do mapa (o resto é o painel)

// --- geometria do mapa (tem de bater certo com os mapas gerados) ---
export const FAIXA = 14;                // distância do centro da estrada ao centro da faixa
export const DIST_PARAGEM = 66;         // distância do centro do cruzamento ao ponto onde os carros param

// --- veículos ---
export const VEL_NORMAL = [58, 72];     // velocidade dos carros normais (px/s): sorteada entre estes valores
export const VEL_AMB = 95;              // velocidade da ambulância (px/s)
export const VEL_EV = 70;               // velocidade do carro elétrico (px/s)
export const ACELERACAO = 110;          // px/s² ao arrancar
export const TRAVAGEM = 700;            // px/s² ao travar (quanto maior, mais depressa pára)
export const VEL_ROTACAO = 7;           // rapidez com que o carro roda nas curvas (rad/s)
export const ESCALA_VEICULO = 0.5;      // tamanho dos veículos (1 = tamanho da imagem, 72x36 px)
export const DIST_SEGURANCA = 48;       // distância (px) a que um carro trava atrás de outro
export const CONSUMO_BATERIA = 1.3;     // % de bateria gasta por segundo pelo carro elétrico

// --- semáforos e missões ---
export const SEMAFORO_AUTO = [10, 15];  // se ninguém mexer, os semáforos trocam sozinhos ao fim de 10-15 s
export const AREA_TOQUE = 54;           // tamanho (px) da área clicável de cada semáforo
export const TEMPO_ESCOLHA = 15;        // segundos para escolher o posto (depois segue para o selecionado)
export const PENAL_BATERIA = 10;        // segundos perdidos quando um elétrico fica sem bateria
export const PENAL_CONGESTAO = 8;       // segundos perdidos quando a barra de trânsito parado enche

// Modelo simples de carro elétrico (valores típicos de um compacto atual)
export const BATERIA_KWH = 55;          // capacidade útil
export const CARGA_ATE = 80;            // carrega até 80 %
export const MAX_AC = 11;               // kW máximos em corrente alternada (carregador de bordo)
export const MAX_DC = 100;              // kW máximos em corrente contínua (carga rápida)
export const MIN_POR_SEGUNDO = 0.55;    // 1 s de jogo ≈ 0,55 min de viagem real (só para os cálculos do DSS)

// --- aspeto ---
export const FONTE = 'Trebuchet MS, Verdana, Arial, sans-serif';
// cores do painel e dos botões (0x... = número para formas; '#...' = texto)
export const COR = {
    papel: 0x232831, papelEscuro: 0x3a414d, tinta: 0xe8e6df, terracota: 0xc77d1e, terracotaEsc: 0xa8670f,
    verde: 0x3aa876, amarelo: 0xe9b949, vermelho: 0xd0453a, azul: 0x3b8ec2, cinza: 0x7b8391, branco: 0x2d333e,
    tintaTxt: '#e8e6df', terracotaTxt: '#f0b04a', verdeTxt: '#6fd3a0', cinzaTxt: '#9aa1ad', brancoTxt: '#fffdf6'
};

// eixo de um sentido de marcha: E/W -> 'H' (horizontal), N/S -> 'V' (vertical)
export const eixoDe = (dir) => (dir === 'E' || dir === 'W') ? 'H' : 'V';
// o eixo perpendicular
export const outroEixo = (e) => (e === 'H' ? 'V' : 'H');
// vetor unitário de cada sentido de marcha (y cresce para baixo)
export const VETOR = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
