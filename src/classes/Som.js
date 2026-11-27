// Sons e música (ficheiros em assets/audio, carregados no PreloadScene). Volumes guardados em localStorage.
const CHAVE = 'stc_opcoes';

// Som do jogo (música, ambiente e efeitos). Os ficheiros estão em assets/audio (carregados no PreloadScene).
// Volumes por omissão: Som.vol = { m: música, e: efeitos } (0 a 1), guardados no browser.
export default class Som {
    static vol = { m: 0.6, e: 0.8 };
    static jogo = null;
    static loops = {};

    // guarda a referência ao jogo e lê os volumes guardados (chamado uma vez no PreloadScene)
    static iniciar(jogo) {
        Som.jogo = jogo;
        try {
            const o = JSON.parse(localStorage.getItem(CHAVE) || '{}');
            if (typeof o.m === 'number') Som.vol.m = o.m;
            if (typeof o.e === 'number') Som.vol.e = o.e;
        } catch (e) { /* sem armazenamento */ }
    }

    // guarda os volumes no browser (localStorage)
    static guardar() {
        try { localStorage.setItem(CHAVE, JSON.stringify(Som.vol)); } catch (e) { /* ignora */ }
        Object.values(Som.loops).forEach(l => l.s.setVolume(l.v * Som.vol[l.canal]));
    }

    // efeito sonoro de uma só vez
    static tocar(chave, vol = 1) {
        const v = Som.vol.e * vol;
        if (!Som.jogo || v <= 0 || !Som.jogo.cache.audio.exists(chave)) return;
        Som.jogo.sound.play(chave, { volume: v });
    }

    // som em ciclo (música, ambiente, sirene). canal: 'm' música/ambiente, 'e' efeitos
    static ciclo(chave, vol = 1, canal = 'e') {
        if (!Som.jogo || !Som.jogo.cache.audio.exists(chave)) return;
        let l = Som.loops[chave];
        if (!l) { l = Som.loops[chave] = { s: Som.jogo.sound.add(chave, { loop: true }), v: vol, canal }; }
        l.v = vol; l.canal = canal;
        l.s.setVolume(vol * Som.vol[canal]);
        if (!l.s.isPlaying) l.s.play();
    }

    // para um som em ciclo (ex.: 'sirene')
    static parar(chave) { const l = Som.loops[chave]; if (l && l.s.isPlaying) l.s.stop(); }
    // para todos os sons em ciclo (usado ao mudar de cena)
    static pararTudo() { Object.keys(Som.loops).forEach(k => Som.parar(k)); }
}
