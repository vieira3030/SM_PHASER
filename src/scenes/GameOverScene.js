import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao } from '../classes/UI.js';
import Som from '../classes/Som.js';

// Resultados finais (vitória ou derrota), com recorde guardado em localStorage.
export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    init(d) { this.d = d || {}; }

    create() {
        const d = this.d, e = d.estat || {};
        Som.pararTudo();
        let recorde = 0;
        try { recorde = Number(localStorage.getItem('stc_recorde') || 0); } catch (err) { /* ignora */ }
        const novo = d.pontos > recorde;
        if (novo) { try { localStorage.setItem('stc_recorde', String(d.pontos)); } catch (err) { /* ignora */ } recorde = d.pontos; }
        Som.tocar(d.vitoria ? 'nivel' : 'erro');

        this.add.image(LARGURA / 2, ALTURA / 2, 'mapa2').setScale(LARGURA / 1200);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x12151b, 0.72);
        cartao(this, 170, 28, 460, 424);
        this.add.text(LARGURA / 2, 70, d.vitoria ? 'Cidade em ordem!' : 'Fim de turno', { fontFamily: 'Georgia, serif', fontSize: '34px', color: d.vitoria ? COR.verdeTxt : COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 118, `${d.pontos}`, { fontFamily: 'Georgia, serif', fontSize: '54px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 152, novo ? 'novo recorde!' : `recorde: ${recorde}`, { fontFamily: FONTE, fontSize: '14px', color: novo ? COR.terracotaTxt : COR.cinzaTxt, fontStyle: 'bold' }).setOrigin(0.5);

        const resolvidas = (e.aceites || 0) + (e.ignoradas || 0);
        const concordancia = resolvidas ? Math.round(100 * (e.aceites || 0) / resolvidas) : 0;
        const linhas = [
            ['Nível alcançado', `${d.nivel} de 3`],
            ['Ambulâncias entregues', `${e.ambEntregues || 0}`],
            ['Carros elétricos carregados', `${e.evCarregados || 0}`],
            ['Sugestões do Assistente seguidas', `${e.aceites || 0} de ${resolvidas}  (${concordancia}%)`],
            ['Qualidade média da escolha de postos', `${e.escolhas ? Math.round(e.somaEficiencia / e.escolhas) : 0}%`]
        ];
        linhas.forEach(([a, b], i) => {
            const y = 190 + i * 36;
            this.add.text(200, y, a, { fontFamily: FONTE, fontSize: '15px', color: COR.cinzaTxt });
            this.add.text(600, y, b, { fontFamily: FONTE, fontSize: '16px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(1, 0);
            this.add.rectangle(LARGURA / 2, y + 27, 400, 1, 0x4a5260).setOrigin(0.5);
        });
        criarBotao(this, LARGURA / 2 - 100, 408, 190, 44, 'JOGAR OUTRA VEZ', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0 }), { cor: COR.verde, corHover: 0x2d8a5e, fonte: '16px' });
        criarBotao(this, LARGURA / 2 + 100, 408, 190, 44, 'MENU', () => this.scene.start('MenuScene'), { cor: COR.papelEscuro, corHover: 0x4a5260, txt: COR.tintaTxt, fonte: '16px' });
    }
}
