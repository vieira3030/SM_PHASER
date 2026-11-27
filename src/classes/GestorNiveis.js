// Configuração dos níveis: a grelha da cidade cresce (2x2 -> 3x2 -> 3x3) e há mais missões e mais trânsito.
// A geometria dos mapas (avenidas, hospital e postos) está em assets/data/niveis.json.
// Campos de cada nível:
//   titulo, descricao  -> texto do cartão de introdução
//   objetivos          -> quantas ambulâncias (amb) e elétricos (ev) é preciso entregar
//   simultaneas        -> quantas missões (ambulâncias/elétricos) podem estar ativas ao mesmo tempo
//   bonus              -> segundos máximos ganhos por entrega (descem se a missão demorar)
//   carros             -> intervalo (s) entre carros normais: [mín, máx] sorteado (menor = mais trânsito)
//   missao             -> intervalo (s) entre novas missões: [mín, máx] sorteado
const NIVEIS = [
    {
        titulo: 'Nível 1 – Centro',
        descricao: 'Cidade pequena (4 cruzamentos). Leva 3 ambulâncias ao hospital e 2 carros elétricos a um posto.\nEntregas rápidas dão até +10 s.',
        objetivos: { amb: 3, ev: 2 }, simultaneas: 1, bonus: 10,
        carros: [2.4, 3.6], missao: [2, 4]
    },
    {
        titulo: 'Nível 2 – Avenidas',
        descricao: 'A cidade cresce (6 cruzamentos) e passa a haver 2 missões ao mesmo tempo.',
        objetivos: { amb: 4, ev: 3 }, simultaneas: 2, bonus: 9,
        carros: [1.8, 2.8], missao: [3, 5]
    },
    {
        titulo: 'Nível 3 – Hora de ponta',
        descricao: '9 cruzamentos, mais trânsito e até 3 missões ao mesmo tempo.',
        objetivos: { amb: 5, ev: 4 }, simultaneas: 3, bonus: 8,
        carros: [1.3, 2.1], missao: [3, 5]
    }
];

export const TEMPO_INICIAL = 40;   // segundos no início do jogo
// Tempo ganho por entrega: o bónus máximo do nível (10/9/8 s) menos 1 s por cada 6 s que a missão
// demorou, com um mínimo de BONUS_MIN. Quem é rápido ganha mais tempo; os níveis finais dão menos.
export const BONUS_MIN = 3;
// Segundos ganhos numa entrega que demorou 'segundos' (ver comentário acima).
export function bonusEntrega(cfg, segundos) {
    return Math.max(BONUS_MIN, cfg.bonus - Math.floor(segundos / 6));
}
export const BONUS_NIVEL = 10;     // segundos ganhos ao passar de nível

// Acesso aos níveis: total() = número de níveis; obter(n) = configuração do nível n (1, 2 ou 3).
// Para mudar objetivos, trânsito ou bónus de um nível, alterar o array NIVEIS acima.
export default class GestorNiveis {
    // número de níveis
    static total() { return NIVEIS.length; }
    // configuração do nível n (1 = primeiro)
    static obter(n) { return NIVEIS[Math.min(n, NIVEIS.length) - 1]; }
}
