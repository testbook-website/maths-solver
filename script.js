// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and target content
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// --- Basic Calculator Logic ---
let currentExpr = '';

function updateBasicDisplay() {
    document.getElementById('basic-expr').innerText = currentExpr;
}

function basicAction(action) {
    const resDisplay = document.getElementById('basic-res');
    
    if (action === 'AC') {
        currentExpr = '';
        resDisplay.innerText = '0';
        updateBasicDisplay();
        return;
    }
    
    if (action === 'DEL') {
        currentExpr = currentExpr.slice(0, -1);
        updateBasicDisplay();
        return;
    }
    
    if (action === '=') {
        try {
            if (!currentExpr) return;
            // Extremely basic evaluation. In production, use a math parser.
            const result = eval(currentExpr);
            // Format to avoid long decimals
            resDisplay.innerText = Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
        } catch (e) {
            resDisplay.innerText = 'Error';
        }
        return;
    }
    
    currentExpr += action;
    updateBasicDisplay();
}

// --- Utils to display results ---
function showResult(elementId, html, isError = false) {
    const el = document.getElementById(elementId);
    el.innerHTML = html;
    el.style.display = 'block';
    if (isError) {
        el.classList.add('error');
    } else {
        el.classList.remove('error');
    }
}

// --- Algebra Logic ---
function changeAlgebra() {
    const alg = document.getElementById('algebra-select').value;
    document.getElementById('alg-quadratic').classList.add('hidden');
    document.getElementById('alg-linear').classList.add('hidden');
    document.getElementById('alg-distance').classList.add('hidden');
    document.getElementById('alg-midpoint').classList.add('hidden');
    
    document.getElementById(`alg-${alg}`).classList.remove('hidden');
    
    // Hide all previous results
    document.getElementById('quad-res').style.display = 'none';
    document.getElementById('lin-res').style.display = 'none';
    document.getElementById('dist-res').style.display = 'none';
    document.getElementById('mid-res').style.display = 'none';
}

function solveQuadratic() {
    const a = parseFloat(document.getElementById('quad-a').value);
    const b = parseFloat(document.getElementById('quad-b').value);
    const c = parseFloat(document.getElementById('quad-c').value);

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
        showResult('quad-res', 'Please enter all values (a, b, c).', true);
        return;
    }

    if (a === 0) {
        showResult('quad-res', 'If a=0, it is not a quadratic equation.', true);
        return;
    }

    const delta = b * b - 4 * a * c;
    if (delta > 0) {
        const x1 = (-b + Math.sqrt(delta)) / (2 * a);
        const x2 = (-b - Math.sqrt(delta)) / (2 * a);
        showResult('quad-res', `Two Real Roots:<br>x₁ = ${x1.toFixed(4)}<br>x₂ = ${x2.toFixed(4)}`);
    } else if (delta === 0) {
        const x = -b / (2 * a);
        showResult('quad-res', `One Real Root:<br>x = ${x.toFixed(4)}`);
    } else {
        const real = (-b / (2 * a)).toFixed(4);
        const imag = (Math.sqrt(-delta) / (2 * a)).toFixed(4);
        showResult('quad-res', `Complex Roots:<br>x₁ = ${real} + ${imag}i<br>x₂ = ${real} - ${imag}i`);
    }
}

function solveLinear() {
    const a1 = parseFloat(document.getElementById('lin-a1').value);
    const b1 = parseFloat(document.getElementById('lin-b1').value);
    const c1 = parseFloat(document.getElementById('lin-c1').value);
    const a2 = parseFloat(document.getElementById('lin-a2').value);
    const b2 = parseFloat(document.getElementById('lin-b2').value);
    const c2 = parseFloat(document.getElementById('lin-c2').value);

    if ([a1,b1,c1,a2,b2,c2].some(isNaN)) {
        showResult('lin-res', 'Please enter all values.', true);
        return;
    }

    const det = a1 * b2 - a2 * b1;
    if (det === 0) {
        showResult('lin-res', 'No unique solution.', true);
    } else {
        const x = (c1 * b2 - c2 * b1) / det;
        const y = (a1 * c2 - a2 * c1) / det;
        showResult('lin-res', `x = ${x.toFixed(4)}<br>y = ${y.toFixed(4)}`);
    }
}

function solveDistance() {
    const x1 = parseFloat(document.getElementById('dist-x1').value);
    const y1 = parseFloat(document.getElementById('dist-y1').value);
    const x2 = parseFloat(document.getElementById('dist-x2').value);
    const y2 = parseFloat(document.getElementById('dist-y2').value);

    if ([x1,y1,x2,y2].some(isNaN)) {
        showResult('dist-res', 'Please enter all coordinates.', true);
        return;
    }

    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    showResult('dist-res', `Distance = ${dist.toFixed(4)}`);
}

function solveMidpoint() {
    const x1 = parseFloat(document.getElementById('mid-x1').value);
    const y1 = parseFloat(document.getElementById('mid-y1').value);
    const x2 = parseFloat(document.getElementById('mid-x2').value);
    const y2 = parseFloat(document.getElementById('mid-y2').value);

    if ([x1,y1,x2,y2].some(isNaN)) {
        showResult('mid-res', 'Please enter all coordinates.', true);
        return;
    }

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    showResult('mid-res', `Midpoint = (${mx.toFixed(4)}, ${my.toFixed(4)})`);
}

// --- Trigonometry Logic ---
let angleMode = 'deg';

function setAngleMode(mode) {
    angleMode = mode;
    document.getElementById('deg-btn').classList.toggle('active', mode === 'deg');
    document.getElementById('rad-btn').classList.toggle('active', mode === 'rad');
}

function calcTrig(op) {
    const val = parseFloat(document.getElementById('trig-input').value);
    if (isNaN(val)) {
        showResult('trig-res', 'Enter a valid number.', true);
        return;
    }

    let result = 0;
    const isDeg = angleMode === 'deg';
    const inputRad = isDeg ? val * (Math.PI / 180) : val;

    switch(op) {
        case 'sin': result = Math.sin(inputRad); break;
        case 'cos': result = Math.cos(inputRad); break;
        case 'tan': 
            if (isDeg && val % 180 === 90) {
                showResult('trig-res', 'Undefined', true);
                return;
            }
            result = Math.tan(inputRad); 
            break;
        case 'asin': 
            if(val < -1 || val > 1) { showResult('trig-res', 'Domain Error', true); return; }
            result = Math.asin(val); 
            break;
        case 'acos': 
            if(val < -1 || val > 1) { showResult('trig-res', 'Domain Error', true); return; }
            result = Math.acos(val); 
            break;
        case 'atan': 
            result = Math.atan(val); 
            break;
    }

    if (op.startsWith('a') && isDeg) {
        result = result * (180 / Math.PI);
    }

    if (Math.abs(result) < 1e-10) result = 0;
    
    showResult('trig-res', `${op}(${val}) = <strong>${parseFloat(result.toFixed(6))}</strong>`);
}

// --- Geometry Logic ---
function changeShape() {
    const shape = document.getElementById('shape-select').value;
    ['circle', 'rectangle', 'triangle', 'sphere', 'cylinder', 'cube'].forEach(s => {
        document.getElementById(`geom-${s}`).classList.add('hidden');
    });
    
    document.getElementById(`geom-${shape}`).classList.remove('hidden');
    document.getElementById('geom-res').style.display = 'none';
}

function calcGeometry() {
    const shape = document.getElementById('shape-select').value;
    let resHtml = '';

    if (shape === 'circle') {
        const r = parseFloat(document.getElementById('circ-r').value);
        if (isNaN(r) || r < 0) { showResult('geom-res', 'Invalid Radius', true); return; }
        resHtml = `Area: ${(Math.PI * r * r).toFixed(4)}<br>Circumference: ${(2 * Math.PI * r).toFixed(4)}`;
    } 
    else if (shape === 'rectangle') {
        const w = parseFloat(document.getElementById('rect-w').value);
        const h = parseFloat(document.getElementById('rect-h').value);
        if (isNaN(w) || isNaN(h) || w < 0 || h < 0) { showResult('geom-res', 'Invalid Dimensions', true); return; }
        resHtml = `Area: ${(w * h).toFixed(4)}<br>Perimeter: ${(2 * (w + h)).toFixed(4)}`;
    }
    else if (shape === 'triangle') {
        const b = parseFloat(document.getElementById('tri-b').value);
        const h = parseFloat(document.getElementById('tri-h').value);
        if (isNaN(b) || isNaN(h) || b < 0 || h < 0) { showResult('geom-res', 'Invalid Dimensions', true); return; }
        resHtml = `Area: ${(0.5 * b * h).toFixed(4)}<br><small>Perimeter requires 3 side lengths.</small>`;
    }
    else if (shape === 'sphere') {
        const r = parseFloat(document.getElementById('sphere-r').value);
        if (isNaN(r) || r < 0) { showResult('geom-res', 'Invalid Radius', true); return; }
        resHtml = `Volume: ${((4/3) * Math.PI * Math.pow(r, 3)).toFixed(4)}<br>Surface Area: ${(4 * Math.PI * r * r).toFixed(4)}`;
    }
    else if (shape === 'cylinder') {
        const r = parseFloat(document.getElementById('cyl-r').value);
        const h = parseFloat(document.getElementById('cyl-h').value);
        if (isNaN(r) || isNaN(h) || r < 0 || h < 0) { showResult('geom-res', 'Invalid Dimensions', true); return; }
        resHtml = `Volume: ${(Math.PI * r * r * h).toFixed(4)}<br>Surface Area: ${(2 * Math.PI * r * h + 2 * Math.PI * r * r).toFixed(4)}`;
    }
    else if (shape === 'cube') {
        const s = parseFloat(document.getElementById('cube-s').value);
        if (isNaN(s) || s < 0) { showResult('geom-res', 'Invalid Side', true); return; }
        resHtml = `Volume: ${(Math.pow(s, 3)).toFixed(4)}<br>Surface Area: ${(6 * s * s).toFixed(4)}`;
    }
    
    showResult('geom-res', resHtml);
}
