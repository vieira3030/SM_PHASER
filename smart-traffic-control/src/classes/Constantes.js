// Constantes globais do jogo (dimensões, geometria do mapa, velocidades, cores).
export const LARGURA = 800;
export const ALTURA = 480;
export const MAPA_L = 600;              // largura da área do mapa (o resto é o painel)

export const COLUNAS = [110, 300, 490]; // x das 3 avenidas verticais (iguais às da imagem do mapa)
export const LINHAS = [130, 330];       // y das 2 avenidas horizontais
export const FAIXA = 14;                // distância do centro da estrada ao centro da faixa
export const MEIA_ESTRADA = 28;
export const DIST_PARAGEM = 60;         // distância do centro do cruzamento ao ponto onde os carros param

export const VEL_NORMAL = [58, 72];
export const VEL_AMB = 95;
export const VEL_EV = 70;
export const CONSUMO_BATERIA = 1.3;     // % de bateria por segundo de jogo

// Modelo simples de carro elétrico (valores típicos de um compacto atual)
export const BATERIA_KWH = 55;          // capacidade útil
export const CARGA_ATE = 80;            // carrega até 80 %
export const MAX_AC = 11;               // kW máximos em corrente alternada (carregador de bordo)
export const MAX_DC = 100;              // kW máximos em corrente contínua (carga rápida)
export const MIN_POR_SEGUNDO = 0.55;    // 1 s de jogo ≈ 0,55 min de viagem real (só para os cálculos do DSS)

export const FONTE = 'Trebuchet MS, Verdana, Arial, sans-serif';
export const COR = {
    papel: 0xf1e8d2, papelEscuro: 0xe2d5b5, tinta: 0x2b2d42, terracota: 0xc8553d, terracotaEsc: 0xa84330,
    verde: 0x2f9e6b, amarelo: 0xe9b949, vermelho: 0xd0453a, azul: 0x2a6f97, cinza: 0x8d8f99, branco: 0xfffdf6,
    tintaTxt: '#2b2d42', terracotaTxt: '#b6472f', verdeTxt: '#23805a', cinzaTxt: '#6d6f7a', brancoTxt: '#fffdf6'
};

export const eixoDe = (dir) => (dir === 'E' || dir === 'W') ? 'H' : 'V';
export const outroEixo = (e) => (e === 'H' ? 'V' : 'H');
export const VETOR = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
