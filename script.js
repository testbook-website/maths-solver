// ==========================================
// CONFIGURATION
// ==========================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxMQ_1cY4JcSSPIdTfUbn-AA-7FPtpq3qV4JAfZBaVft-Hs-SkeZ96IESvDfPAZOWVM/exec";

// ==========================================
// LOGIN & APP INIT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("mathsGuruUser")) {
        const user = JSON.parse(localStorage.getItem("mathsGuruUser"));
        document.getElementById("user-initials").innerText = user.name.charAt(0).toUpperCase();
        showApp();
    }
    initCarousel();
    setupConverter();
});

function submitLogin() {
    const name = document.getElementById("login-name").value.trim();
    const email = document.getElementById("login-email").value.trim();
    const phone = document.getElementById("login-phone").value.trim();
    
    if (!name || !email || !phone) {
        document.getElementById("login-error").classList.remove("hidden");
        return;
    }
    
    localStorage.setItem("mathsGuruUser", JSON.stringify({ name, email, phone }));
    document.getElementById("user-initials").innerText = name.charAt(0).toUpperCase();
    
    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', name: name, email: email, phone: phone })
    }).catch(console.error);
    
    showApp();
}

function logout() {
    localStorage.removeItem("mathsGuruUser");
    location.reload();
}

function showApp() {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("main-app").style.display = "flex";
    fetchRecentSearches();
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
        
        if (targetId === 'graphing') setTimeout(drawGraph, 50);
        if (targetId === 'sheets') setTimeout(updateCarouselDisplay, 50);
    });
});

// ==========================================
// 1. SMART ASSISTANT (AI CHAT)
// ==========================================
function handleGptEnter(e) { if (e.key === 'Enter') sendGptMessage(); }

function sendGptMessage() {
    const inputEl = document.getElementById('gpt-input');
    const msg = inputEl.value.trim();
    if (!msg) return;

    appendMessage(msg, 'user');
    inputEl.value = '';

    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: msg })
    }).catch(console.error);
    
    addRecentSearchLocal(msg);

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
        if (q.includes('right-angled triangle') || q.includes('right triangle')) {
            const nums = q.match(/\d+(\.\d+)?/g);
            if (nums && nums.length >= 2) {
                const a = parseFloat(nums[0]);
                const b = parseFloat(nums[1]);
                const hyp = Math.sqrt(a*a + b*b);
                return `Using Pythagorean theorem (a² + b² = c²):<br>Hypotenuse = <strong>${hyp.toFixed(4)}</strong>`;
            }
        }
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

let localSearches = ["derivative of x^2", "500 * 20", "area of circle radius 5"];

function fetchRecentSearches() {
    fetch(WEB_APP_URL + "?action=get_recent")
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.searches.length > 0) {
                localSearches = data.searches;
                renderRecentSearches();
            }
        }).catch(err => { renderRecentSearches(); });
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
        li.onclick = () => { document.getElementById('gpt-input').value = s; };
        list.appendChild(li);
    });
}

// ==========================================
// 2. VISUALIZER (GRAPHING)
// ==========================================
function drawGraph() {
    const expr1 = document.getElementById('graph-input').value;
    const expr2 = document.getElementById('graph-input-2').value;
    
    try {
        const container = document.getElementById('plot-container');
        const width = container.clientWidth - 48;
        const height = container.clientHeight - 48;
        
        let plotData = [];
        if (expr1) plotData.push({ fn: expr1, color: '#2563eb' });
        if (expr2) plotData.push({ fn: expr2, color: '#10b981' });

        functionPlot({
            target: '#plot',
            width: width,
            height: height > 300 ? height : 500,
            yAxis: { domain: [-10, 10] },
            xAxis: { domain: [-10, 10] },
            grid: true,
            data: plotData
        });
    } catch (e) {
        console.error("Invalid expression for graphing");
    }
}

window.addEventListener('resize', () => {
    if (document.getElementById('graphing').classList.contains('active')) drawGraph();
});

// ==========================================
// 3. FORMULA CARDS (CAROUSEL)
// ==========================================
let currentSlide = 0;
let totalSlides = 0;

function initCarousel() {
    const cards = document.querySelectorAll('.carousel-card');
    totalSlides = cards.length;
    
    const dotsContainer = document.getElementById('carousel-dots');
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = i === 0 ? 'dot active' : 'dot';
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
    }
    updateCarouselDisplay();
}

function moveCarousel(direction) {
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    if (currentSlide >= totalSlides) currentSlide = 0;
    updateCarouselDisplay();
}

function goToSlide(index) {
    currentSlide = index;
    updateCarouselDisplay();
}

function updateCarouselDisplay() {
    const track = document.getElementById('formula-track');
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    document.querySelectorAll('.dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// ==========================================
// 4. UNIT CONVERTER
// ==========================================
const unitData = {
    length: { Meters: 1, Kilometers: 1000, Centimeters: 0.01, Miles: 1609.34, Yards: 0.9144, Feet: 0.3048, Inches: 0.0254 },
    weight: { Kilograms: 1, Grams: 0.001, Metric_Tons: 1000, Pounds: 0.453592, Ounces: 0.0283495 },
    temperature: { Celsius: 'C', Fahrenheit: 'F', Kelvin: 'K' },
    volume: { Liters: 1, Milliliters: 0.001, Gallons: 3.78541, Quarts: 0.946353, Pints: 0.473176 }
};

function setupConverter() {
    const type = document.getElementById('conv-type').value;
    const fromSelect = document.getElementById('conv-from');
    const toSelect = document.getElementById('conv-to');
    
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    Object.keys(unitData[type]).forEach(unit => {
        fromSelect.add(new Option(unit.replace('_', ' '), unit));
        toSelect.add(new Option(unit.replace('_', ' '), unit));
    });
    
    if(toSelect.options.length > 1) toSelect.selectedIndex = 1;
    calculateConversion();
}

function calculateConversion() {
    const type = document.getElementById('conv-type').value;
    const inputVal = parseFloat(document.getElementById('conv-input').value);
    const fromUnit = document.getElementById('conv-from').value;
    const toUnit = document.getElementById('conv-to').value;
    const outEl = document.getElementById('conv-output');
    
    if (isNaN(inputVal)) { outEl.value = ''; return; }
    
    if (type === 'temperature') {
        let celsius;
        if (fromUnit === 'Celsius') celsius = inputVal;
        else if (fromUnit === 'Fahrenheit') celsius = (inputVal - 32) * 5/9;
        else if (fromUnit === 'Kelvin') celsius = inputVal - 273.15;
        
        let result;
        if (toUnit === 'Celsius') result = celsius;
        else if (toUnit === 'Fahrenheit') result = (celsius * 9/5) + 32;
        else if (toUnit === 'Kelvin') result = celsius + 273.15;
        
        outEl.value = parseFloat(result.toFixed(4));
    } else {
        // Base conversion
        const baseValue = inputVal * unitData[type][fromUnit];
        const result = baseValue / unitData[type][toUnit];
        outEl.value = parseFloat(result.toPrecision(7)); // Handle very small/large nums nicely
    }
}

// ==========================================
// 5. CALCULATORS
// ==========================================
function changeCalcCategory() {
    const cat = document.getElementById('calc-category').value;
    document.querySelectorAll('.calc-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.result-box').forEach(el => el.style.display = 'none');
    document.getElementById(cat).classList.remove('hidden');
}

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

function showResult(elementId, html, isError = false) {
    const el = document.getElementById(elementId);
    el.innerHTML = html;
    el.style.display = 'block';
    if (isError) el.classList.add('error'); else el.classList.remove('error');
}

function solveQuadratic() {
    const [a,b,c] = ['quad-a','quad-b','quad-c'].map(id => parseFloat(document.getElementById(id).value));
    if ([a,b,c].some(isNaN)) return showResult('quad-res', 'Enter all values.', true);
    if (a === 0) return showResult('quad-res', 'Not a quadratic equation.', true);
    const delta = b*b - 4*a*c;
    if (delta > 0) showResult('quad-res', `x₁ = ${((-b + Math.sqrt(delta))/(2*a)).toFixed(4)}<br>x₂ = ${((-b - Math.sqrt(delta))/(2*a)).toFixed(4)}`);
    else if (delta === 0) showResult('quad-res', `x = ${(-b/(2*a)).toFixed(4)}`);
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
    const [x1,y1,x2,y2] = ['dist-x1','dist-y1','dist-x2','dist-y2'].map(id => parseFloat(document.getElementById(id).value));
    if ([x1,y1,x2,y2].some(isNaN)) return showResult('dist-res', 'Enter coordinates.', true);
    showResult('dist-res', `Distance = ${Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)).toFixed(4)}`);
}

function solveMidpoint() {
    const [x1,y1,x2,y2] = ['mid-x1','mid-y1','mid-x2','mid-y2'].map(id => parseFloat(document.getElementById(id).value));
    if ([x1,y1,x2,y2].some(isNaN)) return showResult('mid-res', 'Enter coordinates.', true);
    showResult('mid-res', `Midpoint = (${((x1+x2)/2).toFixed(4)}, ${((y1+y2)/2).toFixed(4)})`);
}

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

function calcGeometry(shape) {
    let res = '';
    if (shape === 'circle') {
        const r = parseFloat(document.getElementById('circ-r').value);
        if(r<0 || isNaN(r)) return showResult('geom-res','Invalid',true);
        res = `Area: ${(Math.PI*r*r).toFixed(4)}<br>Circumference: ${(2*Math.PI*r).toFixed(4)}`;
    } else if (shape === 'rectangle') {
        const [w,h] = [parseFloat(document.getElementById('rect-w').value), parseFloat(document.getElementById('rect-h').value)];
        if(w<0||h<0||isNaN(w)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `Area: ${(w*h).toFixed(4)}<br>Perimeter: ${(2*(w+h)).toFixed(4)}`;
    } else if (shape === 'triangle') {
        const [b,h] = [parseFloat(document.getElementById('tri-b').value), parseFloat(document.getElementById('tri-h').value)];
        if(b<0||h<0||isNaN(b)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `Area: ${(0.5*b*h).toFixed(4)}`;
    } else if (shape === 'sphere') {
        const r = parseFloat(document.getElementById('sphere-r').value);
        if(r<0||isNaN(r)) return showResult('geom-res','Invalid',true);
        res = `Volume: ${((4/3)*Math.PI*Math.pow(r,3)).toFixed(4)}<br>Surface Area: ${(4*Math.PI*r*r).toFixed(4)}`;
    } else if (shape === 'cylinder') {
        const [r,h] = [parseFloat(document.getElementById('cyl-r').value), parseFloat(document.getElementById('cyl-h').value)];
        if(r<0||h<0||isNaN(r)||isNaN(h)) return showResult('geom-res','Invalid',true);
        res = `Volume: ${(Math.PI*r*r*h).toFixed(4)}<br>Surface Area: ${(2*Math.PI*r*h + 2*Math.PI*r*r).toFixed(4)}`;
    } else if (shape === 'cube') {
        const s = parseFloat(document.getElementById('cube-s').value);
        if(s<0||isNaN(s)) return showResult('geom-res','Invalid',true);
        res = `Volume: ${(Math.pow(s,3)).toFixed(4)}<br>Surface Area: ${(6*s*s).toFixed(4)}`;
    }
    showResult('geom-res', res);
}

// ==========================================
// 6. VERIFY TOOL
// ==========================================
function verifyExpressions() {
    const ex1 = document.getElementById('verify-ex1').value;
    const ex2 = document.getElementById('verify-ex2').value;
    
    if (!ex1 || !ex2) { showResult('verify-res', 'Enter both expressions.', true); return; }
    
    try {
        const s1 = math.simplify(ex1).toString();
        const s2 = math.simplify(ex2).toString();
        
        if (s1 === s2) showResult('verify-res', '✅ <strong>True!</strong> Mathematically equivalent.');
        else showResult('verify-res', '❌ <strong>False!</strong> Not equivalent.', true);
    } catch (e) {
        showResult('verify-res', 'Error parsing expressions. Use standard notation.', true);
    }
}

// ==========================================
// 7. WORKSHEETS (PRACTICE)
// ==========================================
let currentWorksheetAnswer = '';
function generateProblem() {
    const a = Math.floor(Math.random() * 9) + 2; 
    const x = Math.floor(Math.random() * 20) - 10; 
    const b = Math.floor(Math.random() * 20) + 1; 
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
