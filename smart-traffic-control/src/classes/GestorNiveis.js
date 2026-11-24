// Configuração dos níveis: objetivos, ritmo do tráfego e tipos de veículos especiais.
const NIVEIS = [
    {
        titulo: 'Nível 1 – Emergência',
        descricao: 'Leva 4 ambulâncias ao hospital sem as deixares presas nos semáforos.',
        objetivos: { amb: 4, ev: 0 },
        carros: [1.8, 3.0], amb: [10, 15], ev: [999, 999]
    },
    {
        titulo: 'Nível 2 – Carregamento',
        descricao: 'Carros elétricos com bateria baixa: escolhe o melhor posto (tempo, preço, potência).',
        objetivos: { amb: 0, ev: 4 },
        carros: [1.5, 2.6], amb: [999, 999], ev: [8, 12]
    },
    {
        titulo: 'Nível 3 – Hora de ponta',
        descricao: 'Mais trânsito, ambulâncias e carros elétricos ao mesmo tempo.',
        objetivos: { amb: 3, ev: 3 },
        carros: [1.1, 1.9], amb: [11, 15], ev: [9, 13]
    }
];

export default class GestorNiveis {
    static total() { return NIVEIS.length; }
    static obter(n) { return NIVEIS[Math.min(n, NIVEIS.length) - 1]; }
}
