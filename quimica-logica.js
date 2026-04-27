// 1. Soluções: Calcula Concentração Comum e Molaridade de uma vez
function calcFullSolucao() {
    const m1 = parseFloat(document.getElementById('m1_sol').value);
    const mm = parseFloat(document.getElementById('mm_sol').value);
    const v = parseFloat(document.getElementById('v_sol').value);
    const res = document.getElementById('resFullSol');

    if (m1 && v) {
        let concComum = m1 / v;
        let molaridade = mm ? (m1 / (mm * v)) : "Falta MM";
        res.innerHTML = `C: ${concComum.toFixed(2)} g/L | M: ${typeof molaridade === 'number' ? molaridade.toFixed(2) + ' mol/L' : molaridade}`;
    } else {
        res.innerHTML = "Massa e Volume são obrigatórios!";
    }
}

// 2. Gases: Equação de Clapeyron (PV = nRT)
function calcGases() {
    let p = parseFloat(document.getElementById('p_gas').value);
    let v = parseFloat(document.getElementById('v_gas').value);
    let n = parseFloat(document.getElementById('n_gas').value);
    let t = parseFloat(document.getElementById('t_gas').value);
    const R = 0.082;
    const res = document.getElementById('resGases');

    if (!p && v && n && t) res.innerHTML = `P = ${(n * R * t / v).toFixed(2)} atm`;
    else if (p && !v && n && t) res.innerHTML = `V = ${(n * R * t / p).toFixed(2)} L`;
    else if (p && v && !n && t) res.innerHTML = `n = ${(p * v / (R * t)).toFixed(2)} mol`;
    else if (p && v && n && !t) res.innerHTML = `T = ${(p * v / (n * R)).toFixed(2)} K`;
    else res.innerHTML = "Deixe apenas UM campo vazio!";
}

// 3. Diluição
function calcDiluicao() {
    const c1 = parseFloat(document.getElementById('c1').value);
    const v1 = parseFloat(document.getElementById('v1').value);
    const c2 = parseFloat(document.getElementById('c2').value);
    const res = document.getElementById('resDiluicao');

    if (c1 && v1 && c2) {
        let v2 = (c1 * v1) / c2;
        res.innerHTML = `Volume Final: ${v2.toFixed(2)} L`;
    }
}

// 4. Fração Molar
function calcFracao() {
    const n1 = parseFloat(document.getElementById('n_soluto').value);
    const n2 = parseFloat(document.getElementById('n_solvente').value);
    const res = document.getElementById('resFracao');

    if (n1 && n2) {
        let nt = n1 + n2;
        let x1 = n1 / nt;
        let x2 = n2 / nt;
        res.innerHTML = `X1: ${x1.toFixed(2)} | X2: ${x2.toFixed(2)}`;
    }
}

// 5. Densidade e PPM (Partes por Milhão)
function calcDensidadePPM() {
    const m = parseFloat(document.getElementById('m_total').value);
    const v = parseFloat(document.getElementById('v_total').value);
    const res = document.getElementById('resDensPPM');

    if (m && v) {
        let d = m / v;
        let ppm = (m / (v * 1000)) * 1000000; // Simplificado para g/mL
        res.innerHTML = `D: ${d.toFixed(2)} g/mL | PPM: ${ppm.toFixed(0)}`;
    }
}

// 6. Conversor Kelvin
function convertTemp() {
    const c = parseFloat(document.getElementById('celsius').value);
    const res = document.getElementById('resTemp');
    if (!isNaN(c)) {
        res.innerHTML = `Kelvin: ${(c + 273.15).toFixed(2)} K`;
    }
}
