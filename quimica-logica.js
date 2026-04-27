/**
 * HUBBRAIN QUÍMICA V3 - LÓGICA ULTRA COMPLETA
 * Fórmulas integradas e Memorial de Cálculo
 */

// 1. CONCENTRAÇÃO COMUM
function resolverConcentracao() {
    const m = parseFloat(document.getElementById('c_massa').value);
    const v = parseFloat(document.getElementById('c_vol').value);
    const res = document.getElementById('res_c');

    if (m && v) {
        // Lógica de Unidade: Se V for > 10, assume-se mL e converte para L
        let volLitros = (v >= 10) ? v / 1000 : v;
        let c = m / volLitros;

        res.innerHTML = `
            <span class="step">Passo 1: C = m / V</span><br>
            <span class="step">Passo 2: C = ${m}g / ${volLitros}L</span><br>
            <span class="final-res">C = ${c.toFixed(2)} g/L</span>
        `;
    } else {
        res.innerHTML = "❌ Preencha todos os campos.";
    }
}

// 2. NÚMERO DE MOLS (n = m/MM)
function resolverMols() {
    const m = parseFloat(document.getElementById('n_massa').value);
    const mm = parseFloat(document.getElementById('n_mm').value);
    const res = document.getElementById('res_n');

    if (m && mm) {
        let n = m / mm;
        res.innerHTML = `
            <span class="step">Passo 1: n = m / MM</span><br>
            <span class="step">Passo 2: n = ${m}g / ${mm}g/mol</span><br>
            <span class="final-res">n = ${n.toFixed(4)} mol</span>
        `;
    } else {
        res.innerHTML = "❌ Preencha Massa e MM.";
    }
}

// 3. MOLARIDADE (M = m / MM * V)
function resolverMolaridade() {
    const m = parseFloat(document.getElementById('m_massa').value);
    const mm = parseFloat(document.getElementById('m_mm').value);
    const v = parseFloat(document.getElementById('m_vol').value);
    const res = document.getElementById('res_m');

    if (m && mm && v) {
        let vL = (v >= 10) ? v / 1000 : v;
        let M = m / (mm * vL);

        res.innerHTML = `
            <span class="step">Passo 1: M = m / (MM * V)</span><br>
            <span class="step">Passo 2: M = ${m} / (${mm} * ${vL})</span><br>
            <span class="final-res">M = ${M.toFixed(3)} mol/L</span>
        `;
    } else {
        res.innerHTML = "❌ Preencha Massa, MM e Vol.";
    }
}

// 4. TÍTULO E PORCENTAGEM
function resolverTitulo() {
    const m1 = parseFloat(document.getElementById('t_soluto').value);
    const mt = parseFloat(document.getElementById('t_total').value);
    const res = document.getElementById('res_t');

    if (m1 && mt) {
        let t = m1 / mt;
        let p = t * 100;
        res.innerHTML = `
            <span class="step">Passo 1: τ = m1 / m_total</span><br>
            <span class="step">Passo 2: τ = ${m1} / ${mt}</span><br>
            <span class="final-res">Título: ${t.toFixed(3)}</span>
            <span class="final-res">Porcentagem: ${p.toFixed(1)}%</span>
        `;
    }
}

// 5. DILUIÇÃO
function resolverDiluicao() {
    const c1 = parseFloat(document.getElementById('d_c1').value);
    const v1 = parseFloat(document.getElementById('d_v1').value);
    const c2 = parseFloat(document.getElementById('d_c2').value);
    const res = document.getElementById('res_d');

    if (c1 && v1 && c2) {
        let v2 = (c1 * v1) / c2;
        res.innerHTML = `
            <span class="step">Fórmula: V2 = (C1 * V1) / C2</span><br>
            <span class="final-res">Vf = ${v2.toFixed(2)} unidades</span>
        `;
    }
}

// 6. PH
function resolverPH() {
    const h = parseFloat(document.getElementById('ph_input').value);
    const res = document.getElementById('res_ph');

    if (h > 0) {
        let ph = -Math.log10(h);
        let poh = 14 - ph;
        let classificacao = ph < 7 ? "ÁCIDA" : (ph > 7 ? "BÁSICA" : "NEUTRA");
        
        res.innerHTML = `
            <span class="step">pH = -log(${h})</span><br>
            <span class="final-res">pH: ${ph.toFixed(2)}</span>
            <span class="final-res">pOH: ${poh.toFixed(2)}</span>
            <span class="step">Solução: ${classificacao}</span>
        `;
    } else {
        res.innerHTML = "❌ Concentração inválida.";
    }
}
