import { LARGURA, ALTURA, MAPA_L, DIST_PARAGEM, COR, FONTE, eixoDe, outroEixo, CONSUMO_BATERIA, VETOR } from '../classes/Constantes.js';
import Grafo from '../classes/Grafo.js';
import Semaforo from '../classes/Semaforo.js';
import Veiculo from '../classes/Veiculo.js';
import MotorDSS from '../classes/MotorDSS.js';
import GestorNiveis, { TEMPO_INICIAL, BONUS_ENTREGA, BONUS_NIVEL } from '../classes/GestorNiveis.js';
import { POSTOS, sortearOcupacao, euros } from '../classes/Dados.js';
import Som from '../classes/Som.js';
import { criarBotao, cartao } from '../classes/UI.js';

const TX = '#e8e6df';
const ESCOLHA_MAX = 15;   // segundos para escolher o posto (depois segue para o selecionado)

export default class JogoScene extends Phaser.Scene {
    constructor() { super('JogoScene'); }

    init(d) {
        this.nivel = (d && d.nivel) || 1;
        this.pontos = (d && d.pontos) || 0;
        this.tempo = d && d.tempo !== undefined ? d.tempo : TEMPO_INICIAL;
        this.estat = (d && d.estat) || { aceites: 0, ignoradas: 0, ambEntregues: 0, evCarregados: 0, escolhas: 0, somaEficiencia: 0 };
    }

    create() {
        this.cfg = GestorNiveis.obter(this.nivel);
        this.layout = this.cache.json.get('niveis').niveis[this.nivel - 1];
        this.grafo = new Grafo(this.layout.colunas, this.layout.linhas);
        this.destinos = Object.fromEntries(this.layout.destinos.map(d => [d.id, { ...d, prox: 0 }]));
        this.postos = POSTOS.filter(p => this.destinos[p.id]).map(p => ({ ...p, dest: this.destinos[p.id] }));
        sortearOcupacao(this.postos);
        this.lista = [];
        this.feitos = { amb: 0, ev: 0 };
        this.pausado = true;
        this.congestao = 0;
        this.ignorados = {};
        this.rec = null;
        this.previa = null;
        this.tAvaliar = 0; this.tCongest = 0; this.tCarro = 0.5; this.tMissao = 2;
        this.events.once('shutdown', () => Som.pararTudo());

        this.sensores = this.add.group();
        this.veiculos = this.add.group();

        this.add.image(0, 0, 'mapa' + this.nivel).setOrigin(0).setScale(0.5).setDepth(0);
        this.rotaGfx = this.add.graphics().setDepth(2);
        this.haloGfx = this.add.graphics().setDepth(2.5);
        this.criarSemaforos();
        this.criarMarcadores();
        this.criarHUD();

        // Arcade Physics: o sensor à frente de cada veículo trava-o se houver outro veículo no mesmo sentido
        this.physics.add.overlap(this.sensores, this.veiculos, (sensor, v) => {
            const o = sensor.owner;
            if (o && v !== o && Math.abs(Phaser.Math.Angle.Wrap(v.rotation - o.rotation)) < 0.8) o.bloqueado = true;
        });
        this.mostrarIntro();
    }

    // ------------------------------------------------------------ mapa
    criarSemaforos() {
        this.semaforos = [];
        this.semPorNo = {};
        const { colunas, linhas } = this.layout;
        linhas.forEach((y, r) => colunas.forEach((x, c) => {
            const s = new Semaforo(this, `S${this.semaforos.length + 1}`, x, y);
            s.no = `I${r}${c}`;
            s.aoClicar(() => this.cliqueSemaforo(s));
            this.semaforos.push(s);
            this.semPorNo[s.no] = s;
        }));
    }

    // etiquetas do hospital e dos postos (o posto é clicável quando há um elétrico à espera)
    criarMarcadores() {
        this.marcas = {};
        for (const d of this.layout.destinos) {
            const hosp = d.tipo === 'hospital';
            const posto = this.postos.find(p => p.id === d.id);
            const txt = hosp ? '✚ Hospital' : `${d.id} · ${posto.curto}`;
            const t = this.add.text(d.rotulo[0], d.rotulo[1], txt, {
                fontFamily: FONTE, fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
                backgroundColor: hosp ? '#b3362c' : '#1f6f4a', padding: { x: 6, y: 3 }
            }).setOrigin(0.5).setDepth(9);
            t.setPosition(Phaser.Math.Clamp(t.x, t.width / 2 + 3, MAPA_L - t.width / 2 - 3), Phaser.Math.Clamp(t.y, 12, ALTURA - 12));
            if (posto) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.verPosto(posto));
            this.marcas[d.id] = t;
        }
    }

    // ------------------------------------------------------------ semáforos
    // Há conflito se dentro do cruzamento está um carro que atravessa o caminho de v
    conflito(v, s) {
        const virar = (c) => {
            const i = c.ids.indexOf(s.no);
            if (i <= 0 || i >= c.ids.length - 1) return false;
            return this.grafo.direcao(c.ids[i - 1], s.no) !== this.grafo.direcao(s.no, c.ids[i + 1]);
        };
        const oposta = { N: 'S', S: 'N', E: 'W', W: 'E' };
        for (const c of this.lista) {
            if (c === v || c.fim || Math.abs(c.x - s.x) > 34 || Math.abs(c.y - s.y) > 34) continue;
            if (c.dir === v.dir) continue;
            if (c.dir === oposta[v.dir] && !virar(v) && !virar(c)) continue;
            return true;
        }
        return false;
    }

    // Velocidade máxima permitida pelo próximo semáforo da rota: com vermelho o carro trava de forma
    // progressiva até à linha de paragem. Só segue quem já estava dentro do cruzamento quando mudou.
    limiteSemaforo(v) {
        if (v.fim || v.estado === 'ESCOLHA') return Infinity;
        const j = v.nodoIdx[Math.min(v.idx, v.nodoIdx.length - 1)] - 1;
        if (j < 1 || j >= v.ids.length) return Infinity;
        const no = v.ids[j], s = this.semPorNo[no];
        if (!s) return Infinity;
        const dir = this.grafo.direcao(v.ids[j - 1], no), [ux, uy] = VETOR[dir];
        const dist = (s.x - ux * DIST_PARAGEM - v.x) * ux + (s.y - uy * DIST_PARAGEM - v.y) * uy;
        if (dist < -20 || dist > 130) return Infinity;   // já dentro do cruzamento (segue) ou ainda longe
        if (s.verde(eixoDe(dir)) && !this.conflito(v, s)) return Infinity;
        return dist <= 0 ? 0 : Math.sqrt(2 * 300 * dist);  // vermelho: trava até à linha
    }

    cliqueSemaforo(s) {
        if (this.pausado) return;
        if (this.rec && this.rec.sem === s && outroEixo(s.eixo) === this.rec.eixo) {
            this.estat.aceites++; this.pontos += 5; this.rec = null; s.destacar(false);
        }
        s.alternar();
        Som.tocar('semaforo');
    }

    // ------------------------------------------------------------ painel
    criarHUD() {
        const X = MAPA_L;
        this.add.rectangle(X + 100, ALTURA / 2, 200, ALTURA, COR.papel).setDepth(10);
        this.add.rectangle(X + 1.5, ALTURA / 2, 3, ALTURA, 0x0f1217).setDepth(11);
        const txt = (x, y, s, tam, cor, bold = false, w = 180) => this.add.text(x, y, s, {
            fontFamily: FONTE, fontSize: tam + 'px', color: cor, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: w }
        }).setDepth(12);
        const barra = (y, w = 176) => {
            this.add.rectangle(X + 12, y, w, 6, 0x3a414d).setOrigin(0, 0.5).setDepth(12);
            return this.add.rectangle(X + 12, y, 0, 6, COR.verde).setOrigin(0, 0.5).setDepth(13);
        };

        txt(X + 12, 8, `NÍVEL ${this.nivel} · ${this.cfg.titulo.split(' – ')[1].toUpperCase()}`, 11, COR.terracotaTxt, true);
        txt(X + 12, 26, 'TEMPO', 10, COR.cinzaTxt, true);
        this.hudTempo = this.add.text(X + 12, 37, '', { fontFamily: 'Georgia, serif', fontSize: '30px', color: TX, fontStyle: 'bold' }).setDepth(12);
        txt(X + 118, 26, 'PONTOS', 10, COR.cinzaTxt, true);
        this.hudPontos = this.add.text(X + 118, 41, '', { fontFamily: 'Georgia, serif', fontSize: '22px', color: TX, fontStyle: 'bold' }).setDepth(12);
        this.barraTempo = barra(78);

        this.objLinhas = [];
        let y = 88;
        [['amb', 'Ambulâncias'], ['ev', 'Elétricos']].forEach(([k, nome]) => {
            const t = txt(X + 12, y, '', 12, TX, true);
            const b = barra(y + 21);
            this.objLinhas.push({ k, nome, t, b });
            y += 28;
        });

        txt(X + 12, 146, 'ASSISTENTE', 10, COR.cinzaTxt, true);
        cartao(this, X + 8, 159, 184, 90, { cor: COR.branco }).setDepth(11);
        this.dssFaixa = this.add.rectangle(X + 12, 204, 4, 82, COR.cinza).setDepth(12);
        this.dssAcao = txt(X + 20, 164, '', 13, TX, true, 168);
        this.dssMotivo = txt(X + 20, 181, '', 11, COR.cinzaTxt, false, 168);
        this.btnAceitar = criarBotao(this, X + 55, 236, 80, 20, 'ACEITAR', () => this.aceitarRec(), { cor: COR.verde, corHover: 0x2d8a5e, fonte: '11px' }).setDepth(14);
        this.btnIgnorar = criarBotao(this, X + 145, 236, 80, 20, 'IGNORAR', () => this.ignorarRec(), { cor: COR.cinza, corHover: 0x5f6672, fonte: '11px' }).setDepth(14);

        txt(X + 12, 256, 'TRÂNSITO PARADO', 10, COR.cinzaTxt, true);
        this.add.rectangle(X + 110, 262, 78, 6, 0x3a414d).setOrigin(0, 0.5).setDepth(12);
        this.barraCong = this.add.rectangle(X + 110, 262, 0, 6, COR.verde).setOrigin(0, 0.5).setDepth(13);

        this.hudPostos = txt(X + 12, 274, '', 11, COR.terracotaTxt, true);
        this.cartoes = this.postos.map((p, i) => {
            const c = this.add.container(X + 100, 306 + i * 37).setDepth(12);
            const fundo = this.add.rectangle(0, 0, 186, 34, COR.branco).setStrokeStyle(2, COR.papelEscuro);
            const faixa = this.add.rectangle(-91, 0, 4, 34, COR.cinza);
            const t1 = this.add.text(-84, -13, '', { fontFamily: FONTE, fontSize: '11px', color: TX, fontStyle: 'bold' });
            const t2 = this.add.text(-84, 1, '', { fontFamily: FONTE, fontSize: '10px', color: '#9aa1ad' });
            c.add([fundo, faixa, t1, t2]);
            c.setSize(186, 34).setInteractive({ useHandCursor: true });
            c.on('pointerdown', () => this.verPosto(p));
            Object.assign(c, { fundo, faixa, t1, t2, posto: p });
            return c;
        });
        this.btnConfirmar = criarBotao(this, X + 100, 306 + this.postos.length * 37, 184, 24, 'CONFIRMAR', () => this.confirmarPosto(),
            { cor: COR.terracota, corHover: COR.terracotaEsc, fonte: '12px' }).setDepth(14);

        this.dicaTxt = this.add.text(MAPA_L / 2, ALTURA - 16, '', {
            fontFamily: FONTE, fontSize: '13px', color: '#fffdf6', fontStyle: 'bold', backgroundColor: '#12151bdd', padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(30).setAlpha(0);
        this.toastTxt = this.add.text(MAPA_L / 2, 24, '', {
            fontFamily: FONTE, fontSize: '14px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#12151bdd', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setDepth(30).setAlpha(0);
        this.mostrarRec();
        this.atualizarPostos();
        this.atualizarHUD();
    }

    atualizarHUD() {
        const t = Math.max(0, this.tempo);
        this.hudTempo.setText(`${Math.ceil(t)} s`).setColor(t > 15 ? TX : '#ff7b6e');
        this.barraTempo.width = 176 * Math.min(1, t / 60);
        this.barraTempo.setFillStyle(t > 25 ? COR.verde : t > 12 ? COR.amarelo : COR.vermelho);
        this.hudPontos.setText(`${this.pontos}`);
        const o = this.cfg.objetivos;
        this.objLinhas.forEach(l => {
            l.t.setText(`${l.nome}: ${this.feitos[l.k]} / ${o[l.k]}`);
            l.b.width = 176 * Math.min(1, this.feitos[l.k] / o[l.k]);
        });
        const c = Phaser.Math.Clamp(this.congestao, 0, 100);
        this.barraCong.width = 78 * c / 100;
        this.barraCong.setFillStyle(c < 50 ? COR.verde : c < 80 ? COR.amarelo : COR.vermelho);
    }

    toast(msg, cor = '#ffffff') {
        this.toastTxt.setText(msg).setColor(cor).setAlpha(1);
        this.tweens.killTweensOf(this.toastTxt);
        this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 1800, duration: 600 });
    }

    // texto que sobe a partir de um ponto do mapa (ex.: "+10 s")
    flutuar(x, y, msg, cor) {
        const t = this.add.text(x, y - 20, msg, { fontFamily: FONTE, fontSize: '15px', color: cor, fontStyle: 'bold', stroke: '#12151b', strokeThickness: 4 })
            .setOrigin(0.5).setDepth(31);
        this.tweens.add({ targets: t, y: y - 55, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
    }

    dica(msg) {
        if (this.dicaAtual === msg) return;
        this.dicaAtual = msg;
        this.dicaTxt.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.dicaTxt);
        this.tweens.add({ targets: this.dicaTxt, alpha: 0, delay: 5000, duration: 700, onComplete: () => { this.dicaAtual = null; } });
    }

    // ------------------------------------------------------------ DSS: semáforos (motor de regras)
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
        const nova = MotorDSS.avaliarSemaforos(this.semaforos, this.lista.filter(v => !v.fim), this.ignorados);
        const mudou = (!nova && this.rec) || (nova && (!this.rec || this.rec.sem !== nova.sem || this.rec.eixo !== nova.eixo));
        if (mudou) {
            this.semaforos.forEach(s => s.destacar(false));
            this.rec = nova;
            if (nova) { nova.sem.destacar(true, nova.eixo); if (nova.prioridade === 'ALTA') Som.tocar('alerta_ev', 0.8); }
        } else if (nova && this.rec) { this.rec.motivo = nova.motivo; this.rec.prioridade = nova.prioridade; }
        this.mostrarRec();
    }

    mostrarRec() {
        const r = this.rec;
        this.btnAceitar.setVisible(!!r); this.btnIgnorar.setVisible(!!r);
        if (!r) {
            this.dssAcao.setText('Trânsito fluido');
            this.dssMotivo.setText(`Sem sugestões. A vigiar ${this.semaforos.length} cruzamentos.`).setY(this.dssAcao.y + this.dssAcao.height + 2);
            this.dssFaixa.setFillStyle(COR.verde);
            return;
        }
        this.dssFaixa.setFillStyle(r.prioridade === 'ALTA' ? COR.vermelho : r.prioridade === 'MÉDIA' ? COR.amarelo : COR.verde);
        this.dssAcao.setText('Clica no semáforo com anel');
        this.dssMotivo.setText(r.motivo).setY(this.dssAcao.y + this.dssAcao.height + 2);
    }

    // ------------------------------------------------------------ custos das rotas (Dijkstra)
    custoDinamico = (a, b) => {
        const A = this.grafo.nos[a], B = this.grafo.nos[b];
        const dir = this.grafo.direcao(a, b);
        let c = Math.hypot(B.x - A.x, B.y - A.y) / 70;
        for (const v of this.lista) {
            if (v.dir !== dir || v.v > 8 || v.fim) continue;
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

    // ------------------------------------------------------------ veículos
    livre(p) { return !this.lista.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 64); }

    oposto(b) { return ({ W: 'E', E: 'W', N: 'S', S: 'N' })[b[0]] + b.slice(1); }

    adicionar(tipo, cam, origem) {
        if (!this.livre(cam.pontos[0])) return null;
        const v = new Veiculo(this, tipo, cam);
        v.entrada = origem;
        if (tipo !== 'NORMAL') {
            v.rotulo = this.add.text(v.x, v.y - 22, '', { fontFamily: FONTE, fontSize: '10px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#12151bcc', padding: { x: 4, y: 1 } })
                .setOrigin(0.5).setDepth(9).setVisible(tipo === 'EV');
        }
        this.lista.push(v);
        this.veiculos.add(v);
        return v;
    }

    gerarNormal() {
        const bordas = this.grafo.bordas();
        for (let k = 0; k < 4; k++) {
            const o = Phaser.Math.RND.pick(bordas);
            let d = Phaser.Math.RND.frac() < 0.7 ? this.oposto(o) : Phaser.Math.RND.pick(bordas);
            if (d === o) d = this.oposto(o);
            const r = this.grafo.rota(o, d, this.custoEstatico);
            if (r && this.adicionar('NORMAL', this.grafo.caminho(r.ids), o)) return;
        }
    }

    ativas(tipo) { return this.lista.filter(v => v.tipo === tipo && !v.metaFeita).length; }

    // Aleatoriedade controlada: o tipo de missão é sorteado entre os que ainda faltam
    gerarMissao() {
        const o = this.cfg.objetivos;
        if (this.ativas('AMB') + this.ativas('EV') >= this.cfg.simultaneas) return;
        const faltaAmb = o.amb - this.feitos.amb - this.ativas('AMB');
        const faltaEV = this.evEmEscolha() ? 0 : o.ev - this.feitos.ev - this.ativas('EV');
        if (faltaAmb <= 0 && faltaEV <= 0) return;
        const amb = Phaser.Math.RND.frac() < faltaAmb / Math.max(1, faltaAmb + Math.max(0, faltaEV));
        if (amb) this.gerarAmbulancia(); else this.gerarEV();
    }

    gerarAmbulancia() {
        const H = this.destinos.H;
        for (let k = 0; k < 4; k++) {
            const o = Phaser.Math.RND.pick(this.grafo.bordas());
            const cam = this.grafo.caminhoDestino(o, H, H.prox, this.custoDinamico);
            if (!cam) continue;
            const v = this.adicionar('AMB', cam, o);
            if (!v) continue;
            H.prox++;
            Som.tocar('alerta_ev');
            this.toast('🚑 Nova ambulância para o hospital', '#ffb3a8');
            if (this.feitos.amb === 0) this.dica('Segue a linha vermelha e dá-lhe verde nos semáforos.');
            return;
        }
    }

    gerarEV() {
        for (let k = 0; k < 4; k++) {
            const o = Phaser.Math.RND.pick(this.grafo.bordas());
            const r = this.grafo.rota(o, this.oposto(o), this.custoEstatico);
            if (!r) continue;
            const cam = this.grafo.caminho(r.ids);
            const [ux, uy] = VETOR[this.grafo.direcao(r.ids[0], r.ids[1])];
            const espera = { x: cam.pontos[1].x + ux * 22, y: cam.pontos[1].y + uy * 22 };
            if (!this.livre(espera)) continue;
            const v = this.adicionar('EV', cam, o);
            if (!v) continue;
            v.bateria = Phaser.Math.Between(22, 40);
            // jogo justo: o posto mais próximo tem de ser alcançável com a bateria que o carro tem
            const tMin = Math.min(...this.postos.map(p => this.tempoAte(v, p)));
            v.bateria = Math.min(60, Math.max(v.bateria, Math.ceil(tMin * CONSUMO_BATERIA + 15)));
            v.estado = 'ESCOLHA';
            v.escolhaT = 0;
            v.idx = 2;
            v.setPosition(espera.x, espera.y);
            v.definirDirecao();
            v.setRotation(v.anguloAlvo());
            this.previa = null;
            Som.tocar('alerta_ev');
            this.toast('⚡ Carro elétrico precisa de carregar', '#bfe9ff');
            this.dica('Escolhe o posto no painel (★ = sugestão) e carrega em CONFIRMAR.');
            return;
        }
    }

    // ------------------------------------------------------------ DSS: postos (pontuação multicritério)
    evEmEscolha() { return this.lista.find(v => v.tipo === 'EV' && v.estado === 'ESCOLHA'); }

    tempoAte(ev, posto) {
        const c = this.grafo.caminhoDestino(ev.entrada, posto.dest, posto.dest.prox, this.custoDinamico);
        return c ? c.tempo : 999;
    }

    classificar(ev) { return MotorDSS.classificarPostos(ev, this.postos, (p) => this.tempoAte(ev, p)); }

    verPosto(p) {
        if (!this.evEmEscolha() || this.pausado) return;
        this.previa = p;
        Som.tocar('botao');
        this.atualizarPostos();
        this.desenharRotas();
    }

    confirmarPosto() { if (this.previa) this.escolherPosto(this.previa); }

    atualizarPostos() {
        const ev = this.evEmEscolha();
        const f = (n) => Math.round(n);
        if (!ev) {
            this.previa = null; this.melhorPosto = null;
            this.btnConfirmar.setVisible(false);
            this.hudPostos.setText('POSTOS DE CARREGAMENTO').setColor(COR.cinzaTxt);
            this.cartoes.forEach(c => {
                const p = c.posto;
                c.t1.setText(`${p.id}  ${p.nome} · ${p.kW} kW`);
                c.t2.setText(`${euros(p.preco).replace(' €', '')} €/kWh · ${p.espera ? 'fila ~' + p.espera + ' min' : 'livre'}`);
                c.setAlpha(0.55); c.fundo.setStrokeStyle(2, COR.papelEscuro); c.faixa.setFillStyle(COR.cinza);
            });
            Object.values(this.marcas).forEach(m => m.setAlpha(1).setScale(1));
            return;
        }
        const { lista, critica } = this.classificar(ev);
        this.melhorPosto = lista[0];
        if (!this.previa) this.previa = lista[0].posto;
        this.hudPostos.setText(`ESCOLHE O POSTO · bateria ${f(ev.bateria)}%${critica ? ' (crítica)' : ''}`).setColor(critica ? '#ff7b6e' : COR.terracotaTxt);
        this.btnConfirmar.setVisible(true).setTexto(`CONFIRMAR POSTO ${this.previa.id}`);
        this.cartoes.forEach(c => {
            const it = lista.find(l => l.posto === c.posto), p = c.posto, top = lista[0] === it, sel = this.previa === p;
            c.t1.setText(`${top ? '★ ' : ''}${p.id}  ${p.nome} · ${p.kW} kW`);
            c.t2.setText(it.viavel ? `viagem ${f(it.viagem)} min · carga ${f(it.minCarga)} min · ${euros(it.custo)}` : 'bateria insuficiente');
            const cor = it.viavel ? (top ? COR.verde : COR.azul) : COR.vermelho;
            c.faixa.setFillStyle(cor);
            c.setAlpha(1);
            c.fundo.setStrokeStyle(sel ? 3 : 2, sel ? COR.amarelo : COR.papelEscuro);
        });
        this.postos.forEach(p => this.marcas[p.id].setAlpha(this.previa === p ? 1 : 0.8).setScale(this.previa === p ? 1.15 : 1));
    }

    escolherPosto(posto, auto = false) {
        const ev = this.evEmEscolha();
        if (!ev || this.pausado) return;
        const { lista } = this.classificar(ev);
        const it = lista.find(l => l.posto === posto), melhor = lista[0];
        const cam = this.grafo.caminhoDestino(ev.entrada, posto.dest, posto.dest.prox, this.custoDinamico);
        if (!cam) return;
        posto.dest.prox++;
        ev.novaRota(cam);
        ev.estado = 'ANDAR';
        ev.postoId = posto.id;
        ev.estimativa = it;
        ev.eficiencia = Math.max(0, Math.min(100, Math.round(100 * it.score / melhor.score)));
        if (!auto) {
            this.estat.escolhas++; this.estat.somaEficiencia += ev.eficiencia;
            if (it === melhor) this.estat.aceites++; else this.estat.ignoradas++;
        }
        Som.tocar('aceitar');
        this.toast(auto ? `Sem decisão: segue para o posto ${posto.id}` : `Posto ${posto.id}: ${ev.eficiencia}% da melhor opção`, '#bfe9ff');
        this.previa = null;
        this.atualizarPostos();
    }

    // ------------------------------------------------------------ chegadas
    aoMeta(v) {
        if (v.tipo === 'NORMAL') return;     // carros normais apenas atravessam a cidade
        this.tempo += BONUS_ENTREGA;
        this.flutuar(v.x, v.y, `+${BONUS_ENTREGA} s`, '#6fd3a0');
        if (v.tipo === 'AMB') {
            const pts = 100 + Math.max(0, Math.round(60 - v.idade) * 2);
            this.pontos += pts; this.feitos.amb++; this.estat.ambEntregues++;
            this.toast(`🚑 Ambulância no hospital!  +${pts} pontos`, '#c8f2d6'); Som.tocar('sucesso');
            this.estacionar(v, 1200);
        } else if (v.tipo === 'EV') {
            const e = v.estimativa;
            const pts = 60 + Math.round(90 * v.eficiencia / 100);
            this.pontos += pts; this.feitos.ev++; this.estat.evCarregados++;
            this.toast(`⚡ Posto ${v.postoId}: ${Math.round(e.kwh)} kWh · ${Math.round(e.minCarga)} min · ${euros(e.custo)}  +${pts}`, '#c8f2d6');
            Som.tocar('carregar');
            this.estacionar(v, 2400);
        }
        this.atualizarHUD();
        this.verificarNivel();
    }

    // o veículo fica parado na baía e desaparece passado um instante
    estacionar(v, ms) {
        v.fim = true;
        if (v.rotulo) v.rotulo.setVisible(v.tipo === 'EV').setText('a carregar');
        this.time.delayedCall(ms, () => {
            if (!v.active) return;
            this.tweens.add({ targets: v, alpha: 0, duration: 450, onComplete: () => { if (v.active) this.remover(v); } });
        });
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

    penalizar(seg, motivo) {
        this.tempo -= seg;
        this.cameras.main.shake(200, 0.006);
        Som.tocar('erro');
        this.toast(`${motivo}  −${seg} s`, '#ffb3a8');
    }

    fimDeJogo() {
        this.pausado = true;
        Som.pararTudo();
        this.sobrepor('Acabou o tempo!', 'A cidade ficou parada.');
        this.time.delayedCall(1800, () => this.scene.start('GameOverScene', { pontos: this.pontos, nivel: this.nivel, estat: this.estat, vitoria: false }));
    }

    verificarNivel() {
        const o = this.cfg.objetivos;
        if (this.pausado || this.feitos.amb < o.amb || this.feitos.ev < o.ev) return;
        this.pausado = true;
        const bonus = 100 * this.nivel + Math.round(this.tempo) * 5;
        this.pontos += bonus;
        this.atualizarHUD();
        Som.pararTudo();
        Som.tocar('nivel');
        const fim = this.nivel >= GestorNiveis.total();
        this.sobrepor(fim ? 'Cidade em ordem!' : 'Nível concluído!', `Bónus: +${bonus} pontos` + (fim ? '' : `\nO tempo que sobrou passa para o próximo nível (+${BONUS_NIVEL} s).`));
        this.time.delayedCall(3000, () => {
            if (fim) this.scene.start('GameOverScene', { pontos: this.pontos, nivel: this.nivel, estat: this.estat, vitoria: true });
            else this.scene.restart({ nivel: this.nivel + 1, pontos: this.pontos, tempo: this.tempo + BONUS_NIVEL, estat: this.estat });
        });
    }

    sobrepor(t1, t2) {
        const c = this.add.container(MAPA_L / 2, ALTURA / 2).setDepth(40);
        c.add([
            cartao(this, -230, -100, 460, 200),
            this.add.text(0, -68, t1, { fontFamily: 'Georgia, serif', fontSize: '28px', color: COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5),
            this.add.text(0, -36, t2, { fontFamily: FONTE, fontSize: '14px', color: TX, align: 'center', wordWrap: { width: 410 }, lineSpacing: 4 }).setOrigin(0.5, 0)
        ]);
        return c;
    }

    mostrarIntro() {
        const o = this.cfg.objetivos;
        const c = this.sobrepor(this.cfg.titulo,
            `${this.cfg.descricao}\n\nObjetivo: ${o.amb} ambulâncias + ${o.ev} elétricos · tempo: ${Math.ceil(this.tempo)} s\n(toca para começar)`);
        let ja = false;
        const comecar = () => {
            if (ja) return; ja = true;
            c.destroy();
            this.pausado = false;
            Som.ciclo('musica', 0.5, 'm');
            Som.ciclo('ambiente', 0.55, 'm');
            if (this.nivel === 1) this.dica('Clica num semáforo para dar o verde ao outro sentido.');
        };
        this.input.once('pointerdown', comecar);
        this.time.delayedCall(6000, comecar);
    }

    // ------------------------------------------------------------ desenho
    desenharRotas() {
        const g = this.rotaGfx;
        g.clear();
        const linha = (pts, cor) => {
            g.lineStyle(5, 0xffffff, 0.45);
            g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
            g.lineStyle(3, cor, 0.85);
            g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
        };
        for (const v of this.lista) {
            if (v.tipo === 'NORMAL' || v.fim) continue;
            if (v.estado === 'ESCOLHA') {
                if (!this.previa) continue;
                const cam = this.grafo.caminhoDestino(v.entrada, this.previa.dest, this.previa.dest.prox, this.custoDinamico);
                if (cam) linha([{ x: v.x, y: v.y }, ...cam.pontos.slice(2)], 0xe9b949);
            } else {
                linha([{ x: v.x, y: v.y }, ...v.pontos.slice(v.idx, v.idxMeta + 1)], v.tipo === 'AMB' ? 0xd0453a : 0x3b8ec2);
            }
        }
    }

    // distância de segurança: trava se houver um veículo à frente, na mesma faixa e no mesmo sentido
    distanciaSegura() {
        for (const v of this.lista) {
            if (v.fim) continue;
            const c = Math.cos(v.rotation), sn = Math.sin(v.rotation);
            for (const o of this.lista) {
                if (o === v) continue;
                const dx = o.x - v.x, dy = o.y - v.y;
                const frente = dx * c + dy * sn;
                if (frente <= 0 || frente > 48) continue;
                if (Math.abs(-dx * sn + dy * c) > 13) continue;
                if (!o.fim && Math.abs(Phaser.Math.Angle.Wrap(v.rotation - o.rotation)) > 1.0) continue;
                v.bloqueado = true;
                break;
            }
        }
    }

    update(tempo, delta) {
        if (this.pausado) return;
        const dt = Math.min(delta, 50) / 1000;

        // relógio global: começa em 40 s, cada entrega dá +10 s
        this.tempo -= dt;
        if (this.tempo <= 0) { this.tempo = 0; this.atualizarHUD(); this.fimDeJogo(); return; }

        this.semaforos.forEach(s => s.update(dt));
        this.distanciaSegura();
        for (const v of this.lista) v.vMax = this.limiteSemaforo(v);
        [...this.lista].forEach(v => { if (v.active) v.atualizar(dt); });

        // anel à volta das ambulâncias e elétricos + etiqueta da bateria
        const h = this.haloGfx;
        h.clear();
        for (const v of this.lista) {
            if (v.tipo === 'NORMAL' || v.fim) { if (v.rotulo) v.rotulo.setPosition(v.x, v.y - 22); continue; }
            h.lineStyle(2, v.tipo === 'AMB' ? 0xd0453a : 0x3b8ec2, 0.85).strokeCircle(v.x, v.y, 16);
            if (v.rotulo) v.rotulo.setPosition(v.x, v.y - 22).setText(`⚡ ${Math.round(v.bateria)}%`)
                .setBackgroundColor(v.bateria < 15 ? '#a8261c' : '#12151bcc');
        }

        // geração (intervalos sorteados dentro dos limites do nível)
        this.tCarro -= dt; this.tMissao -= dt;
        if (this.tCarro <= 0) { this.gerarNormal(); this.tCarro = Phaser.Math.FloatBetween(...this.cfg.carros); }
        if (this.tMissao <= 0) { this.gerarMissao(); this.tMissao = Phaser.Math.FloatBetween(...this.cfg.missao); }

        this.tAvaliar -= dt;
        if (this.tAvaliar <= 0) {
            this.tAvaliar = 0.4;
            this.avaliarDSS();
            this.atualizarPostos();
            this.desenharRotas();
            if (this.lista.some(v => v.tipo === 'AMB' && !v.fim)) Som.ciclo('sirene', 0.3, 'e'); else Som.parar('sirene');
        }
        this.atualizarHUD();

        // elétricos: tempo para decidir e bateria
        for (const v of [...this.lista]) {
            if (v.tipo !== 'EV' || v.fim) continue;
            if (v.estado === 'ESCOLHA') {
                v.escolhaT += dt;
                if (v.escolhaT > ESCOLHA_MAX && this.previa) this.escolherPosto(this.previa, true);
            } else if (v.bateria <= 0) {
                this.remover(v);
                this.penalizar(10, 'Elétrico sem bateria!');
            }
        }

        // trânsito parado
        this.tCongest -= dt;
        if (this.tCongest <= 0) {
            this.tCongest = 1;
            const parados = this.lista.filter(v => v.tipo === 'NORMAL' && v.v < 5 && v.idade > 3).length;
            const lim = 4 + 2 * this.semaforos.length / 3;
            this.congestao = parados > lim ? this.congestao + (parados - lim) * 3 : Math.max(0, this.congestao - 5);
            if (this.congestao > 60) this.dica('Muito trânsito parado! Abre o verde às filas maiores.');
            if (this.congestao >= 100) {
                this.congestao = 30;
                [...this.lista].filter(v => v.tipo === 'NORMAL' && v.v < 5).forEach(v => this.remover(v));
                this.penalizar(8, 'Congestionamento!');
            }
        }
        if (this.congestao > 40 && Phaser.Math.RND.frac() < dt * 0.3) Som.tocar('buzina', 0.35);
    }
}
