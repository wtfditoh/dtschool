// --- LÓGICA HUBBRAIN QUÍMICA ---

[span_11](start_span)[span_12](start_span)// Molaridade (NaCl 2.925g em 250mL MM 58.5)[span_11](end_span)[span_12](end_span)
function calcMolaridade() {
    const m = parseFloat(document.getElementById('mol_m').value);
    const mm = parseFloat(document.getElementById('mol_mm').value);
    const v = parseFloat(document.getElementById('mol_v').value);
    const res = document.getElementById('resMolar');

    if (m && mm && v) {
        let v_litro = (v >= 10) ? v / 1000 : v; [span_13](start_span)// Converte mL para L automaticamente[span_13](end_span)
        let M = m / (mm * v_litro);
        [span_14](start_span)res.innerHTML = `Fórmula: M = ${m} / (${mm} * ${v_litro}) <br><strong>M = ${M.toFixed(3)} mol/L</strong>[span_14](end_span)`;
    } else { res.innerHTML = "Preencha todos os campos!"; }
}

[span_15](start_span)[span_16](start_span)[span_17](start_span)// Número de Mols (NaOH 4g MM 40 / Glicose 90g MM 180)[span_15](end_span)[span_16](end_span)[span_17](end_span)
function calcMols() {
    const m = parseFloat(document.getElementById('n_massa').value);
    const mm = parseFloat(document.getElementById('n_mm').value);
    const res = document.getElementById('resMols');

    if (m && mm) {
        let n = m / mm;
        [span_18](start_span)res.innerHTML = `Fórmula: n = ${m} / ${mm} <br><strong>n = ${n.toFixed(3)} mol</strong>[span_18](end_span)`;
    } else { res.innerHTML = "Insira massa e massa molar!"; }
}

[span_19](start_span)// Concentração Comum (12g em 0.5L)[span_19](end_span)
function calcComum() {
    const m = parseFloat(document.getElementById('c_m').value);
    const v = parseFloat(document.getElementById('c_v').value);
    const res = document.getElementById('resComum');

    if (m && v) {
        let v_litro = (v >= 10) ? v / 1000 : v;
        let c = m / v_litro;
        [span_20](start_span)res.innerHTML = `Fórmula: C = ${m} / ${v_litro} <br><strong>C = ${c.toFixed(2)} g/L</strong>[span_20](end_span)`;
    } else { res.innerHTML = "Preencha os campos!"; }
}

[span_21](start_span)// Título e Porcentagem[span_21](end_span)
function calcTitulo() {
    const v1 = parseFloat(document.getElementById('t_v1').value);
    const vt = parseFloat(document.getElementById('t_vt').value);
    const res = document.getElementById('resTitulo');

    if (v1 && vt) {
        let t = v1 / vt;
        [span_22](start_span)res.innerHTML = `T = ${t.toFixed(2)} <br><strong>Porcentagem: ${(t * 100).toFixed(1)}%</strong>[span_22](end_span)`;
    }
}

// pH
function calcPH() {
    const h = parseFloat(document.getElementById('ph_h').value);
    const res = document.getElementById('resPH');

    if (h > 0) {
        let ph = -Math.log10(h);
        res.innerHTML = `<strong>pH = ${ph.toFixed(2)}</strong> <br> ${ph < 7 ? 'Meio Ácido' : 'Meio Básico'}`;
    }
}
