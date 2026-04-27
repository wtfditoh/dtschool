// --- CALCULADORA DE MOLARIDADE E CONCENTRAÇÃO (Questões 7-12 e 24-27) ---
function calcMolaridadePro() {
    const m = parseFloat(document.getElementById('m_sol_g').value);
    const mm = parseFloat(document.getElementById('mm_g_mol').value);
    const v_ml = parseFloat(document.getElementById('vol_ml').value);
    const res = document.getElementById('resMolar');

    if (m && v_ml) {
        let v_l = v_ml / 1000;
        let C = m / v_l; [span_2](start_span)// Concentração Comum[span_2](end_span)
        let M = mm ? (m / (mm * v_l)) : "N/A"; [span_3](start_span)// Concentração Molar[span_3](end_span)
        
        res.innerHTML = `C = ${C.toFixed(2)} g/L <br> M = ${typeof M === 'number' ? M.toFixed(3) + ' mol/L' : M}`;
    }
}

// --- NOVO: CALCULADORA DE pH ---
function calcPH() {
    const h = parseFloat(document.getElementById('conc_h').value);
    const res = document.getElementById('resPH');

    if (h > 0) {
        let ph = -Math.log10(h);
        let poh = 14 - ph;
        res.innerHTML = `pH: ${ph.toFixed(2)} <br> pOH: ${poh.toFixed(2)}`;
    } else {
        res.innerHTML = "Insira uma concentração > 0";
    }
}

// --- NOVO: TERMOQUÍMICA (ΔH) ---
function calcDeltaH() {
    const hr = parseFloat(document.getElementById('h_reagentes').value);
    const hp = parseFloat(document.getElementById('h_produtos').value);
    const res = document.getElementById('resDeltaH');

    if (!isNaN(hr) && !isNaN(hp)) {
        let deltaH = hp - hr;
        let tipo = deltaH > 0 ? "Endotérmica" : "Exotérmica";
        res.innerHTML = `ΔH: ${deltaH.toFixed(2)} kJ <br> Reação ${tipo}`;
    }
}

// --- NOVO: EBULIOSCOPIA ---
function calcEbulioscopia() {
    const ke = parseFloat(document.getElementById('ke_const').value);
    const w = parseFloat(document.getElementById('molalidade').value);
    const res = document.getElementById('resColig');

    if (ke && w) {
        let deltaTe = ke * w;
        res.innerHTML = `ΔTe: ${deltaTe.toFixed(2)} °C (Aumento)`;
    }
}

// --- DILUIÇÃO (Questão 17-18 da lógica) ---
function calcDiluicaoVf() {
    const c1 = parseFloat(document.getElementById('c_inicial').value);
    const v1 = parseFloat(document.getElementById('v_inicial').value);
    const c2 = parseFloat(document.getElementById('c_final').value);
    const res = document.getElementById('resDiluicao');

    if (c1 && v1 && c2) {
        let v2 = (c1 * v1) / c2;
        res.innerHTML = `Vf: ${v2.toFixed(2)} (unid. V1)`;
    }
}
