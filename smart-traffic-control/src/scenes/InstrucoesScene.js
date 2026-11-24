import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao, titulo } from '../classes/UI.js';

export default class InstrucoesScene extends Phaser.Scene {
    constructor() { super('InstrucoesScene'); }

    create() {
        this.add.image(0, 0, 'mapa').setOrigin(0).setScale(0.5);
        this.add.image(600, 0, 'mapa').setOrigin(0).setScale(0.5).setCrop(0, 0, 400, 960);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x1d1f2e, 0.7);
        cartao(this, 60, 30, 680, 420);
        this.add.text(LARGURA / 2, 56, 'COMO JOGAR', { fontFamily: 'Georgia, serif', fontSize: '28px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);

        const bloco = (y, icone, titulo_, texto) => {
            this.add.text(100, y, titulo_, { fontFamily: FONTE, fontSize: '16px', color: COR.terracotaTxt, fontStyle: 'bold' });
            this.add.text(100, y + 22, texto, { fontFamily: FONTE, fontSize: '14px', color: COR.tintaTxt, wordWrap: { width: 600 }, lineSpacing: 3 });
        };
        bloco(86, null, '1 · Toca num cruzamento', 'O círculo no centro mostra para onde está o verde (↔ ou ↕). Toca para dar o verde ao outro sentido.\nAs barras nas passadeiras mostram quem pode passar: verde avança, vermelho espera.');
        bloco(166, null, '2 · O Assistente sugere, tu decides', 'No painel à direita, o Assistente indica qual o cruzamento a mudar e porquê. ACEITAR aplica a sugestão;\nIGNORAR esconde-a durante uns segundos. O cruzamento sugerido pisca a amarelo.');
        bloco(246, null, '3 · Ambulâncias', 'Leva-as ao Hospital de Santa Luzia (canto superior direito). A linha vermelha mostra o caminho.\nQuanto mais depressa chegarem, mais pontos ganhas. Se demorarem demasiado, perdes uma vida.');
        bloco(326, null, '4 · Carros elétricos', 'Escolhe o posto (cartões A–D): o Assistente compara tempo total (viagem + espera + carga) e custo\ncom preços e potências aproximadas de postos reais de Viana. Se a bateria chegar a 0%, perdes uma vida.');
        this.add.text(100, 402, 'Trânsito parado enche a barra de congestionamento: se encher, perdes uma vida. Tens 3 vidas e 3 níveis.', { fontFamily: FONTE, fontSize: '13px', color: COR.cinzaTxt });

        criarBotao(this, LARGURA / 2 - 110, 474 - 30, 190, 38, 'VOLTAR', () => this.scene.start('MenuScene'), { cor: COR.papelEscuro, corHover: 0xd2c49f, txt: COR.tintaTxt, fonte: '16px' });
        criarBotao(this, LARGURA / 2 + 110, 474 - 30, 190, 38, 'JOGAR', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0, vidas: 3 }), { cor: COR.verde, corHover: 0x25805a, fonte: '16px' });
    }
}
