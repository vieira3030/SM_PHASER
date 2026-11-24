import {
    LARGURA, ALTURA, MAPA_L, COLUNAS, LINHAS, FAIXA, DIST_PARAGEM, COR, FONTE, eixoDe, outroEixo, CONSUMO_BATERIA, VETOR
} from '../classes/Constantes.js';
import Grafo from '../classes/Grafo.js';
import Semaforo from '../classes/Semaforo.js';
import Veiculo from '../classes/Veiculo.js';
import MotorDSS from '../classes/MotorDSS.js';
import GestorNiveis from '../classes/GestorNiveis.js';
import { POSTOS, sortearOcupacao, euros } from '../classes/Dados.js';
import Som from '../classes/Som.js';
import { criarBotao, cartao } from '../classes/UI.js';

const OPOSTO = { W0: 'E0', E0: 'W0', W1: 'E1', E1: 'W1', N0: 'S0', S0: 'N0', N1: 'S1', S1: 'N1', N2: 'S2', S2: 'N2' };
const HOSPITAL = 'E0';
const PIN = { A: [205, 66], B: [215, 438], C: [560, 450], D: [566, 392] };   // posição (ponta do pin) de cada posto no mapa
const TX = '#2b2d42';

export default class JogoScene extends Phaser.Scene {
    constructor() { super('JogoScene'); }

    init(d) {
        this.nivel = (d && d.nivel) || 1;
        this.pontos = (d && d.pontos) || 0;
        this.vidas = d && d.vidas !== undefined ? d.vidas : 3;
        this.estat = (d && d.estat) || { aceites: 0, ignoradas: 0, ambEntregues: 0, evCarregados: 0, escolhas: 0, somaEficiencia: 0 };
    }

    create() {
        this.cfg = GestorNiveis.obter(this.nivel);
        this.grafo = new Grafo();
        this.lista = [];
        this.feitos = { amb: 0, ev: 0 };
        this.pausado = true;
        this.congestao = 0;
        this.ignorados = {};
        this.rec = null;
        this.tAvaliar = 0; this.tCongest = 0;
        this.tCarro = 1; this.tAmb = Phaser.Math.Between(4, 7); this.tEV = Phaser.Math.Between(3, 5);
        this.postos = POSTOS.map(p => ({ ...p }));
        sortearOcupacao(this.postos);
        this.events.once('shutdown', () => Som.pararTudo());

        this.sensores = this.add.group();
        this.zonasParagem = this.add.group();
        this.veiculos = this.add.group();

        this.add.image(0, 0, 'mapa').setOrigin(0).setScale(0.5).setDepth(0);
        this.criarMarcadores();
        this.criarSemaforos();
        this.rotaGfx = this.add.graphics().setDepth(2);
        this.haloGfx = this.add.graphics().setDepth(2.5);
        this.criarHUD();

        // Colisões (Arcade Physics): zonas de paragem dos semáforos e sensores de travagem
        this.physics.add.overlap(this.veiculos, this.zonasParagem, (v, z) => {
            if (v.dir === z.dirAprox && !z.sem.verde(eixoDe(z.dirAprox))) v.parar = true;
        });
        this.physics.add.overlap(this.sensores, this.veiculos, (sensor, v) => {
            const o = sensor.owner;
            if (o && v !== o && v.dir === o.dir) o.bloqueado = true;
        });

        this.mostrarIntro();
    }

    // ------------------------------------------------------------ marcadores no mapa
    criarMarcadores() {
        const h = this.add.image(560, 99, 'pin_hospital').setOrigin(0.5, 1).setScale(0.5).setDepth(5);
        this.add.text(560, 99 - 23, '+', { fontFamily: FONTE, fontSize: '19px', color: '#fffdf6', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
        this.pins = this.postos.map(p => {
            const [x, y] = PIN[p.id];
            const img = this.add.image(x, y, 'pin_posto').setOrigin(0.5, 1).setScale(0.5).setDepth(5);
            const letra = this.add.text(x, y - 23, p.id, { fontFamily: FONTE, fontSize: '15px', color: '#fffdf6', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
            img.destacado = false; img.letra = letra; img.x0 = x; img.y0 = y; img.posto = p;
            return img;
        });
        if (this.cfg.objetivos.ev === 0) this.pins.forEach(p => { p.setAlpha(0.55); p.letra.setAlpha(0.55); });
    }

    criarSemaforos() {
        this.semaforos = [];
        this.semPorNo = {};
        LINHAS.forEach((y, r) => COLUNAS.forEach((x, c) => {
            const s = new Semaforo(this, `S${r * COLUNAS.length + c + 1}`, x, y);
            s.no = `I${r}${c}`;
            s.zona.on('pointerdown', () => this.cliqueSemaforo(s));
            this.semaforos.push(s);
            this.semPorNo[s.no] = s;
            // zonas de paragem (corpos estáticos) antes de cada aproximação ao cruzamento
            const D = DIST_PARAGEM;
            const pos = { E: [x - D, y + FAIXA], W: [x + D, y - FAIXA], S: [x - FAIXA, y - D], N: [x + FAIXA, y + D] };
            Object.entries(pos).forEach(([dir, [zx, zy]]) => {
                const z = this.add.zone(zx, zy, 6, 6);
                this.physics.add.existing(z, true);
                z.dirAprox = dir; z.sem = s;
                this.zonasParagem.add(z);
            });
        }));
    }

    cliqueSemaforo(s) {
        if (this.pausado) return;
        const antes = s.eixo;
        if (this.rec && this.rec.sem === s && outroEixo(antes) === this.rec.eixo && s.fase === 'VERDE') {
            this.estat.aceites++; this.pontos += 5; this.rec = null; s.destacar(false);
        }
        s.alternar();
        Som.tocar('semaforo');
    }

    // ------------------------------------------------------------ painel lateral
    criarHUD() {
        const X = MAPA_L;
        this.add.rectangle(X + 100, ALTURA / 2, 200, ALTURA, COR.papel).setDepth(10);
        this.add.rectangle(X + 1.5, ALTURA / 2, 3, ALTURA, 0x2b2d42).setDepth(11);
        const txt = (x, y, s, tam, cor, bold = false, w = 180) => this.add.text(x, y, s, {
            fontFamily: FONTE, fontSize: tam + 'px', color: cor, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: w }
        }).setDepth(12);

        this.hudNivel = txt(X + 12, 8, '', 12, COR.terracotaTxt, true);
        this.hudPontos = this.add.text(X + 12, 22, '', { fontFamily: 'Georgia, serif', fontSize: '28px', color: TX, fontStyle: 'bold' }).setDepth(12);
        this.hudPts = txt(X + 12, 56, 'pontos', 10, COR.cinzaTxt);
        this.coracoes = [0, 1, 2].map(i => this.add.image(X + 140 + i * 20, 40, 'ic_coracao').setScale(0.4).setDepth(12));

        this.barrasObj = [];
        this.objLinhas = [];
        const o = this.cfg.objetivos;
        let y = 76;
        [['amb', 'Ambulâncias entregues'], ['ev', 'Elétricos carregados']].forEach(([k, nome]) => {
            if (!o[k]) return;
            const t = txt(X + 12, y, '', 12, TX, true);
            this.add.rectangle(X + 12, y + 22, 176, 7, 0xd9ceb0).setOrigin(0, 0.5).setDepth(12);
            const b = this.add.rectangle(X + 12, y + 22, 0, 7, COR.verde).setOrigin(0, 0.5).setDepth(13);
            this.objLinhas.push({ k, nome, t, b });
            y += 34;
        });

        txt(X + 12, 146, 'ASSISTENTE DE TRÁFEGO', 10, COR.cinzaTxt, true);
        cartao(this, X + 8, 160, 184, 96, { cor: COR.branco }).setDepth(11);
        this.dssFaixa = this.add.rectangle(X + 12, 208, 4, 84, COR.cinza).setDepth(12);
        this.dssPrio = txt(X + 20, 165, '', 10, COR.terracotaTxt, true, 168);
        this.dssAcao = txt(X + 20, 178, '', 14, TX, true, 168);
        this.dssMotivo = txt(X + 20, 197, '', 11, COR.cinzaTxt, false, 168);
        this.btnAceitar = criarBotao(this, X + 55, 240, 80, 22, 'ACEITAR', () => this.aceitarRec(), { cor: COR.verde, corHover: 0x25805a, fonte: '12px' }).setDepth(14);
        this.btnIgnorar = criarBotao(this, X + 145, 240, 80, 22, 'IGNORAR', () => this.ignorarRec(), { cor: COR.cinza, corHover: 0x6d6f7a, fonte: '12px' }).setDepth(14);
        this.btnAceitar.setVisible(false); this.btnIgnorar.setVisible(false);

        txt(X + 12, 266, 'CONGESTIONAMENTO', 10, COR.cinzaTxt, true);
        this.add.rectangle(X + 12, 289, 176, 10, 0xd9ceb0).setOrigin(0, 0.5).setDepth(12);
        this.barraCong = this.add.rectangle(X + 12, 289, 0, 10, COR.verde).setOrigin(0, 0.5).setDepth(13);

        this.hudPostos = txt(X + 12, 303, '', 11, COR.terracotaTxt, true);
        this.cartoes = this.postos.map((p, i) => {
            const c = this.add.container(X + 100, 336 + i * 36).setDepth(12);
            const fundo = this.add.rectangle(0, 0, 186, 33, COR.branco).setStrokeStyle(2, COR.papelEscuro);
            const faixa = this.add.rectangle(-91, 0, 4, 33, COR.cinza);
            const t1 = this.add.text(-84, -13, '', { fontFamily: FONTE, fontSize: '11px', color: TX, fontStyle: 'bold' });
            const t2 = this.add.text(-84, 0, '', { fontFamily: FONTE, fontSize: '10px', color: '#6d6f7a' });
            const barra = this.add.rectangle(-84, 14, 0, 3, COR.verde).setOrigin(0, 0.5);
            c.add([fundo, faixa, t1, t2, barra]);
            c.setSize(186, 33).setInteractive({ useHandCursor: true });
            c.on('pointerdown', () => this.escolherPosto(p));
            Object.assign(c, { fundo, faixa, t1, t2, barra, posto: p });
            return c;
        });
        this.dicaTxt = this.add.text(MAPA_L / 2, ALTURA - 14, '', {
            fontFamily: FONTE, fontSize: '13px', color: '#fffdf6', fontStyle: 'bold', backgroundColor: '#2b2d42e6', padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(30).setAlpha(0);
        this.toastTxt = this.add.text(MAPA_L / 2, 26, '', {
            fontFamily: 'Georgia, serif', fontSize: '19px', color: '#ffffff', fontStyle: 'bold', stroke: '#2b2d42', strokeThickness: 5
        }).setOrigin(0.5).setDepth(30).setAlpha(0);
        this.atualizarHUD();
    }

    atualizarHUD() {
        const [a, b] = this.cfg.titulo.split(' – ');
        this.hudNivel.setText(`${a.toUpperCase()} · ${b.toUpperCase()}`);
        this.hudPontos.setText(`${this.pontos}`);
        this.hudPts.setX(this.hudPontos.x + this.hudPontos.width + 6).setY(40);
        this.coracoes.forEach((h, i) => h.setAlpha(i < this.vidas ? 1 : 0.18));
        const o = this.cfg.objetivos;
        this.objLinhas.forEach(l => {
            l.t.setText(`${l.nome}: ${this.feitos[l.k]}/${o[l.k]}`);
            l.b.width = 176 * Math.min(1, this.feitos[l.k] / o[l.k]);
        });
        const c = Phaser.Math.Clamp(this.congestao, 0, 100);
        this.barraCong.width = 176 * c / 100;
        this.barraCong.setFillStyle(c < 50 ? COR.verde : c < 80 ? COR.amarelo : COR.vermelho);
    }

    toast(msg, cor = '#ffffff') {
        this.toastTxt.setText(msg).setColor(cor).setAlpha(1);
        this.tweens.killTweensOf(this.toastTxt);
        this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1800, duration: 600 });
    }

    dica(msg) {
        if (this.dicaAtual === msg) return;
        this.dicaAtual = msg;
        this.dicaTxt.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.dicaTxt);
        this.tweens.add({ targets: this.dicaTxt, alpha: 0, delay: 5000, duration: 700, onComplete: () => { this.dicaAtual = null; } });
    }

    // ------------------------------------------------------------ DSS: semáforos
    aceitarRec() {
        const r = this.rec;
        if (!r || this.pausado) return;
        r.sem.pedirVerde(r.eixo);
        r.sem.destacar(false);
        this.estat.aceites++; this.pontos += 5;
        this.rec = null;
        Som.tocar('aceitar');
        this.mostrarRec();
    }

    ignorarRec() {
        const r = this.rec;
        if (!r) return;
        this.ignorados[r.sem.nome] = performance.now() + 9000;
        r.sem.destacar(false);
        this.estat.ignoradas++;
        this.rec = null;
        Som.tocar('ignorar');
        this.mostrarRec();
    }

    avaliarDSS() {
        const nova = MotorDSS.avaliarSemaforos(this.semaforos, this.lista, this.ignorados);
        const mudou = (!nova && this.rec) || (nova && (!this.rec || this.rec.sem !== nova.sem || this.rec.eixo !== nova.eixo));
        if (mudou) {
            this.semaforos.forEach(s => s.destacar(false));
            this.rec = nova;
            if (nova) { nova.sem.destacar(true); if (nova.prioridade === 'ALTA') Som.tocar('alerta_ev', 0.8); }
        } else if (nova && this.rec) { this.rec.motivo = nova.motivo; this.rec.prioridade = nova.prioridade; }
        this.mostrarRec();
    }

    mostrarRec() {
        const r = this.rec;
        this.btnAceitar.setVisible(!!r); this.btnIgnorar.setVisible(!!r);
        if (!r) {
            this.dssPrio.setText('SEM SUGESTÕES').setColor(COR.cinzaTxt);
            this.dssAcao.setText('Trânsito fluido');
            this.dssMotivo.setText('A vigiar os 6 cruzamentos.');
            this.dssFaixa.setFillStyle(COR.verde);
            return;
        }
        const cor = r.prioridade === 'ALTA' ? COR.vermelho : r.prioridade === 'MÉDIA' ? COR.amarelo : COR.verde;
        this.dssFaixa.setFillStyle(cor);
        this.dssPrio.setText(`PRIORIDADE ${r.prioridade}`).setColor(r.prioridade === 'ALTA' ? '#c0392b' : COR.terracotaTxt);
        this.dssAcao.setText(`${r.sem.nome}: verde ${r.eixo === 'H' ? '↔' : '↕'}`);
        this.dssMotivo.setText(r.motivo);
    }

    // ------------------------------------------------------------ rotas e custos
    // custo (s) estimado de percorrer a aresta a->b, tendo em conta filas e semáforos
    custoDinamico = (a, b) => {
        const A = this.grafo.nos[a], B = this.grafo.nos[b];
        const comp = Math.hypot(B.x - A.x, B.y - A.y);
        const dir = this.grafo.direcao(a, b);
        let c = comp / 70;
        for (const v of this.lista) {
            if (v.dir !== dir || v.v > 8) continue;
            if (v.x >= Math.min(A.x, B.x) - 20 && v.x <= Math.max(A.x, B.x) + 20 && v.y >= Math.min(A.y, B.y) - 20 && v.y <= Math.max(A.y, B.y) + 20) c += 1.0;
        }
        const s = this.semPorNo[b];
        if (s && !s.verde(eixoDe(dir))) c += 3;
        return c;
    };
    custoEstatico = (a, b) => {
        const A = this.grafo.nos[a], B = this.grafo.nos[b];
        return Math.hypot(B.x - A.x, B.y - A.y) / 60;
    };

    // ------------------------------------------------------------ geração de veículos
    livre(p) { return !this.lista.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 50); }

    criarVeiculo(tipo, origem, destino, custo) {
        const r = this.grafo.rota(origem, destino, custo);
        if (!r) return null;
        const cam = this.grafo.caminho(r.ids);
        if (!this.livre(cam.pontos[0])) return null;
        const v = new Veiculo(this, tipo, cam);
        v.entrada = origem;
        this.lista.push(v);
        this.veiculos.add(v);
        return v;
    }

    gerarNormal() {
        const bordas = this.grafo.bordas();
        for (let k = 0; k < 4; k++) {
            const o = Phaser.Math.RND.pick(bordas);
            let d = Phaser.Math.RND.frac() < 0.75 ? OPOSTO[o] : Phaser.Math.RND.pick(bordas);
            if (!d || d === o) d = OPOSTO[o] || bordas.find(b => b !== o);
            if (this.criarVeiculo('NORMAL', o, d, this.custoEstatico)) return;
        }
    }

    gerarAmbulancia() {
        const ativas = this.lista.filter(v => v.tipo === 'AMB' && !v.metaFeita).length;
        if (ativas >= 2 || this.feitos.amb + ativas >= this.cfg.objetivos.amb) return;
        const origens = this.grafo.bordas().filter(b => b !== HOSPITAL && !this.postos.some(p => p.no === b));
        for (let k = 0; k < 4; k++) {
            const v = this.criarVeiculo('AMB', Phaser.Math.RND.pick(origens), HOSPITAL, this.custoDinamico);
            if (v) { Som.tocar('alerta_ev'); this.toast('Ambulância a caminho do hospital!', '#ffb3a8'); this.dica('Dá verde à ambulância (linha vermelha) em cada cruzamento.'); return; }
        }
    }

    gerarEV() {
        const ativos = this.lista.filter(v => v.tipo === 'EV' && !v.metaFeita).length;
        if (ativos >= 2 || this.feitos.ev + ativos >= this.cfg.objetivos.ev) return;
        const origens = this.grafo.bordas().filter(b => !this.postos.some(p => p.no === b));
        for (let k = 0; k < 4; k++) {
            const o = Phaser.Math.RND.pick(origens);
            const v = this.criarVeiculo('EV', o, this.postos[0].no, this.custoEstatico);   // rota provisória
            if (!v) continue;
            v.bateria = this.nivel >= 3 ? Phaser.Math.Between(20, 32) : Phaser.Math.Between(25, 40);
            // jogo justo: garante que pelo menos o posto mais próximo é alcançável
            const tMin = Math.min(...this.postos.map(p => { const r = this.grafo.rota(o, p.no, this.custoDinamico); return r ? r.tempo : 999; }));
            v.bateria = Math.min(60, Math.max(v.bateria, Math.ceil(tMin * CONSUMO_BATERIA + 12)));
            v.estado = 'ESCOLHA';
            v.escolhaT = 0;
            v.idx = 2;
            v.definirDirecao();
            const [ux, uy] = VETOR[v.dir];   // espera um pouco dentro do mapa, bem visível
            v.setPosition(v.pontos[1].x + ux * 22, v.pontos[1].y + uy * 22);
            v.setRotation(v.anguloAlvo());
            Som.tocar('alerta_ev');
            this.toast('Carro elétrico precisa de carregar!', '#bfe9ff');
            this.dica('Escolhe um posto no painel (★ = sugestão do Assistente).');
            return;
        }
    }

    // ------------------------------------------------------------ DSS: postos de carregamento
    evEmEscolha() { return this.lista.find(v => v.tipo === 'EV' && v.estado === 'ESCOLHA'); }

    classificar(ev) {
        return MotorDSS.classificarPostos(ev, this.postos, (no) => {
            const r = this.grafo.rota(ev.entrada, no, this.custoDinamico);
            return r ? r.tempo : 999;
        });
    }

    atualizarPostos() {
        const ev = this.evEmEscolha();
        this.pins.forEach(p => { p.destacado = false; });
        if (this.cfg.objetivos.ev === 0) {
            this.hudPostos.setText('Sem carros elétricos neste nível').setColor(COR.cinzaTxt);
            this.cartoes.forEach(c => c.setVisible(false));
            return;
        }
        this.cartoes.forEach(c => c.setVisible(true));
        const f = (n) => Math.round(n);
        if (!ev) {
            this.hudPostos.setText('POSTOS EM VIANA').setColor(COR.cinzaTxt);
            this.cartoes.forEach(c => {
                const p = c.posto;
                c.t1.setText(`${p.id}  ${p.nome} · ${p.kW} kW`);
                c.t2.setText(`${euros(p.preco).replace(' €', '')} €/kWh · ${p.espera ? 'fila ~' + p.espera + ' min' : 'livre'}`);
                c.barra.width = 0; c.setAlpha(0.6); c.fundo.setStrokeStyle(2, COR.papelEscuro); c.faixa.setFillStyle(COR.cinza);
            });
            this.melhorPosto = null;
            return;
        }
        const { lista, critica } = this.classificar(ev);
        this.ultimaClassificacao = lista;
        this.melhorPosto = lista[0];
        this.hudPostos.setText(`BATERIA ${f(ev.bateria)}%${critica ? ' (CRÍTICA)' : ''} · ESCOLHE O POSTO`).setColor(critica ? '#c0392b' : COR.terracotaTxt);
        this.cartoes.forEach(c => {
            const it = lista.find(l => l.posto === c.posto), p = c.posto, top = lista[0] === it;
            c.t1.setText(`${top ? '★ ' : ''}${p.id}  ${p.nome} · ${p.kW} kW`);
            c.t2.setText(it.viavel ? `viagem ${f(it.viagem)} min · carga ${f(it.minCarga)} min · ${euros(it.custo)}` : 'bateria insuficiente para chegar');
            c.barra.width = 174 * Math.min(1, it.score / 100);
            const cor = it.viavel ? (top ? COR.verde : COR.azul) : COR.vermelho;
            c.barra.setFillStyle(cor); c.faixa.setFillStyle(cor);
            c.setAlpha(1);
            c.fundo.setStrokeStyle(2, top ? COR.amarelo : COR.papelEscuro);
        });
        this.pins.forEach(p => { p.destacado = lista[0].posto === p.posto; });
    }

    escolherPosto(posto, auto = false) {
        const ev = this.evEmEscolha();
        if (!ev || this.pausado) return;
        const { lista } = this.classificar(ev);
        const it = lista.find(l => l.posto === posto), melhor = lista[0];
        const r = this.grafo.rota(ev.entrada, posto.no, this.custoDinamico);
        if (!r) return;
        ev.novaRota(this.grafo.caminho(r.ids));
        ev.estado = 'ANDAR';
        ev.postoId = posto.id;
        ev.estimativa = it;
        ev.eficiencia = Math.max(0, Math.min(100, Math.round(100 * it.score / melhor.score)));
        if (!auto) {
            this.estat.escolhas++; this.estat.somaEficiencia += ev.eficiencia;
            if (it === melhor) this.estat.aceites++; else this.estat.ignoradas++;
        }
        Som.tocar('aceitar');
        this.toast(auto ? `Tempo esgotado: posto ${posto.id} escolhido` : `Posto ${posto.id}: ${ev.eficiencia}% da melhor opção`, '#bfe9ff');
        this.atualizarPostos();
    }

    // ------------------------------------------------------------ eventos dos veículos
    aoMeta(v) {
        if (v.tipo === 'AMB') {
            const pts = Math.max(30, Math.round(160 - v.idade * 2));
            this.pontos += pts; this.feitos.amb++; this.estat.ambEntregues++;
            this.toast(`Ambulância no hospital! +${pts}`, '#c8f2d6'); Som.tocar('sucesso');
        } else if (v.tipo === 'EV') {
            const pts = 60 + Math.round(90 * v.eficiencia / 100) + Math.round(v.bateria / 2);
            const e = v.estimativa;
            this.pontos += pts; this.feitos.ev++; this.estat.evCarregados++;
            this.toast(`Posto ${v.postoId}: ${Math.round(e.kwh)} kWh · ${Math.round(e.minCarga)} min · ${euros(e.custo)}  +${pts}`, '#c8f2d6');
            Som.tocar('carregar');
        }
        this.atualizarHUD();
        this.verificarNivel();
    }

    aoSair(v) {
        if (v.tipo === 'NORMAL') this.pontos += 2;
        this.remover(v);
    }

    remover(v) {
        const i = this.lista.indexOf(v);
        if (i >= 0) this.lista.splice(i, 1);
        this.veiculos.remove(v, false, false);
        v.destroy();
    }

    perderVida(motivo) {
        if (this.pausado) return;
        this.vidas--;
        this.cameras.main.shake(250, 0.008);
        this.cameras.main.flash(200, 255, 80, 60);
        Som.tocar('erro');
        this.toast(motivo, '#ffb3a8');
        this.atualizarHUD();
        if (this.vidas <= 0) {
            this.pausado = true;
            this.time.delayedCall(900, () => this.scene.start('GameOverScene', { pontos: this.pontos, nivel: this.nivel, estat: this.estat, vitoria: false }));
        }
    }

    verificarNivel() {
        const o = this.cfg.objetivos;
        if (this.pausado || this.feitos.amb < o.amb || this.feitos.ev < o.ev) return;
        this.pausado = true;
        const bonus = 100 * this.nivel + this.vidas * 25;
        this.pontos += bonus;
        this.atualizarHUD();
        Som.pararTudo();
        Som.tocar('nivel');
        const fim = this.nivel >= GestorNiveis.total();
        this.sobrepor(fim ? 'Cidade em ordem!' : 'Nível concluído!', `Bónus: +${bonus} pontos`);
        this.time.delayedCall(2800, () => {
            if (fim) this.scene.start('GameOverScene', { pontos: this.pontos, nivel: this.nivel, estat: this.estat, vitoria: true });
            else this.scene.restart({ nivel: this.nivel + 1, pontos: this.pontos, vidas: this.vidas, estat: this.estat });
        });
    }

    // ------------------------------------------------------------ cartões de aviso (intro / fim de nível)
    sobrepor(t1, t2) {
        const c = this.add.container(MAPA_L / 2, ALTURA / 2).setDepth(40);
        const fundo = cartao(this, -230, -80, 460, 160);
        c.add([
            fundo,
            this.add.text(0, -48, t1, { fontFamily: 'Georgia, serif', fontSize: '30px', color: COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5),
            this.add.text(0, 0, t2, { fontFamily: FONTE, fontSize: '15px', color: TX, align: 'center', wordWrap: { width: 410 }, lineSpacing: 4 }).setOrigin(0.5, 0)
        ]);
        return c;
    }

    mostrarIntro() {
        const c = this.sobrepor(this.cfg.titulo, this.cfg.descricao + '\n\n(toca para começar)');
        this.atualizarHUD(); this.mostrarRec(); this.atualizarPostos();
        let ja = false;
        const comecar = () => {
            if (ja) return; ja = true;
            c.destroy();
            this.pausado = false;
            Som.ciclo('musica', 0.5, 'm');
            Som.ciclo('ambiente', 0.55, 'm');
            if (this.nivel === 1) this.dica('Toca num cruzamento para trocar o verde. Os círculos mostram o sentido livre.');
        };
        this.input.once('pointerdown', comecar);
        this.time.delayedCall(5000, comecar);
    }

    // ------------------------------------------------------------ desenho das rotas e destaques
    desenharRotas() {
        const g = this.rotaGfx;
        g.clear();
        for (const v of this.lista) {
            if (v.tipo === 'NORMAL') continue;
            let pts, cor;
            if (v.tipo === 'EV' && v.estado === 'ESCOLHA') {
                if (!this.melhorPosto) continue;
                const r = this.grafo.rota(v.entrada, this.melhorPosto.posto.no, this.custoDinamico);
                if (!r) continue;
                pts = this.grafo.caminho(r.ids).pontos.slice(1, -1); cor = 0xe9b949;
            } else {
                if (v.metaFeita) continue;
                pts = [{ x: v.x, y: v.y }, ...v.pontos.slice(v.idx, v.idxMeta + 1)];
                cor = v.tipo === 'AMB' ? 0xd0453a : 0x2a8fbd;
            }
            g.lineStyle(5, 0xffffff, 0.55);
            g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
            g.lineStyle(3, cor, 0.9);
            g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
        }
    }

    // ------------------------------------------------------------ ciclo principal
    update(tempo, delta) {
        const t = this.time.now;
        // pins dos postos a pulsar (o melhor posto segundo o Assistente)
        this.pins.forEach(p => {
            const s = p.destacado ? 0.58 + 0.05 * Math.sin(t / 130) : 0.5;
            p.setScale(s); p.letra.setScale(s / 0.5);
            p.letra.setY(p.y0 - 46 * s);
        });
        if (this.pausado) return;
        const dt = Math.min(delta, 50) / 1000;
        this.semaforos.forEach(s => s.update(dt));
        [...this.lista].forEach(v => { if (v.active) v.atualizar(dt); });

        // halos à volta das ambulâncias e carros elétricos (para se verem bem)
        const h = this.haloGfx;
        h.clear();
        for (const v of this.lista) {
            if (v.tipo === 'NORMAL' || v.metaFeita) continue;
            const r = 15 + 2.5 * Math.sin(t / 160);
            h.lineStyle(3, v.tipo === 'AMB' ? 0xd0453a : 0x2a8fbd, 0.85).strokeCircle(v.x, v.y, r);
        }

        // geração (aleatoriedade controlada: intervalos sorteados dentro de limites por nível)
        this.tCarro -= dt; this.tAmb -= dt; this.tEV -= dt;
        if (this.tCarro <= 0) { this.gerarNormal(); this.tCarro = Phaser.Math.FloatBetween(...this.cfg.carros); }
        if (this.tAmb <= 0) { this.gerarAmbulancia(); this.tAmb = Phaser.Math.FloatBetween(...this.cfg.amb); }
        if (this.tEV <= 0) { this.gerarEV(); this.tEV = Phaser.Math.FloatBetween(...this.cfg.ev); }

        // DSS e HUD
        this.tAvaliar -= dt;
        if (this.tAvaliar <= 0) {
            this.tAvaliar = 0.5;
            this.avaliarDSS();
            this.atualizarPostos();
            this.desenharRotas();
            this.atualizarHUD();
            if (this.lista.some(v => v.tipo === 'AMB' && !v.metaFeita)) Som.ciclo('sirene', 0.3, 'e'); else Som.parar('sirene');
        }

        // regras de falha
        for (const v of [...this.lista]) {
            if (v.tipo === 'AMB' && !v.metaFeita && v.idade > 40) { this.remover(v); this.perderVida('A ambulância chegou tarde!'); }
            else if (v.tipo === 'EV') {
                if (v.estado === 'ESCOLHA') {
                    v.escolhaT += dt;
                    if (v.escolhaT > 10 && this.ultimaClassificacao) {
                        const maisPerto = [...this.ultimaClassificacao].sort((a, b) => a.tempo - b.tempo)[0];
                        this.escolherPosto(maisPerto.posto, true);
                    }
                } else if (!v.metaFeita && v.bateria <= 0) { this.remover(v); this.perderVida('O carro elétrico ficou sem bateria!'); }
            }
        }

        // congestionamento
        this.tCongest -= dt;
        if (this.tCongest <= 0) {
            this.tCongest = 1;
            const parados = this.lista.filter(v => v.tipo !== 'EV' && v.v < 5 && v.idade > 3).length;
            this.congestao = parados > 9 ? this.congestao + (parados - 9) * 2.5 : Math.max(0, this.congestao - 4);
            if (this.congestao > 60) this.dica('Muito trânsito parado! Liberta as filas maiores.');
            if (this.congestao >= 100) {
                this.congestao = 35;
                [...this.lista].filter(v => v.tipo === 'NORMAL' && v.v < 5).forEach(v => this.remover(v));
                this.perderVida('Congestionamento! A polícia limpou o trânsito.');
            }
        }
        // buzinas quando há muito trânsito parado
        if (this.congestao > 40 && Phaser.Math.RND.frac() < dt * 0.3) Som.tocar('buzina', 0.35);
    }
}
