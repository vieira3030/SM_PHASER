// Configuração dos níveis: objetivos, ritmo do tráfego e tipos de veículos especiais.
const NIVEIS = [
    {
        titulo: 'Nível 1 – Emergência',
        descricao: 'Leva 3 ambulâncias ao hospital antes de o tempo acabar. Clica nos semáforos para lhes abrir caminho.',
        objetivos: { amb: 3, ev: 0 },
        carros: [2.2, 3.4], amb: [3, 5], ev: [999, 999]
    },
    {
        titulo: 'Nível 2 – Carregamento',
        descricao: 'Carros elétricos com bateria baixa: escolhe o posto com melhor tempo e custo e leva-os até lá a tempo.',
        objetivos: { amb: 0, ev: 3 },
        carros: [2.0, 3.2], amb: [999, 999], ev: [3, 5]
    },
    {
        titulo: 'Nível 3 – Hora de ponta',
        descricao: 'Ambulâncias e carros elétricos, um de cada vez. Mais trânsito e menos tempo.',
        objetivos: { amb: 2, ev: 2 },
        carros: [1.8, 2.8], amb: [4, 7], ev: [4, 7]
    }
];

export default class GestorNiveis {
    static total() { return NIVEIS.length; }
    static obter(n) { return NIVEIS[Math.min(n, NIVEIS.length) - 1]; }
}
