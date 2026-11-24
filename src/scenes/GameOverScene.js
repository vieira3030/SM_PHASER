import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao, camaraHD } from '../classes/UI.js';
import Ranking from '../classes/Ranking.js';
import Som from '../classes/Som.js';

// Resultados finais (vitória ou derrota): estatísticas do jogo e top 5 de pontuações com nome.
export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    init(d) { this.d = d || {}; }

    create() {
        camaraHD(this);
        const d = this.d, e = d.estat || {};
        Som.pararTudo();
        Som.tocar(d.vitoria ? 'nivel' : 'erro');

        this.add.image(LARGURA / 2, ALTURA / 2, 'mapa2').setScale(LARGURA / 1200);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x12151b, 0.72);
        cartao(this, 50, 22, 700, 436);
        this.add.rectangle(400, 220, 1, 330, 0x3a414d);

        // coluna da esquerda: resultado e estatísticas
        const cx = 225;
        this.add.text(cx, 58, d.vitoria ? 'Cidade em ordem!' : 'Fim de turno', { fontFamily: 'Georgia, serif', fontSize: '28px', color: d.vitoria ? COR.verdeTxt : COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(cx, 104, `${d.pontos}`, { fontFamily: 'Georgia, serif', fontSize: '46px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(cx, 136, 'pontos', { fontFamily: FONTE, fontSize: '13px', color: COR.cinzaTxt }).setOrigin(0.5);
        const resolvidas = (e.aceites || 0) + (e.ignoradas || 0);
        const linhas = [
            ['Nível alcançado', `${d.nivel} de 3`],
            ['Ambulâncias entregues', `${e.ambEntregues || 0}`],
            ['Elétricos carregados', `${e.evCarregados || 0}`],
            ['Sugestões seguidas', `${e.aceites || 0} de ${resolvidas}`],
            ['Qualidade da escolha de postos', `${e.escolhas ? Math.round(e.somaEficiencia / e.escolhas) : 0}%`]
        ];
        linhas.forEach(([a, b], i) => {
            const y = 162 + i * 38;
            this.add.text(78, y, a, { fontFamily: FONTE, fontSize: '13px', color: COR.cinzaTxt });
            this.add.text(372, y, b, { fontFamily: FONTE, fontSize: '14px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(1, 0);
            this.add.rectangle(225, y + 26, 294, 1, 0x3a414d);
        });

        // coluna da direita: top 5
        this.add.text(575, 58, 'TOP 5', { fontFamily: 'Georgia, serif', fontSize: '24px', color: COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.linhasTop = [0, 1, 2, 3, 4].map(i => this.add.text(428, 88 + i * 30, '', { fontFamily: FONTE, fontSize: '14px', color: COR.tintaTxt }));
        this.mostrarTop(-1);
        if (Ranking.entra(d.pontos)) this.pedirNome();

        criarBotao(this, LARGURA / 2 - 105, 418, 190, 40, 'JOGAR OUTRA VEZ', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0 }), { cor: COR.verde, corHover: 0x2d8a5e, fonte: '15px' });
        criarBotao(this, LARGURA / 2 + 105, 418, 190, 40, 'MENU', () => this.scene.start('MenuScene'), { cor: COR.papelEscuro, corHover: 0x4a5260, fonte: '15px' });
    }

    mostrarTop(destaque) {
        const l = Ranking.lista();
        this.linhasTop.forEach((t, i) => {
            const r = l[i];
            t.setText(r ? `${i + 1}.  ${r.nome}  ·  ${r.pontos}  (nível ${r.nivel})` : `${i + 1}.  —`)
                .setColor(i === destaque ? COR.terracotaTxt : COR.tintaTxt).setFontStyle(i === destaque ? 'bold' : 'normal');
        });
    }

    // caixa de texto (elemento HTML) para escrever o nome; funciona também com o teclado do telemóvel
    pedirNome() {
        const titulo = this.add.text(575, 250, 'Entraste no top 5! O teu nome:', { fontFamily: FONTE, fontSize: '13px', color: COR.verdeTxt, fontStyle: 'bold' }).setOrigin(0.5);
        const caixa = this.add.dom(530, 290, 'input', 'width:170px;height:26px;font:15px Trebuchet MS, Arial, sans-serif;padding:2px 6px;border-radius:6px;border:2px solid #e9b949;background:#12151b;color:#e8e6df;outline:none;');
        const no = caixa.node;
        no.maxLength = 12; no.value = ''; no.placeholder = 'Jogador';
        setTimeout(() => no.focus(), 100);
        let feito = false;
        // se sair sem guardar, a pontuação fica guardada com o nome "Jogador"
        this.events.once('shutdown', () => { if (!feito) { feito = true; Ranking.guardar(no.value, this.d.pontos, this.d.nivel); } });
        const guardar = () => {
            if (feito) return; feito = true;
            const pos = Ranking.guardar(no.value, this.d.pontos, this.d.nivel);
            caixa.destroy(); btn.destroy(); titulo.setText('Pontuação guardada!');
            Som.tocar('aceitar');
            this.mostrarTop(pos);
        };
        no.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') guardar(); });
        const btn = criarBotao(this, 680, 290, 80, 30, 'GUARDAR', guardar, { cor: COR.terracota, corHover: COR.terracotaEsc, fonte: '12px' });
    }
}
