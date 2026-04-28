// ============================================
// HUB BRAIN — CALCULADORA DE QUÍMICA
// ============================================

const CALCULADORAS = [
    // ─── SOLUÇÕES ───────────────────────────
    {
        id: 'concentracao_comum',
        cat: 'solucao',
        nome: 'Concentração Comum (C)',
        formula: 'C = m / V',
        emoji: '🧪',
        desc: 'Calcula a concentração em g/L da solução',
        campos: [
            { id: 'massa', label: 'Massa do Soluto', placeholder: 'Ex: 50', unidade: 'g' },
            { id: 'volume', label: 'Volume da Solução', placeholder: 'Ex: 0.5', unidade: 'L' },
        ],
        calcular(v) {
            const m = parseFloat(v.massa), vol = parseFloat(v.volume);
            if (!m || !vol) return null;
            return { valor: (m / vol).toFixed(4), unidade: 'g/L', extra: `C = ${m}g ÷ ${vol}L = ${(m/vol).toFixed(4)} g/L` };
        }
    },
    {
        id: 'molaridade',
        cat: 'solucao',
        nome: 'Molaridade (M)',
        formula: 'M = n / V',
        emoji: '⚗️',
        desc: 'Concentração em mol/L (molaridade)',
        campos: [
            { id: 'mols', label: 'Quantidade de Matéria', placeholder: 'Ex: 2', unidade: 'mol' },
            { id: 'volume', label: 'Volume da Solução', placeholder: 'Ex: 1', unidade: 'L' },
        ],
        calcular(v) {
            const n = parseFloat(v.mols), vol = parseFloat(v.volume);
            if (!n || !vol) return null;
            return { valor: (n / vol).toFixed(4), unidade: 'mol/L', extra: `M = ${n} mol ÷ ${vol} L = ${(n/vol).toFixed(4)} mol/L` };
        }
    },
    {
        id: 'diluicao',
        cat: 'solucao',
        nome: 'Diluição (C₁V₁ = C₂V₂)',
        formula: 'C₁V₁ = C₂V₂',
        emoji: '💧',
        desc: 'Calcula concentração ou volume após diluição',
        campos: [
            { id: 'c1', label: 'Concentração Inicial (C₁)', placeholder: 'Ex: 2', unidade: 'mol/L' },
            { id: 'v1', label: 'Volume Inicial (V₁)', placeholder: 'Ex: 0.5', unidade: 'L' },
            { id: 'v2', label: 'Volume Final (V₂)', placeholder: 'Ex: 2', unidade: 'L' },
        ],
        calcular(v) {
            const c1 = parseFloat(v.c1), v1 = parseFloat(v.v1), v2 = parseFloat(v.v2);
            if (!c1 || !v1 || !v2) return null;
            const c2 = (c1 * v1) / v2;
            return { valor: c2.toFixed(4), unidade: 'mol/L', extra: `C₂ = (${c1} × ${v1}) ÷ ${v2} = ${c2.toFixed(4)} mol/L` };
        }
    },
    {
        id: 'soluto_solucao',
        cat: 'solucao',
        nome: 'Massa do Soluto',
        formula: 'm = C × V',
        emoji: '⚖️',
        desc: 'Calcula a massa do soluto a partir de C e V',
        campos: [
            { id: 'conc', label: 'Concentração (C)', placeholder: 'Ex: 20', unidade: 'g/L' },
            { id: 'vol', label: 'Volume da Solução', placeholder: 'Ex: 0.25', unidade: 'L' },
        ],
        calcular(v) {
            const c = parseFloat(v.conc), vol = parseFloat(v.vol);
            if (!c || !vol) return null;
            return { valor: (c * vol).toFixed(4), unidade: 'g', extra: `m = ${c} g/L × ${vol} L = ${(c*vol).toFixed(4)} g` };
        }
    },
    {
        id: 'fracao_molar',
        cat: 'solucao',
        nome: 'Fração Molar',
        formula: 'x = n_A / (n_A + n_B)',
        emoji: '📊',
        desc: 'Fração molar de um componente na mistura',
        campos: [
            { id: 'na', label: 'Moles do Componente A', placeholder: 'Ex: 2', unidade: 'mol' },
            { id: 'nb', label: 'Moles do Componente B', placeholder: 'Ex: 8', unidade: 'mol' },
        ],
        calcular(v) {
            const na = parseFloat(v.na), nb = parseFloat(v.nb);
            if (isNaN(na) || isNaN(nb)) return null;
            const total = na + nb;
            const xA = na / total, xB = nb / total;
            return { valor: xA.toFixed(4), unidade: '(adimensional)', extra: `x_A = ${na}/(${na}+${nb}) = ${xA.toFixed(4)}\nx_B = ${xB.toFixed(4)}\nx_A + x_B = ${(xA+xB).toFixed(4)}` };
        }
    },
    {
        id: 'osmolaridade',
        cat: 'solucao',
        nome: 'Pressão Osmótica (π)',
        formula: 'π = MRT',
        emoji: '🌊',
        desc: 'Pressão osmótica de uma solução',
        campos: [
            { id: 'mol', label: 'Molaridade (M)', placeholder: 'Ex: 0.1', unidade: 'mol/L' },
            { id: 'temp', label: 'Temperatura', placeholder: 'Ex: 25', unidade: '°C' },
        ],
        calcular(v) {
            const M = parseFloat(v.mol), T = parseFloat(v.temp) + 273.15;
            if (!M || isNaN(T)) return null;
            const pi = M * 0.0821 * T;
            return { valor: pi.toFixed(4), unidade: 'atm', extra: `π = ${M} × 0,0821 × ${T.toFixed(2)} K = ${pi.toFixed(4)} atm` };
        }
    },

    // ─── MOL & MASSA ────────────────────────
    {
        id: 'mol_massa',
        cat: 'mol',
        nome: 'Mol ↔ Massa',
        formula: 'n = m / M',
        emoji: '⚛️',
        desc: 'Converte entre mol e massa usando MM',
        campos: [
            { id: 'massa', label: 'Massa', placeholder: 'Ex: 36', unidade: 'g' },
            { id: 'mm', label: 'Massa Molar (M)', placeholder: 'Ex: 18 para H₂O', unidade: 'g/mol' },
        ],
        calcular(v) {
            const m = parseFloat(v.massa), M = parseFloat(v.mm);
            if (!m || !M) return null;
            const n = m / M;
            return { valor: n.toFixed(4), unidade: 'mol', extra: `n = ${m}g ÷ ${M}g/mol = ${n.toFixed(4)} mol\n→ ${(n * 6.022e23).toExponential(3)} moléculas` };
        }
    },
    {
        id: 'massa_molar_calc',
        cat: 'mol',
        nome: 'Massa a partir de Mols',
        formula: 'm = n × M',
        emoji: '🔢',
        desc: 'Calcula massa a partir de mols e MM',
        campos: [
            { id: 'n', label: 'Quantidade de Matéria (n)', placeholder: 'Ex: 3', unidade: 'mol' },
            { id: 'mm', label: 'Massa Molar (M)', placeholder: 'Ex: 44', unidade: 'g/mol' },
        ],
        calcular(v) {
            const n = parseFloat(v.n), M = parseFloat(v.mm);
            if (!n || !M) return null;
            return { valor: (n * M).toFixed(4), unidade: 'g', extra: `m = ${n} mol × ${M} g/mol = ${(n*M).toFixed(4)} g` };
        }
    },
    {
        id: 'avogadro',
        cat: 'mol',
        nome: 'Número de Partículas',
        formula: 'N = n × Nₐ',
        emoji: '🔬',
        desc: 'Calcula o número de átomos/moléculas',
        campos: [
            { id: 'n', label: 'Quantidade de Matéria', placeholder: 'Ex: 2', unidade: 'mol' },
        ],
        calcular(v) {
            const n = parseFloat(v.n);
            if (!n) return null;
            const N = n * 6.022e23;
            return { valor: N.toExponential(3), unidade: 'partículas', extra: `N = ${n} × 6,022×10²³ = ${N.toExponential(3)} partículas` };
        }
    },
    {
        id: 'rendimento',
        cat: 'mol',
        nome: 'Rendimento de Reação',
        formula: 'η = (m_real / m_teórica) × 100',
        emoji: '📈',
        desc: 'Calcula o rendimento percentual da reação',
        campos: [
            { id: 'mreal', label: 'Massa Real Obtida', placeholder: 'Ex: 8', unidade: 'g' },
            { id: 'mteo', label: 'Massa Teórica Esperada', placeholder: 'Ex: 10', unidade: 'g' },
        ],
        calcular(v) {
            const mr = parseFloat(v.mreal), mt = parseFloat(v.mteo);
            if (!mr || !mt) return null;
            const rend = (mr / mt) * 100;
            return { valor: rend.toFixed(2), unidade: '%', extra: `η = (${mr} ÷ ${mt}) × 100 = ${rend.toFixed(2)}%` };
        }
    },
    {
        id: 'estequiometria',
        cat: 'mol',
        nome: 'Estequiometria Simples',
        formula: 'n₁/coef₁ = n₂/coef₂',
        emoji: '⚖️',
        desc: 'Calcula mols de produto a partir de reagente',
        campos: [
            { id: 'n1', label: 'Mols do Reagente (n₁)', placeholder: 'Ex: 4', unidade: 'mol' },
            { id: 'coef1', label: 'Coeficiente Reagente', placeholder: 'Ex: 2', unidade: '' },
            { id: 'coef2', label: 'Coeficiente Produto', placeholder: 'Ex: 1', unidade: '' },
            { id: 'mm2', label: 'Massa Molar do Produto', placeholder: 'Ex: 44', unidade: 'g/mol' },
        ],
        calcular(v) {
            const n1 = parseFloat(v.n1), c1 = parseFloat(v.coef1), c2 = parseFloat(v.coef2), M2 = parseFloat(v.mm2);
            if (!n1 || !c1 || !c2 || !M2) return null;
            const n2 = (n1 * c2) / c1;
            const m2 = n2 * M2;
            return { valor: n2.toFixed(4), unidade: 'mol', extra: `n₂ = (${n1} × ${c2}) ÷ ${c1} = ${n2.toFixed(4)} mol\nMassa produto = ${m2.toFixed(4)} g` };
        }
    },

    // ─── GASES ──────────────────────────────
    {
        id: 'gas_ideal',
        cat: 'gas',
        nome: 'Lei dos Gases Ideais',
        formula: 'PV = nRT',
        emoji: '💨',
        desc: 'Relaciona P, V, n, T de um gás ideal',
        campos: [
            { id: 'incognita', label: 'Calcular', placeholder: '', tipo: 'select', opcoes: ['Pressão (P)','Volume (V)','Mols (n)','Temperatura (T)'] },
            { id: 'p', label: 'Pressão (P)', placeholder: 'Ex: 1', unidade: 'atm' },
            { id: 'v', label: 'Volume (V)', placeholder: 'Ex: 22.4', unidade: 'L' },
            { id: 'n', label: 'Quantidade (n)', placeholder: 'Ex: 1', unidade: 'mol' },
            { id: 't', label: 'Temperatura (T)', placeholder: 'Ex: 25', unidade: '°C' },
        ],
        calcular(v) {
            const R = 0.0821;
            const P = parseFloat(v.p), V = parseFloat(v.v), n = parseFloat(v.n);
            const T = parseFloat(v.t) + 273.15;
            const inc = v.incognita;
            if (inc === 'Pressão (P)') {
                if (!V || !n || isNaN(T)) return null;
                const p = (n * R * T) / V;
                return { valor: p.toFixed(4), unidade: 'atm', extra: `P = nRT/V = (${n}×${R}×${T.toFixed(2)})/${V} = ${p.toFixed(4)} atm` };
            } else if (inc === 'Volume (V)') {
                if (!P || !n || isNaN(T)) return null;
                const vol = (n * R * T) / P;
                return { valor: vol.toFixed(4), unidade: 'L', extra: `V = nRT/P = (${n}×${R}×${T.toFixed(2)})/${P} = ${vol.toFixed(4)} L` };
            } else if (inc === 'Mols (n)') {
                if (!P || !V || isNaN(T)) return null;
                const mols = (P * V) / (R * T);
                return { valor: mols.toFixed(4), unidade: 'mol', extra: `n = PV/RT = (${P}×${V})/(${R}×${T.toFixed(2)}) = ${mols.toFixed(4)} mol` };
            } else {
                if (!P || !V || !n) return null;
                const temp = (P * V) / (n * R);
                return { valor: (temp - 273.15).toFixed(2), unidade: '°C', extra: `T = PV/nR = (${P}×${V})/(${n}×${R}) = ${temp.toFixed(2)} K = ${(temp-273.15).toFixed(2)} °C` };
            }
        }
    },
    {
        id: 'lei_boyle',
        cat: 'gas',
        nome: 'Lei de Boyle (T constante)',
        formula: 'P₁V₁ = P₂V₂',
        emoji: '🔵',
        desc: 'Pressão e volume a temperatura constante',
        campos: [
            { id: 'p1', label: 'Pressão Inicial (P₁)', placeholder: 'Ex: 2', unidade: 'atm' },
            { id: 'v1', label: 'Volume Inicial (V₁)', placeholder: 'Ex: 5', unidade: 'L' },
            { id: 'p2', label: 'Pressão Final (P₂)', placeholder: 'Ex: 5', unidade: 'atm' },
        ],
        calcular(v) {
            const p1 = parseFloat(v.p1), v1 = parseFloat(v.v1), p2 = parseFloat(v.p2);
            if (!p1 || !v1 || !p2) return null;
            const v2 = (p1 * v1) / p2;
            return { valor: v2.toFixed(4), unidade: 'L', extra: `V₂ = P₁V₁/P₂ = (${p1}×${v1})/${p2} = ${v2.toFixed(4)} L` };
        }
    },
    {
        id: 'lei_charles',
        cat: 'gas',
        nome: 'Lei de Charles (P constante)',
        formula: 'V₁/T₁ = V₂/T₂',
        emoji: '🟡',
        desc: 'Volume e temperatura a pressão constante',
        campos: [
            { id: 'v1', label: 'Volume Inicial (V₁)', placeholder: 'Ex: 10', unidade: 'L' },
            { id: 't1', label: 'Temperatura Inicial (T₁)', placeholder: 'Ex: 27', unidade: '°C' },
            { id: 't2', label: 'Temperatura Final (T₂)', placeholder: 'Ex: 127', unidade: '°C' },
        ],
        calcular(v) {
            const v1 = parseFloat(v.v1), t1 = parseFloat(v.t1)+273.15, t2 = parseFloat(v.t2)+273.15;
            if (!v1 || isNaN(t1) || isNaN(t2)) return null;
            const v2 = (v1 * t2) / t1;
            return { valor: v2.toFixed(4), unidade: 'L', extra: `V₂ = V₁T₂/T₁ = (${v1}×${t2.toFixed(0)})/${t1.toFixed(0)} = ${v2.toFixed(4)} L` };
        }
    },
    {
        id: 'lei_gay_lussac',
        cat: 'gas',
        nome: 'Lei de Gay-Lussac (V constante)',
        formula: 'P₁/T₁ = P₂/T₂',
        emoji: '🔴',
        desc: 'Pressão e temperatura a volume constante',
        campos: [
            { id: 'p1', label: 'Pressão Inicial (P₁)', placeholder: 'Ex: 1', unidade: 'atm' },
            { id: 't1', label: 'Temperatura Inicial (T₁)', placeholder: 'Ex: 27', unidade: '°C' },
            { id: 't2', label: 'Temperatura Final (T₂)', placeholder: 'Ex: 127', unidade: '°C' },
        ],
        calcular(v) {
            const p1 = parseFloat(v.p1), t1 = parseFloat(v.t1)+273.15, t2 = parseFloat(v.t2)+273.15;
            if (!p1 || isNaN(t1) || isNaN(t2)) return null;
            const p2 = (p1 * t2) / t1;
            return { valor: p2.toFixed(4), unidade: 'atm', extra: `P₂ = P₁T₂/T₁ = (${p1}×${t2.toFixed(0)})/${t1.toFixed(0)} = ${p2.toFixed(4)} atm` };
        }
    },
    {
        id: 'lei_combinada',
        cat: 'gas',
        nome: 'Lei Combinada dos Gases',
        formula: 'P₁V₁/T₁ = P₂V₂/T₂',
        emoji: '🌀',
        desc: 'Relaciona P, V e T em dois estados diferentes',
        campos: [
            { id: 'p1', label: 'P₁', placeholder: 'Ex: 1', unidade: 'atm' },
            { id: 'v1', label: 'V₁', placeholder: 'Ex: 22.4', unidade: 'L' },
            { id: 't1', label: 'T₁', placeholder: 'Ex: 0', unidade: '°C' },
            { id: 'p2', label: 'P₂', placeholder: 'Ex: 2', unidade: 'atm' },
            { id: 't2', label: 'T₂', placeholder: 'Ex: 100', unidade: '°C' },
        ],
        calcular(v) {
            const p1=parseFloat(v.p1), v1=parseFloat(v.v1), t1=parseFloat(v.t1)+273.15;
            const p2=parseFloat(v.p2), t2=parseFloat(v.t2)+273.15;
            if (!p1||!v1||isNaN(t1)||!p2||isNaN(t2)) return null;
            const v2 = (p1*v1*t2)/(t1*p2);
            return { valor: v2.toFixed(4), unidade: 'L', extra: `V₂ = (P₁V₁T₂)/(T₁P₂) = ${v2.toFixed(4)} L` };
        }
    },
    {
        id: 'volume_molar',
        cat: 'gas',
        nome: 'Volume Molar (CNTP/CTN)',
        formula: 'V = n × 22,4',
        emoji: '📦',
        desc: 'Volume ocupado pelo gás em CNTP (0°C, 1atm)',
        campos: [
            { id: 'n', label: 'Quantidade de Matéria', placeholder: 'Ex: 3', unidade: 'mol' },
            { id: 'cond', label: 'Condição', placeholder: '', tipo: 'select', opcoes: ['CNTP (22,4 L/mol)', 'CTN (22,7 L/mol)'] },
        ],
        calcular(v) {
            const n = parseFloat(v.n);
            if (!n) return null;
            const vm = v.cond === 'CTN (22,7 L/mol)' ? 22.7 : 22.4;
            const vol = n * vm;
            return { valor: vol.toFixed(4), unidade: 'L', extra: `V = ${n} mol × ${vm} L/mol = ${vol.toFixed(4)} L` };
        }
    },

    // ─── TERMOQUÍMICA ───────────────────────
    {
        id: 'entalpia',
        cat: 'termoquimica',
        nome: 'Variação de Entalpia (ΔH)',
        formula: 'ΔH = ΣΔHf(prod) − ΣΔHf(reag)',
        emoji: '🔥',
        desc: 'Calcula ΔH pela lei de Hess (somas)',
        campos: [
            { id: 'hprod', label: 'Soma ΔHf Produtos', placeholder: 'Ex: -393.5', unidade: 'kJ/mol' },
            { id: 'hreag', label: 'Soma ΔHf Reagentes', placeholder: 'Ex: 0', unidade: 'kJ/mol' },
        ],
        calcular(v) {
            const hp = parseFloat(v.hprod), hr = parseFloat(v.hreag);
            if (isNaN(hp) || isNaN(hr)) return null;
            const dh = hp - hr;
            const tipo = dh < 0 ? '(Exotérmica — libera calor)' : '(Endotérmica — absorve calor)';
            return { valor: dh.toFixed(2), unidade: 'kJ/mol', extra: `ΔH = ${hp} − (${hr}) = ${dh.toFixed(2)} kJ/mol\n${tipo}` };
        }
    },
    {
        id: 'calor_especifico',
        cat: 'termoquimica',
        nome: 'Calor Sensível (Q)',
        formula: 'Q = m × c × ΔT',
        emoji: '🌡️',
        desc: 'Quantidade de calor trocada sem mudança de fase',
        campos: [
            { id: 'massa', label: 'Massa', placeholder: 'Ex: 100', unidade: 'g' },
            { id: 'c', label: 'Calor Específico (c)', placeholder: '1 para água', unidade: 'cal/(g·°C)' },
            { id: 'ti', label: 'Temperatura Inicial', placeholder: 'Ex: 20', unidade: '°C' },
            { id: 'tf', label: 'Temperatura Final', placeholder: 'Ex: 80', unidade: '°C' },
        ],
        calcular(v) {
            const m=parseFloat(v.massa), c=parseFloat(v.c), ti=parseFloat(v.ti), tf=parseFloat(v.tf);
            if (!m||!c||isNaN(ti)||isNaN(tf)) return null;
            const dT = tf - ti, Q = m * c * dT;
            return { valor: Q.toFixed(2), unidade: 'cal', extra: `Q = ${m} × ${c} × ${dT} = ${Q.toFixed(2)} cal\n= ${(Q/1000).toFixed(4)} kcal\n= ${(Q*4.184).toFixed(2)} J` };
        }
    },
    {
        id: 'calor_latente',
        cat: 'termoquimica',
        nome: 'Calor Latente (mudança de fase)',
        formula: 'Q = m × L',
        emoji: '❄️',
        desc: 'Calor para mudança de fase sem variação de T',
        campos: [
            { id: 'massa', label: 'Massa', placeholder: 'Ex: 200', unidade: 'g' },
            { id: 'l', label: 'Calor Latente (L)', placeholder: '80 fusão / 540 vap. água', unidade: 'cal/g' },
        ],
        calcular(v) {
            const m = parseFloat(v.massa), L = parseFloat(v.l);
            if (!m || !L) return null;
            const Q = m * L;
            return { valor: Q.toFixed(2), unidade: 'cal', extra: `Q = ${m} g × ${L} cal/g = ${Q.toFixed(2)} cal\n= ${(Q/1000).toFixed(4)} kcal` };
        }
    },
    {
        id: 'energia_ligacao',
        cat: 'termoquimica',
        nome: 'Energia de Ligação (ΔH)',
        formula: 'ΔH = ΣE(quebradas) − ΣE(formadas)',
        emoji: '⚡',
        desc: 'ΔH pela energia das ligações quebradas e formadas',
        campos: [
            { id: 'eq', label: 'Energia Ligações Quebradas', placeholder: 'Ex: 1000', unidade: 'kJ/mol' },
            { id: 'ef', label: 'Energia Ligações Formadas', placeholder: 'Ex: 1400', unidade: 'kJ/mol' },
        ],
        calcular(v) {
            const eq = parseFloat(v.eq), ef = parseFloat(v.ef);
            if (isNaN(eq) || isNaN(ef)) return null;
            const dh = eq - ef;
            return { valor: dh.toFixed(2), unidade: 'kJ/mol', extra: `ΔH = ${eq} − ${ef} = ${dh.toFixed(2)} kJ/mol\n${dh < 0 ? 'Exotérmica' : 'Endotérmica'}` };
        }
    },

    // ─── CINÉTICA ───────────────────────────
    {
        id: 'velocidade_media',
        cat: 'cinetica',
        nome: 'Velocidade Média de Reação',
        formula: 'v = Δ[C] / Δt',
        emoji: '⚡',
        desc: 'Variação da concentração ao longo do tempo',
        campos: [
            { id: 'c1', label: 'Concentração Inicial', placeholder: 'Ex: 2', unidade: 'mol/L' },
            { id: 'c2', label: 'Concentração Final', placeholder: 'Ex: 0.5', unidade: 'mol/L' },
            { id: 'dt', label: 'Intervalo de Tempo (Δt)', placeholder: 'Ex: 10', unidade: 's' },
        ],
        calcular(v) {
            const c1=parseFloat(v.c1), c2=parseFloat(v.c2), dt=parseFloat(v.dt);
            if (isNaN(c1)||isNaN(c2)||!dt) return null;
            const vel = Math.abs(c2 - c1) / dt;
            return { valor: vel.toFixed(6), unidade: 'mol/(L·s)', extra: `v = |${c2} − ${c1}| / ${dt} = ${vel.toFixed(6)} mol/(L·s)` };
        }
    },
    {
        id: 'arrhenius',
        cat: 'cinetica',
        nome: 'Velocidade Média de Reação',
        formula: 'v = Δ[C] / Δt',
        emoji: '⚡',
        desc: 'Variação da concentração ao longo do tempo',
        campos: [
            { id: 'c1', label: 'Concentração Inicial', placeholder: 'Ex: 2', unidade: 'mol/L' },
            { id: 'c2', label: 'Concentração Final', placeholder: 'Ex: 0.5', unidade: 'mol/L' },
            { id: 'dt', label: 'Intervalo de Tempo (Δt)', placeholder: 'Ex: 10', unidade: 's' },
        ],
        calcular(v) {
            const c1=parseFloat(v.c1), c2=parseFloat(v.c2), dt=parseFloat(v.dt);
            if (isNaN(c1)||isNaN(c2)||!dt) return null;
            const vel = Math.abs(c2 - c1) / dt;
            return { valor: vel.toFixed(6), unidade: 'mol/(L·s)', extra: `v = |${c2} − ${c1}| / ${dt} = ${vel.toFixed(6)} mol/(L·s)` };
        }
    },
    {
        id: 'arrhenius',
        cat: 'cinetica',
        nome: 'Equação de Arrhenius (k)',
        formula: 'k = A·e^(-Ea/RT)',
        emoji: '📉',
        desc: 'Constante de velocidade em função da temperatura',
        campos: [
            { id: 'a', label: 'Fator de Frequência (A)', placeholder: 'Ex: 1e13', unidade: '' },
            { id: 'ea', label: 'Energia de Ativação (Ea)', placeholder: 'Ex: 50000', unidade: 'J/mol' },
            { id: 't', label: 'Temperatura', placeholder: 'Ex: 25', unidade: '°C' },
        ],
        calcular(v) {
            const A = parseFloat(v.a), Ea = parseFloat(v.ea), T = parseFloat(v.t)+273.15;
            const R = 8.314;
            if (!A || !Ea || isNaN(T)) return null;
            const k = A * Math.exp(-Ea / (R * T));
            return { valor: k.toExponential(4), unidade: 's⁻¹', extra: `k = ${A} × e^(-${Ea}/(8,314×${T.toFixed(2)})) = ${k.toExponential(4)}` };
        }
    },

    // ─── ELETROQUÍMICA ──────────────────────
    {
        id: 'lei_faraday',
        cat: 'eletro',
        nome: 'Lei de Faraday (massa depositada)',
        formula: 'm = (M × i × t) / (n × F)',
        emoji: '⚡',
        desc: 'Massa de substância depositada na eletrólise',
        campos: [
            { id: 'mm', label: 'Massa Molar (M)', placeholder: 'Ex: 63.5 para Cu', unidade: 'g/mol' },
            { id: 'i', label: 'Corrente (i)', placeholder: 'Ex: 2', unidade: 'A' },
            { id: 't', label: 'Tempo (t)', placeholder: 'Ex: 3600', unidade: 's' },
            { id: 'n', label: 'Nº de elétrons (n)', placeholder: 'Ex: 2', unidade: '' },
        ],
        calcular(v) {
            const M=parseFloat(v.mm), i=parseFloat(v.i), t=parseFloat(v.t), n=parseFloat(v.n);
            const F = 96500;
            if (!M||!i||!t||!n) return null;
            const m = (M * i * t) / (n * F);
            return { valor: m.toFixed(4), unidade: 'g', extra: `m = (${M}×${i}×${t})/(${n}×96500) = ${m.toFixed(4)} g` };
        }
    },
    {
        id: 'ddp_pilha',
        cat: 'eletro',
        nome: 'DDP da Pilha (ΔE°)',
        formula: 'ΔE° = E°cátodo − E°ânodo',
        emoji: '🔋',
        desc: 'Diferença de potencial padrão de uma pilha',
        campos: [
            { id: 'ecatodo', label: 'Potencial do Cátodo (E°)', placeholder: 'Ex: +0.34', unidade: 'V' },
            { id: 'eanodo', label: 'Potencial do Ânodo (E°)', placeholder: 'Ex: -0.76', unidade: 'V' },
        ],
        calcular(v) {
            const ec = parseFloat(v.ecatodo), ea = parseFloat(v.eanodo);
            if (isNaN(ec) || isNaN(ea)) return null;
            const ddp = ec - ea;
            const espontanea = ddp > 0 ? 'Espontânea ✓' : 'Não espontânea ✗';
            return { valor: ddp.toFixed(4), unidade: 'V', extra: `ΔE° = ${ec} − (${ea}) = ${ddp.toFixed(4)} V\n${espontanea}` };
        }
    },
    {
        id: 'energia_gibbs',
        cat: 'eletro',
        nome: 'Energia de Gibbs (ΔG)',
        formula: 'ΔG = −nFΔE°',
        emoji: '🔋',
        desc: 'Energia livre de Gibbs a partir da DDP',
        campos: [
            { id: 'n', label: 'Nº de elétrons transferidos', placeholder: 'Ex: 2', unidade: '' },
            { id: 'ddp', label: 'DDP da pilha (ΔE°)', placeholder: 'Ex: 1.1', unidade: 'V' },
        ],
        calcular(v) {
            const n = parseFloat(v.n), ddp = parseFloat(v.ddp);
            const F = 96500;
            if (!n || isNaN(ddp)) return null;
            const dG = -(n * F * ddp);
            return { valor: dG.toFixed(2), unidade: 'J/mol', extra: `ΔG = −${n}×96500×${ddp} = ${dG.toFixed(2)} J/mol\n= ${(dG/1000).toFixed(4)} kJ/mol\n${dG < 0 ? 'Espontânea ✓' : 'Não espontânea ✗'}` };
        }
    },

    // ─── ÁCIDO/BASE ─────────────────────────
    {
        id: 'ph_acido',
        cat: 'acido',
        nome: 'pH de Ácido Forte',
        formula: 'pH = −log[H⁺]',
        emoji: '🟢',
        desc: 'Calcula o pH de ácidos fortes (α=1)',
        campos: [
            { id: 'conc', label: 'Concentração [H⁺]', placeholder: 'Ex: 0.01', unidade: 'mol/L' },
        ],
        calcular(v) {
            const c = parseFloat(v.conc);
            if (!c || c <= 0) return null;
            const pH = -Math.log10(c);
            const tipo = pH < 7 ? 'Ácido' : pH > 7 ? 'Básico' : 'Neutro';
            return { valor: pH.toFixed(4), unidade: '(adimensional)', extra: `pH = −log(${c}) = ${pH.toFixed(4)}\n${tipo}` };
        }
    },
    {
        id: 'poh',
        cat: 'acido',
        nome: 'pOH e pH de Base Forte',
        formula: 'pOH = −log[OH⁻] | pH + pOH = 14',
        emoji: '🔵',
        desc: 'Calcula pOH e pH de bases fortes',
        campos: [
            { id: 'conc', label: 'Concentração [OH⁻]', placeholder: 'Ex: 0.001', unidade: 'mol/L' },
        ],
        calcular(v) {
            const c = parseFloat(v.conc);
            if (!c || c <= 0) return null;
            const pOH = -Math.log10(c);
            const pH = 14 - pOH;
            return { valor: pH.toFixed(4), unidade: '(pH)', extra: `pOH = −log(${c}) = ${pOH.toFixed(4)}\npH = 14 − ${pOH.toFixed(4)} = ${pH.toFixed(4)}\n${pH > 7 ? 'Básico' : 'Ácido'}` };
        }
    },
    {
        id: 'ph_fraco',
        cat: 'acido',
        nome: 'pH de Ácido Fraco (Ka)',
        formula: '[H⁺] = √(Ka × C)',
        emoji: '🟡',
        desc: 'pH aproximado de ácido fraco com grau de ionização pequeno',
        campos: [
            { id: 'ka', label: 'Constante de Acidez (Ka)', placeholder: 'Ex: 1.8e-5', unidade: '' },
            { id: 'conc', label: 'Concentração Inicial', placeholder: 'Ex: 0.1', unidade: 'mol/L' },
        ],
        calcular(v) {
            const Ka = parseFloat(v.ka), C = parseFloat(v.conc);
            if (!Ka || !C) return null;
            const H = Math.sqrt(Ka * C);
            const pH = -Math.log10(H);
            const alpha = (H / C) * 100;
            return { valor: pH.toFixed(4), unidade: '(pH)', extra: `[H⁺] = √(${Ka}×${C}) = ${H.toExponential(4)}\npH = ${pH.toFixed(4)}\nGrau de ionização α ≈ ${alpha.toFixed(2)}%` };
        }
    },
    {
        id: 'henderson',
        cat: 'acido',
        nome: 'Henderson-Hasselbalch (Buffer)',
        formula: 'pH = pKa + log([A⁻]/[HA])',
        emoji: '⚗️',
        desc: 'pH de solução tampão',
        campos: [
            { id: 'pka', label: 'pKa do Ácido', placeholder: 'Ex: 4.75', unidade: '' },
            { id: 'base', label: 'Concentração da Base Conjugada [A⁻]', placeholder: 'Ex: 0.1', unidade: 'mol/L' },
            { id: 'acido', label: 'Concentração do Ácido [HA]', placeholder: 'Ex: 0.1', unidade: 'mol/L' },
        ],
        calcular(v) {
            const pKa = parseFloat(v.pka), A = parseFloat(v.base), HA = parseFloat(v.acido);
            if (isNaN(pKa) || !A || !HA) return null;
            const pH = pKa + Math.log10(A / HA);
            return { valor: pH.toFixed(4), unidade: '(pH)', extra: `pH = ${pKa} + log(${A}/${HA}) = ${pKa} + ${Math.log10(A/HA).toFixed(4)} = ${pH.toFixed(4)}` };
        }
    },

    // ─── MISTURAS ───────────────────────────
    {
        id: 'mistura_mesma',
        cat: 'mistura',
        nome: 'Mistura de Soluções (mesma substância)',
        formula: 'Cf = (C₁V₁ + C₂V₂) / (V₁ + V₂)',
        emoji: '🔀',
        desc: 'Concentração final ao misturar duas soluções do mesmo soluto',
        campos: [
            { id: 'c1', label: 'Concentração 1 (C₁)', placeholder: 'Ex: 2', unidade: 'mol/L' },
            { id: 'v1', label: 'Volume 1 (V₁)', placeholder: 'Ex: 1', unidade: 'L' },
            { id: 'c2', label: 'Concentração 2 (C₂)', placeholder: 'Ex: 0.5', unidade: 'mol/L' },
            { id: 'v2', label: 'Volume 2 (V₂)', placeholder: 'Ex: 3', unidade: 'L' },
        ],
        calcular(v) {
            const c1=parseFloat(v.c1), v1=parseFloat(v.v1), c2=parseFloat(v.c2), v2=parseFloat(v.v2);
            if (!c1||!v1||isNaN(c2)||!v2) return null;
            const cf = (c1*v1 + c2*v2) / (v1+v2);
            return { valor: cf.toFixed(4), unidade: 'mol/L', extra: `Cf = (${c1}×${v1} + ${c2}×${v2})/(${v1}+${v2}) = ${cf.toFixed(4)} mol/L\nVf = ${v1+v2} L` };
        }
    },
    {
        id: 'porc_massa',
        cat: 'mistura',
        nome: 'Porcentagem em Massa (%m/m)',
        formula: '%m/m = (m_soluto / m_solução) × 100',
        emoji: '📏',
        desc: 'Concentração percentual em massa',
        campos: [
            { id: 'msoluto', label: 'Massa do Soluto', placeholder: 'Ex: 20', unidade: 'g' },
            { id: 'msolucao', label: 'Massa da Solução', placeholder: 'Ex: 200', unidade: 'g' },
        ],
        calcular(v) {
            const ms = parseFloat(v.msoluto), mt = parseFloat(v.msolucao);
            if (!ms || !mt) return null;
            const pct = (ms/mt)*100;
            return { valor: pct.toFixed(4), unidade: '%', extra: `%m/m = (${ms}/${mt}) × 100 = ${pct.toFixed(4)}%\nSolvente = ${mt-ms} g` };
        }
    },
    {
        id: 'porc_volume',
        cat: 'mistura',
        nome: 'Porcentagem em Volume (%v/v)',
        formula: '%v/v = (V_soluto / V_solução) × 100',
        emoji: '🧴',
        desc: 'Concentração percentual em volume',
        campos: [
            { id: 'vsoluto', label: 'Volume do Soluto', placeholder: 'Ex: 50', unidade: 'mL' },
            { id: 'vsolucao', label: 'Volume da Solução', placeholder: 'Ex: 500', unidade: 'mL' },
        ],
        calcular(v) {
            const vs = parseFloat(v.vsoluto), vt = parseFloat(v.vsolucao);
            if (!vs || !vt) return null;
            const pct = (vs/vt)*100;
            return { valor: pct.toFixed(4), unidade: '%', extra: `%v/v = (${vs}/${vt}) × 100 = ${pct.toFixed(4)}%` };
        }
    },
    {
        id: 'densidade',
        cat: 'mistura',
        nome: 'Densidade (d)',
        formula: 'd = m / V',
        emoji: '⚖️',
        desc: 'Densidade de uma substância ou solução',
        campos: [
            { id: 'massa', label: 'Massa', placeholder: 'Ex: 100', unidade: 'g' },
            { id: 'volume', label: 'Volume', placeholder: 'Ex: 80', unidade: 'mL' },
        ],
        calcular(v) {
            const m = parseFloat(v.massa), vol = parseFloat(v.volume);
            if (!m || !vol) return null;
            const d = m/vol;
            return { valor: d.toFixed(4), unidade: 'g/mL', extra: `d = ${m}g / ${vol}mL = ${d.toFixed(4)} g/mL` };
        }
    },
    {
        id: 'regra_mistura',
        cat: 'mistura',
        nome: 'Regra da Mistura (Balança)',
        formula: 'mA/mB = |C − CA| / |C − CB|',
        emoji: '⚖️',
        desc: 'Proporção de duas soluções para atingir concentração desejada',
        campos: [
            { id: 'ca', label: 'Concentração Solução A (CA)', placeholder: 'Ex: 80', unidade: '%' },
            { id: 'cb', label: 'Concentração Solução B (CB)', placeholder: 'Ex: 20', unidade: '%' },
            { id: 'cf', label: 'Concentração Desejada (C)', placeholder: 'Ex: 50', unidade: '%' },
        ],
        calcular(v) {
            const ca=parseFloat(v.ca), cb=parseFloat(v.cb), cf=parseFloat(v.cf);
            if (isNaN(ca)||isNaN(cb)||isNaN(cf)) return null;
            if (cf < Math.min(ca,cb) || cf > Math.max(ca,cb)) return { erro: 'Concentração desejada deve estar entre CA e CB' };
            const pA = Math.abs(cf - cb), pB = Math.abs(cf - ca);
            const total = pA + pB;
            return { valor: `${pA}:${pB}`, unidade: '(A:B)', extra: `Partes de A = ${pA}\nPartes de B = ${pB}\n%A = ${((pA/total)*100).toFixed(2)}%\n%B = ${((pB/total)*100).toFixed(2)}%` };
        }
    },
];

// ─── ESTADO ───────────────────────────────
let catAtiva = 'todas';
let buscaAtiva = '';

// ─── RENDER LISTA ─────────────────────────
function renderLista() {
    const container = document.getElementById('lista-calculadoras');
    const busca = buscaAtiva.toLowerCase();

    let lista = CALCULADORAS.filter(c => {
        const matchCat = catAtiva === 'todas' || c.cat === catAtiva;
        const matchBusca = !busca || c.nome.toLowerCase().includes(busca) || c.formula.toLowerCase().includes(busca) || c.desc.toLowerCase().includes(busca);
        return matchCat && matchBusca;
    });

    if (lista.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-emoji">🔍</span>Nenhum cálculo encontrado</div>`;
        return;
    }

    // Agrupa por categoria se estiver em "todas"
    if (catAtiva === 'todas' && !busca) {
        const grupos = {};
        const nomes = { solucao:'Soluções', mol:'Mol & Massa', gas:'Gases', termoquimica:'Termoquímica', cinetica:'Cinética Química', eletro:'Eletroquímica', acido:'Ácido / Base', mistura:'Misturas & % Conc.' };
        lista.forEach(c => {
            if (!grupos[c.cat]) grupos[c.cat] = [];
            grupos[c.cat].push(c);
        });
        container.innerHTML = Object.entries(grupos).map(([cat, items], gi) =>
            `<div class="grupo-titulo">${nomes[cat] || cat}</div>` +
            items.map((c, i) => cardHTML(c, gi*100+i)).join('')
        ).join('');
    } else {
        container.innerHTML = lista.map((c, i) => cardHTML(c, i)).join('');
    }

    if (window.lucide) lucide.createIcons();
}

function cardHTML(c, idx) {
    return `<div class="calc-card" onclick="abrirCalc('${c.id}')" style="animation-delay:${idx*0.03}s">
        <div class="calc-icon">${c.emoji}</div>
        <div class="calc-info">
            <div class="calc-nome">${c.nome}</div>
            <div class="calc-formula">${c.formula}</div>
        </div>
        <div class="calc-arrow">→</div>
    </div>`;
}

// ─── FILTROS ──────────────────────────────
window.filtrarCategoria = function(el, cat) {
    catAtiva = cat;
    buscaAtiva = '';
    document.getElementById('busca-calc').value = '';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderLista();
};

window.filtrarCalculos = function() {
    buscaAtiva = document.getElementById('busca-calc').value;
    if (buscaAtiva) {
        catAtiva = 'todas';
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        document.querySelector('.cat-pill').classList.add('active');
    }
    renderLista();
};

// ─── ABRIR CALCULADORA ────────────────────
window.abrirCalc = function(id) {
    const calc = CALCULADORAS.find(c => c.id === id);
    if (!calc) return;

    const campos = calc.campos.map(campo => {
        if (campo.tipo === 'select') {
            return `<div class="input-group">
                <label class="input-label">${campo.label}</label>
                <select class="calc-input" id="f_${campo.id}">
                    ${campo.opcoes.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
            </div>`;
        }
        return `<div class="input-group">
            <label class="input-label">${campo.label}${campo.unidade ? ` <span style="color:#333;">(${campo.unidade})</span>` : ''}</label>
            <input type="number" inputmode="decimal" step="any" class="calc-input" id="f_${campo.id}" placeholder="${campo.placeholder}" oninput="calcularAoDigitar('${id}')">
        </div>`;
    });

    // Agrupa em pares
    const pares = [];
    for (let i = 0; i < campos.length; i += 2) {
        if (campos[i+1]) {
            pares.push(`<div class="input-row">${campos[i]}${campos[i+1]}</div>`);
        } else {
            pares.push(`<div class="input-row">${campos[i]}</div>`);
        }
    }

    document.getElementById('modal-content').innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-header">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">${calc.emoji}</span>
                <span class="modal-nome">${calc.nome}</span>
            </div>
            <button class="btn-fechar-modal" onclick="fecharCalc()">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="modal-body">
            <div class="formula-box">
                <div class="formula-texto">${calc.formula}</div>
                <div class="formula-desc">${calc.desc}</div>
            </div>

            <div class="input-section">
                ${pares.join('')}
            </div>

            <div class="resultado-box" id="resultado-box">
                <div class="resultado-label">RESULTADO</div>
                <div class="resultado-valor" id="resultado-valor">—</div>
                <div class="resultado-unidade" id="resultado-unidade"></div>
                <div class="resultado-extra" id="resultado-extra" style="white-space:pre-line;"></div>
            </div>

            <button class="btn-calcular" onclick="executarCalculo('${id}')">
                <i data-lucide="calculator" style="width:16px;height:16px;"></i>
                CALCULAR
            </button>
            <button class="btn-limpar" onclick="limparCalculo('${id}')">Limpar</button>
        </div>
    `;

    document.getElementById('modal-calc').style.display = 'flex';
    if (window.lucide) lucide.createIcons();
};

window.fecharCalc = function() {
    document.getElementById('modal-calc').style.display = 'none';
};

// Fecha ao clicar fora
document.getElementById('modal-calc').addEventListener('click', function(e) {
    if (e.target === this) fecharCalc();
});

// ─── CALCULAR ─────────────────────────────
function getValores(calc) {
    const v = {};
    calc.campos.forEach(campo => {
        const el = document.getElementById('f_' + campo.id);
        if (el) v[campo.id] = el.tagName === 'SELECT' ? el.value : el.value;
    });
    return v;
}

window.executarCalculo = function(id) {
    const calc = CALCULADORAS.find(c => c.id === id);
    if (!calc) return;
    const v = getValores(calc);
    const res = calc.calcular(v);
    const box = document.getElementById('resultado-box');

    if (!res) {
        box.className = 'resultado-box erro sucesso';
        document.getElementById('resultado-valor').innerText = 'Preencha todos os campos';
        document.getElementById('resultado-unidade').innerText = '';
        document.getElementById('resultado-extra').innerText = '';
        return;
    }
    if (res.erro) {
        box.className = 'resultado-box erro sucesso';
        document.getElementById('resultado-valor').innerText = res.erro;
        document.getElementById('resultado-unidade').innerText = '';
        document.getElementById('resultado-extra').innerText = '';
        return;
    }

    box.className = 'resultado-box sucesso';
    document.getElementById('resultado-valor').innerText = res.valor;
    document.getElementById('resultado-unidade').innerText = res.unidade || '';
    document.getElementById('resultado-extra').innerText = res.extra || '';
};

window.calcularAoDigitar = function(id) {
    const calc = CALCULADORAS.find(c => c.id === id);
    if (!calc) return;
    const v = getValores(calc);
    const temValores = Object.values(v).some(x => x !== '');
    if (!temValores) return;
    executarCalculo(id);
};

window.limparCalculo = function(id) {
    const calc = CALCULADORAS.find(c => c.id === id);
    if (!calc) return;
    calc.campos.forEach(campo => {
        const el = document.getElementById('f_' + campo.id);
        if (el && el.tagName !== 'SELECT') el.value = '';
    });
    const box = document.getElementById('resultado-box');
    box.className = 'resultado-box';
};

// ─── INIT ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderLista();
    if (window.lucide) lucide.createIcons();
});
