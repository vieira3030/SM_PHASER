import { BATERIA_KWH, CARGA_ATE, MAX_AC, MAX_DC } from './Constantes.js';

// Postos de carregamento de Viana do Castelo (locais reais). Potências e preços são APROXIMADOS,
// baseados em valores típicos atuais da rede pública portuguesa (carregamento sem contrato, "ad hoc"),
// e servem apenas para o jogo. Não consultam nenhuma API.
// 'no' = ponto do mapa do jogo onde o posto aparece.
export const POSTOS = [
    { id: 'A', nome: 'ESE-IPVC', detalhe: 'Escola Superior de Educação', kW: 22, tipo: 'AC', preco: 0.30, no: 'N0' },
    { id: 'B', nome: 'Continente', detalhe: 'Continente Viana do Castelo', kW: 50, tipo: 'DC', preco: 0.32, no: 'S0' },
    { id: 'C', nome: 'Leroy Merlin', detalhe: 'Powerdot, Viana do Castelo', kW: 100, tipo: 'DC', preco: 0.49, no: 'S2' },
    { id: 'D', nome: 'A28 · Km 372', detalhe: 'Área de serviço Moeve', kW: 300, tipo: 'DC', preco: 0.55, no: 'E1' }
];

// Estimativa de uma sessão de carga: energia a repor, potência efetiva do carro, duração e custo.
export function estimarCarga(posto, bateriaPct) {
    const kwh = Math.max(8, (CARGA_ATE - bateriaPct) / 100 * BATERIA_KWH);
    const kwEf = posto.tipo === 'AC' ? Math.min(posto.kW, MAX_AC) : Math.min(posto.kW, MAX_DC) * 0.8; // 0.8 ≈ perda por curva de carga
    return { kwh, kwEf, minCarga: kwh / kwEf * 60, custo: kwh * posto.preco };
}

// ocupação aleatória (aleatoriedade controlada): fração de 0 a 0.7 -> espera estimada em minutos
export function sortearOcupacao(postos) {
    postos.forEach(p => { p.ocupacao = Math.round(Phaser.Math.FloatBetween(0, 0.7) * 100) / 100; p.espera = Math.round(p.ocupacao * 12); });
}

export const euros = (v) => v.toFixed(2).replace('.', ',') + ' €';
