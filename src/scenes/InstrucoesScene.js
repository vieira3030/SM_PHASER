import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao } from '../classes/UI.js';

export default class InstrucoesScene extends Phaser.Scene {
    constructor() { super('InstrucoesScene'); }

    create() {
        this.add.image(LARGURA / 2, ALTURA / 2, 'mapa2').setScale(LARGURA / 1200);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x12151b, 0.7);
        cartao(this, 90, 24, 620, 432);
        this.add.text(LARGURA / 2, 54, 'COMO JOGAR', { fontFamily: 'Georgia, serif', fontSize: '26px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);

        const itens = [
            ['1', 'Clica nos semáforos', 'Cada cruzamento tem 4 semáforos, um por via. Os que estão de frente mudam juntos. Clicar troca o verde.'],
            ['2', 'Ambulâncias → Hospital', 'Abre caminho à ambulância (linha vermelha) até entrar no hospital.'],
            ['3', 'Elétricos → Posto', 'Escolhe o posto no painel (★ = melhor em tempo e custo) e confirma. Linha azul até à baía.'],
            ['4', 'Corre contra o relógio', 'Começas com 40 s. Cada entrega dá +10 s. Se o tempo acabar, o jogo termina.']
        ];
        let y = 92;
        itens.forEach(([n, t, d]) => {
            this.add.circle(124, y + 14, 14, COR.terracota);
            this.add.text(124, y + 14, n, { fontFamily: FONTE, fontSize: '16px', color: '#fffdf6', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(152, y, t, { fontFamily: FONTE, fontSize: '16px', color: COR.terracotaTxt, fontStyle: 'bold' });
            this.add.text(152, y + 22, d, { fontFamily: FONTE, fontSize: '14px', color: COR.tintaTxt, wordWrap: { width: 530 } });
            y += 76;
        });
        this.add.text(LARGURA / 2, 396, '3 níveis: a cidade cresce (2x2, 3x2, 3x3) e há mais missões. O Assistente sugere, tu decides.', { fontFamily: FONTE, fontSize: '12px', color: COR.cinzaTxt }).setOrigin(0.5);

        criarBotao(this, LARGURA / 2 - 105, 428, 190, 34, 'VOLTAR', () => this.scene.start('MenuScene'), { cor: COR.papelEscuro, corHover: 0x4a5260, fonte: '15px' });
        criarBotao(this, LARGURA / 2 + 105, 428, 190, 34, 'JOGAR', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0 }), { cor: COR.verde, corHover: 0x2d8a5e, fonte: '15px' });
    }
}
