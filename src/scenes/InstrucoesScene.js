import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao, camaraHD } from '../classes/UI.js';

export default class InstrucoesScene extends Phaser.Scene {
    constructor() { super('InstrucoesScene'); }

    create() {
        camaraHD(this);
        this.add.image(LARGURA / 2, ALTURA / 2, 'mapa2').setScale(LARGURA / 1200);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x12151b, 0.7);
        cartao(this, 80, 16, 640, 448);
        this.add.text(LARGURA / 2, 44, 'COMO JOGAR', { fontFamily: 'Georgia, serif', fontSize: '26px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);

        const itens = [
            ['1', 'Clica nos semáforos', 'Cada cruzamento tem 4 semáforos, um por via. Cada clique troca só esse (verde/vermelho).'],
            ['2', 'Ambulâncias → Hospital', 'Abre caminho à ambulância (linha vermelha) até ela entrar no hospital.'],
            ['3', 'Elétricos → Posto', 'Escolhe o posto no painel (★ = melhor em tempo e custo) e confirma.'],
            ['4', 'Corre contra o relógio', 'Começas com 40 s. Cada entrega dá até +10 s, mais se fores rápido. Com 0 s, o jogo acaba.']
        ];
        itens.forEach(([n, t, d], i) => {
            const y = 76 + i * 60;
            this.add.circle(118, y + 13, 13, COR.terracota);
            this.add.text(118, y + 13, n, { fontFamily: FONTE, fontSize: '15px', color: '#fffdf6', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(144, y, t, { fontFamily: FONTE, fontSize: '15px', color: COR.terracotaTxt, fontStyle: 'bold' });
            this.add.text(144, y + 20, d, { fontFamily: FONTE, fontSize: '13px', color: COR.tintaTxt, wordWrap: { width: 550 } });
        });

        // bloco dos comandos de teclado: teclas como "chips", centradas numa linha
        this.add.rectangle(LARGURA / 2, 330, 580, 1, 0x3a414d);
        this.add.text(LARGURA / 2, 344, 'TECLADO', { fontFamily: FONTE, fontSize: '11px', color: COR.cinzaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        const teclas = [['A', 'aceitar'], ['I', 'ignorar'], ['1-4', 'postos'], ['Espaço', 'confirmar'], ['P', 'pausa']];
        const partes = teclas.map(([k, a]) => {
            const tk = this.add.text(0, 372, k, { fontFamily: FONTE, fontSize: '13px', color: '#12151b', fontStyle: 'bold', backgroundColor: '#f0b04a', padding: { x: 6, y: 2 } }).setOrigin(0, 0.5);
            const ta = this.add.text(0, 372, a, { fontFamily: FONTE, fontSize: '13px', color: COR.tintaTxt }).setOrigin(0, 0.5);
            return [tk, ta];
        });
        const larg = partes.reduce((s, [tk, ta]) => s + tk.width + 6 + ta.width + 18, -18);
        let x = LARGURA / 2 - larg / 2;
        partes.forEach(([tk, ta]) => { tk.setX(x); x += tk.width + 6; ta.setX(x); x += ta.width + 18; });
        this.add.text(LARGURA / 2, 398, '3 níveis: a cidade cresce (2x2, 3x2, 3x3) e há mais missões. O Assistente sugere, tu decides.', { fontFamily: FONTE, fontSize: '12px', color: COR.cinzaTxt }).setOrigin(0.5);

        criarBotao(this, LARGURA / 2 - 105, 434, 190, 34, 'VOLTAR', () => this.scene.start('MenuScene'), { cor: COR.papelEscuro, corHover: 0x4a5260, fonte: '15px' });
        criarBotao(this, LARGURA / 2 + 105, 434, 190, 34, 'JOGAR', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0 }), { cor: COR.verde, corHover: 0x2d8a5e, fonte: '15px' });
    }
}
