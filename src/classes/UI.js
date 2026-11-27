// Componentes de interface reutilizáveis (botões, títulos) – funcionam com rato e toque.
import Som from './Som.js';
import { FONTE, COR, LARGURA, ALTURA, ESCALA } from './Constantes.js';

// Botão arredondado com texto. (x, y) = centro; w, h = tamanho; acao = função chamada ao clicar.
// opcoes: cor, corHover, txt (cor do texto), fonte (tamanho). Devolve um container com setTexto(novoTexto).
export function criarBotao(scene, x, y, w, h, texto, aoClicar, opcoes = {}) {
    const cor = opcoes.cor ?? COR.terracota, corHover = opcoes.corHover ?? COR.terracotaEsc, txt = opcoes.txt ?? '#fffdf6';
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const pintar = (fill) => {
        g.clear();
        g.fillStyle(0x000000, 0.28).fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 8);
        g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        g.lineStyle(2, 0xfffdf6, 0.35).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    };
    pintar(cor);
    const t = scene.add.text(0, 0, texto, {
        fontFamily: FONTE, fontSize: opcoes.fonte ?? '19px', color: txt, fontStyle: 'bold', align: 'center', wordWrap: { width: w - 8 }
    }).setOrigin(0.5);
    c.add([g, t]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => pintar(corHover));
    c.on('pointerout', () => pintar(cor));
    c.on('pointerdown', () => { Som.tocar('botao'); aoClicar(); });
    c.setTexto = (s) => t.setText(s);
    return c;
}

// cartão de papel (fundo creme com sombra) desenhado com Graphics
export function cartao(scene, x, y, w, h, opcoes = {}) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 3, y + 4, w, h, 10);
    g.fillStyle(opcoes.cor ?? COR.papel, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(2, opcoes.borda ?? COR.papelEscuro, 1).strokeRoundedRect(x, y, w, h, 10);
    return g;
}


// câmara com zoom ESCALA centrada no ecrã de jogo (800x480): ver main.js
export function camaraHD(scene) {
    scene.cameras.main.setZoom(ESCALA).centerOn(LARGURA / 2, ALTURA / 2);
}
