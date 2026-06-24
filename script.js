// ==========================================
// CONFIGURATION
// ==========================================
// REPLACE THIS URL with the Web App URL generated from the Google Apps Script
const WEB_APP_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// ==========================================
// LOGIN & APP INIT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Check if already logged in (local session)
    if (localStorage.getItem("mathsGuruUser")) {
        showApp();
    }
});

function submitLogin() {
    const name = document.getElementById("login-name").value.trim();
    const email = document.getElementById("login-email").value.trim();
    const phone = document.getElementById("login-phone").value.trim();
    
    if (!name || !email || !phone) {
        document.getElementById("login-error").classList.remove("hidden");
        return;
    }
    
    // Save locally
    localStorage.setItem("mathsGuruUser", JSON.stringify({ name, email, phone }));
    
    // Send to Google Sheets
    if (WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Important to avoid CORS issues without complex headers
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', name: name, email: email, phone: phone })
        }).catch(console.error);
    }
    
    showApp();
}

function showApp() {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("main-app").style.display = "flex";
    
    // Initial fetch of recent searches
    fetchRecentSearches();
    // Initial plot
    drawGraph();
}

// ==========================================
// TAB LOGIC
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        // Redraw graph if graphing tab is clicked (fixes dimension issues)
        if (targetId === 'graphing') setTimeout(drawGraph, 50);
    });
});

// ==========================================
// 1. TESTBOOK MATHS GURU (AI CHAT)
// ==========================================
function handleGptEnter(e) {
    if (e.key === 'Enter') sendGptMessage();
}

function sendGptMessage() {
    const inputEl = document.getElementById('gpt-input');
    const msg = inputEl.value.trim();
    if (!msg) return;

    appendMessage(msg, 'user');
    inputEl.value = '';

    // Log search to Google Sheet
    if (WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search', query: msg })
        }).catch(console.error);
        
        // Refresh recent searches locally immediately for UX
        addRecentSearchLocal(msg);
    } else {
        addRecentSearchLocal(msg);
    }

    setTimeout(() => {
        const response = processMathQuery(msg);
        appendMessage(response, 'bot');
    }, 400);
}

function appendMessage(text, sender) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function processMathQuery(query) {
    if (typeof math === 'undefined') return "Engine loading...";
    const q = query.toLowerCase();
    try {
        if (q.includes('area') && q.includes('circle') && q.includes('radius')) {
            const match = q.match(/\d+(\.\d+)?/);
            if (match) return `Area = <strong>${(Math.PI * Math.pow(parseFloat(match[0]), 2)).toFixed(4)}</strong>`;
        }
        if (q.includes('derivative') || q.includes('derive')) {
            const match = query.match(/(?:derivative of|derive)\s+(.*)/i);
            if (match && match[1]) return `Derivative: <strong>${math.derivative(match[1], 'x').toString()}</strong>`;
        }
        if (q.includes('simplify')) {
            const match = query.match(/simplify\s+(.*)/i);
            if (match && match[1]) return `Simplified: <strong>${math.simplify(match[1]).toString()}</strong>`;
        }
        let cleanQuery = q.replace(/(what is|calculate|solve|evaluate)\s+/gi, '').trim();
        const result = math.evaluate(cleanQuery);
        return `Answer: <strong>${result.toString()}</strong>`;
    } catch (e) {
        return "I can solve mathematical expressions like `250 * 4`, take derivatives (`derivative of x^2`), or simplify algebra. Try asking me a math equation!";
    }
}

// Recent Searches Logic
let localSearches = ["derivative of x^2", "500 * 20", "area of circle radius 5"];

function fetchRecentSearches() {
    if (WEB_APP_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        fetch(WEB_APP_URL + "?action=get_recent")
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.searches.length > 0) {
                    localSearches = data.searches;
                    renderRecentSearches();
                }
            }).catch(err => {
                console.error("Using local recent searches");
                renderRecentSearches();
            });
    } else {
        renderRecentSearches();
    }
}

function addRecentSearchLocal(query) {
    localSearches.unshift(query);
    if (localSearches.length > 5) localSearches.pop();
    renderRecentSearches();
}

function renderRecentSearches() {
    const list = document.getElementById("recent-searches-list");
    list.innerHTML = "";
    localSearches.forEach(s => {
        const li = document.createElement("li");
        li.innerText = "🔍 " + s;
        list.appendChild(li);
    });
}

// ==========================================
// 2. CALCULATORS (Combined)
// ==========================================
function changeCalcCategory() {
    const cat = document.getElementById('calc-category').value;
    document.querySelectorAll('.calc-section').forEach(el => el.classList.add('hidden'));
    
    // Hide all results
    document.querySelectorAll('.result-box').forEach(el => el.style.display = 'none');
    
    document.getElementById(cat).classList.remove('hidden');
}

// Basic Calc
let currentExpr = '';
function updateBasicDisplay() { document.getElementById('basic-expr').innerText = currentExpr; }
function basicAction(action) {
    const resDisplay = document.getElementById('basic-res');
    if (action === 'AC') { currentExpr = ''; resDisplay.innerText = '0'; updateBasicDisplay(); return; }
    if (action === 'DEL') { currentExpr = currentExpr.slice(0, -1); updateBasicDisplay(); return; }
    if (action === '=') {
        try {
            if (!currentExpr) return;
            const result = typeof math !== 'undefined' ? math.evaluate(currentExpr) : eval(currentExpr);
            resDisplay.innerText = Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
        } catch (e) { resDisplay.innerText = 'Error'; }
        return;
    }
    currentExpr += action;
    updateBasicDisplay();
}

// Show Result Helper
function showResult(elementId, html, isError = false) {
    const el = document.getElementById(elementId);
    el.innerHTML = html;
    el.style.display = 'block';
    if (isError) el.classList.add('error'); else el.classList.remove('error');
}

// Algebra
function solveQuadratic() {
    const a = parseFloat(document.getElementById('quad-a').value);
    const b = parseFloat(document.getElementById('quad-b').value);
    const c = parseFloat(document.getElementById('quad-c').value);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return showResult('quad-res', 'Enter all values.', true);
    if (a === 0) return showResult('quad-res', 'Not a quadratic equation.', true);
    const delta = b*b - 4*a*c;
    if (delta > 0) showResult('quad-res', `Roots:<br>x₁ = ${((-b + Math.sqrt(delta))/(2*a)).toFixed(4)}<br>x₂ = ${((-b - Math.sqrt(delta))/(2*a)).toFixed(4)}`);
    else if (delta === 0) showResult('quad-res', `Root:<br>x = ${(-b/(2*a)).toFixed(4)}`);
    else showResult('quad-res', `Complex Roots:<br>x = ${(-b/(2*a)).toFixed(4)} ± ${(Math.sqrt(-delta)/(2*a)).toFixed(4)}i`);
}

function solveLinear() {
    const [a1, b1, c1, a2, b2, c2] = ['lin-a1','lin-b1','lin-c1','lin-a2','lin-b2','lin-c2'].map(id => parseFloat(document.getElementById(id).value));
    if ([a1,b1,c1,a2,b2,c2].some(isNaN)) return showResult('lin-res', 'Enter all values.', true);
    const det = a1*b2 - a2*b1;
    if (det === 0) showResult('lin-res', 'No unique solution.', true);
    else showResult('lin-res', `x = ${((c1*b2 - c2*b1)/det).toFixed(4)}<br>y = ${((a1*c2 - a2*c1)/det).toFixed(4)}`);
}

function solveDistance() {
    const [x1, y1, x2, y2] = ['dist-x1','dist-y1','dist-x2','dist-y2'].map(id => parseFloat(document.getElementById(id).value));
    if ([x1,y1,x2,y2].some(isNaN)) return showResult('dist-res', 'Enter all coordinates.', true);
    showResult('dist-res', `Distance = ${Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)).toFixed(4)}`);
}

function solveMidpoint() {
    const [x1, y1, x2, y2] = ['mid-x1','mid-y1','mid-x2','mid-y2'].map(id => parseFloat(document.getElementById(id).value));
    if ([x1,y1,x2,y2].some(isNaN)) return showResult('mid-res', 'Enter all coordinates.', true);
    showResult('mid-res', `Midpoint = (${((x1+x2)/2).toFixed(4)}, ${((y1+y2)/2).toFixed(4)})`);
}

// Trigo
let angleMode = 'deg';
function setAngleMode(mode) {
    angleMode = mode;
    document.getElementById('deg-btn').classList.toggle('active', mode === 'deg');
    document.getElementById('rad-btn').classList.toggle('active', mode === 'rad');
}
function calcTrig(op) {
    const val = parseFloat(document.getElementById('trig-input').value);
    if (isNaN(val)) return showResult('trig-res', 'Enter valid number.', true);
    const isDeg = angleMode === 'deg';
    const inputRad = isDeg ? val * (Math.PI/180) : val;
    let res = 0;
    switch(op) {
        case 'sin': res = Math.sin(inputRad); break;
        case 'cos': res = Math.cos(inputRad); break;
        case 'tan': if(isDeg && val%180===90) return showResult('trig-res','Undefined',true); res = Math.tan(inputRad); break;
        case 'asin': if(val<-1 || val>1) return showResult('trig-res','Domain Error',true); res = Math.asin(val); break;
        case 'acos': if(val<-1 || val>1) return showResult('trig-res','Domain Error',true); res = Math.acos(val); break;
        case 'atan': res = Math.atan(val); break;
    }
    if (op.startsWith('a') && isDeg) res *= (180/Math.PI);
    if (Math.abs(res) < 1e-10) res = 0;
    showResult('trig-res', `${op}(${val}) = <strong>${parseFloat(res.toFixed(6))}</strong>`);
}

// Geometry
function calcGeometry(shape) {
    let res = '';
    if (shape === 'circle') {
        const r = parseFloat(document.getElementById('circ-r').value);
        if(r<0 || isNaN(r)) return showResult('geom-res','Invalid',true);
        res = `A: ${(Math.PI*r*r).toFixed(4)}<br>C: ${(2*Math.PI*r).toFixed(4)}`;
    } else if (shape === 'rectangle') {
        const [w,h] = [parseFloat(document.getElementById('rect-w').value), parseFloat(document.getElementById('rect-h').value)];
        if(w<0||h<0||isNaN(w)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `A: ${(w*h).toFixed(4)}<br>P: ${(2*(w+h)).toFixed(4)}`;
    } else if (shape === 'triangle') {
        const [b,h] = [parseFloat(document.getElementById('tri-b').value), parseFloat(document.getElementById('tri-h').value)];
        if(b<0||h<0||isNaN(b)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `A: ${(0.5*b*h).toFixed(4)}`;
    } else if (shape === 'sphere') {
        const r = parseFloat(document.getElementById('sphere-r').value);
        if(r<0||isNaN(r)) return showResult('geom-res','Invalid',true);
        res = `V: ${((4/3)*Math.PI*Math.pow(r,3)).toFixed(4)}<br>SA: ${(4*Math.PI*r*r).toFixed(4)}`;
    } else if (shape === 'cylinder') {
        const [r,h] = [parseFloat(document.getElementById('cyl-r').value), parseFloat(document.getElementById('cyl-h').value)];
        if(r<0||h<0||isNaN(r)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `V: ${(Math.PI*r*r*h).toFixed(4)}<br>SA: ${(2*Math.PI*r*h + 2*Math.PI*r*r).toFixed(4)}`;
    } else if (shape === 'cube') {
        const s = parseFloat(document.getElementById('cube-s').value);
        if(s<0||isNaN(s)) return showResult('geom-res','Invalid',true);
        res = `V: ${(Math.pow(s,3)).toFixed(4)}<br>SA: ${(6*s*s).toFixed(4)}`;
    }
    showResult('geom-res', res);
}

// ==========================================
// 3. GRAPHING CALCULATOR
// ==========================================
function drawGraph() {
    const expr = document.getElementById('graph-input').value;
    try {
        const container = document.getElementById('plot-container');
        const width = container.clientWidth - 20;
        
        functionPlot({
            target: '#plot',
            width: width,
            height: 350,
            yAxis: { domain: [-10, 10] },
            xAxis: { domain: [-10, 10] },
            grid: true,
            data: [{ fn: expr, color: '#4f46e5' }]
        });
    } catch (e) {
        console.error("Invalid expression for graphing");
    }
}

// ==========================================
// 4. VERIFY TOOL
// ==========================================
function verifyExpressions() {
    const ex1 = document.getElementById('verify-ex1').value;
    const ex2 = document.getElementById('verify-ex2').value;
    
    if (!ex1 || !ex2) {
        showResult('verify-res', 'Please enter both expressions.', true);
        return;
    }
    
    try {
        const s1 = math.simplify(ex1).toString();
        const s2 = math.simplify(ex2).toString();
        
        if (s1 === s2) {
            showResult('verify-res', '✅ <strong>True!</strong> The expressions are mathematically equivalent.');
        } else {
            showResult('verify-res', '❌ <strong>False!</strong> The expressions are not equivalent.', true);
        }
    } catch (e) {
        showResult('verify-res', 'Error parsing expressions. Use standard math notation.', true);
    }
}

// ==========================================
// 6. WORKSHEETS (PRACTICE)
// ==========================================
let currentWorksheetAnswer = '';

function generateProblem() {
    // Generate simple linear equation: ax + b = c
    const a = Math.floor(Math.random() * 9) + 2; // 2 to 10
    const x = Math.floor(Math.random() * 20) - 10; // -10 to 10
    const b = Math.floor(Math.random() * 20) + 1; // 1 to 20
    const c = (a * x) + b;
    
    document.getElementById('worksheet-problem').innerText = `Solve for x:\n${a}x + ${b} = ${c}`;
    currentWorksheetAnswer = x;
    
    document.getElementById('show-answer-btn').classList.remove('hidden');
    document.getElementById('worksheet-answer').style.display = 'none';
}

function showProblemAnswer() {
    showResult('worksheet-answer', `Answer: <strong>x = ${currentWorksheetAnswer}</strong>`);
    document.getElementById('show-answer-btn').classList.add('hidden');
}
