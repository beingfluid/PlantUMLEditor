let plantumlRender = null;

const editor = document.getElementById('editor');
const previewOutput = document.getElementById('preview-output');
const previewPlaceholder = document.getElementById('preview-placeholder');
const previewError = document.getElementById('preview-error');
const btnRender = document.getElementById('btn-render');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const fileInput = document.getElementById('file-input');
const selectExample = document.getElementById('select-example');
const divider = document.getElementById('divider');
const status = document.getElementById('status');

let currentFileName = 'diagram.plantuml';

let currentSvg = '';

async function loadPlantUML() {
    status.textContent = 'Loading engine...';
    try {
        const module = await import('./lib/plantuml.js');
        plantumlRender = module.render;
        status.textContent = 'Ready (local rendering)';
    } catch (err) {
        status.textContent = 'Load failed';
        console.error('Failed to load PlantUML engine:', err);
    }
}

const examples = {
    sequence: `@startuml
title Sequence Diagram Example

actor User
participant "Web App" as App
participant "API Server" as API
database "Database" as DB

User -> App: Login Request
App -> API: POST /auth/login
API -> DB: Query user credentials
DB --> API: User record
API --> App: JWT Token
App --> User: Login Success

User -> App: Fetch Dashboard
App -> API: GET /dashboard (JWT)
API -> DB: Query data
DB --> API: Dashboard data
API --> App: JSON response
App --> User: Render dashboard
@enduml`,

    class: `@startuml
title Class Diagram Example

abstract class Animal {
    - name: String
    - age: int
    + getName(): String
    + makeSound(): void
}

class Dog extends Animal {
    - breed: String
    + fetch(): void
    + makeSound(): void
}

class Cat extends Animal {
    - indoor: boolean
    + purr(): void
    + makeSound(): void
}

interface Trainable {
    + train(command: String): boolean
}

Dog ..|> Trainable

class Owner {
    - name: String
    - pets: List<Animal>
    + addPet(pet: Animal): void
}

Owner "1" --> "*" Animal : owns
@enduml`,

    activity: `@startuml
title Order Processing

start
:Receive Order;

if (Payment Valid?) then (yes)
    :Process Payment;
    if (In Stock?) then (yes)
        :Pick Items;
        :Pack Order;
        :Ship Order;
        :Send Confirmation Email;
    else (no)
        :Notify Backorder;
        :Add to Waiting List;
    endif
else (no)
    :Reject Order;
    :Send Payment Failed Email;
endif

stop
@enduml`,

    component: `@startuml
title System Architecture

package "Frontend" {
    [React SPA] as spa
    [Mobile App] as mobile
}

package "API Gateway" {
    [Kong Gateway] as gateway
}

package "Microservices" {
    [Auth Service] as auth
    [User Service] as users
    [Order Service] as orders
    [Notification Service] as notify
}

package "Data Layer" {
    database "PostgreSQL" as pg
    database "Redis Cache" as redis
    queue "RabbitMQ" as mq
}

spa --> gateway
mobile --> gateway

gateway --> auth
gateway --> users
gateway --> orders

auth --> redis
users --> pg
orders --> pg
orders --> mq
mq --> notify
@enduml`,

    state: `@startuml
title Order State Machine

[*] --> Draft

Draft --> Submitted : submit()
Draft --> Cancelled : cancel()

Submitted --> Processing : payment_received()
Submitted --> Cancelled : cancel()

Processing --> Shipped : ship()
Processing --> Refunded : refund()

Shipped --> Delivered : confirm_delivery()
Shipped --> Returned : return_request()

Delivered --> [*]
Returned --> Refunded : process_return()
Refunded --> [*]
Cancelled --> [*]
@enduml`,

    usecase: `@startuml
title E-Commerce Use Cases

left to right direction

actor Customer
actor Admin
actor "Payment Provider" as PP

rectangle "E-Commerce System" {
    usecase "Browse Products" as UC1
    usecase "Add to Cart" as UC2
    usecase "Checkout" as UC3
    usecase "Process Payment" as UC4
    usecase "Track Order" as UC5
    usecase "Manage Products" as UC6
    usecase "View Reports" as UC7
}

Customer --> UC1
Customer --> UC2
Customer --> UC3
Customer --> UC5
UC3 --> UC4
UC4 --> PP

Admin --> UC6
Admin --> UC7
@enduml`
};

function applyDiagramTheme() {
    const svg = previewOutput.querySelector('svg');
    if (!svg) return;

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        text { fill: #2d0f23 !important; }
        line { stroke: #e20074 !important; }
        path[fill="none"] { fill: none !important; stroke: #e20074 !important; }
        path:not([fill="none"]) { fill: #e20074 !important; }
        polygon[fill="#000000"], polygon[fill="black"] { fill: #e20074 !important; stroke: #e20074 !important; }
        polygon:not([fill="#000000"]):not([fill="black"]) { fill: #fce4f0 !important; stroke: #e20074 !important; }
        rect[fill="#FEFECE"], rect[fill="#fefece"], rect[fill="#FBFB77"], rect[fill="#fbfb77"] { fill: #fce4f0 !important; stroke: #e20074 !important; }
        rect[fill="#FFFFFF"], rect[fill="#ffffff"], rect[fill="white"] { fill: #ffffff !important; stroke: #4a1942 !important; }
        ellipse[fill="#000000"], ellipse[fill="black"] { fill: #e20074 !important; stroke: #e20074 !important; }
        ellipse:not([fill="#000000"]):not([fill="black"]) { fill: #fce4f0 !important; stroke: #e20074 !important; }
        circle[fill="#000000"], circle[fill="black"] { fill: #e20074 !important; stroke: #e20074 !important; }
        circle:not([fill="#000000"]):not([fill="black"]) { fill: #fce4f0 !important; stroke: #e20074 !important; }
    `;
    svg.insertBefore(style, svg.firstChild);
}

function doRender() {
    const text = editor.value.trim();
    if (!text) return;

    if (!plantumlRender) {
        status.textContent = 'Engine not loaded yet...';
        return;
    }

    previewOutput.innerHTML = '';

    btnRender.textContent = '...';
    btnRender.disabled = true;
    status.textContent = 'Rendering...';
    previewError.classList.add('hidden');

    const lines = text.split('\n');

    plantumlRender(lines, 'preview-output');

    const checkRendered = setInterval(() => {
        const svg = previewOutput.querySelector('svg');
        if (svg) {
            clearInterval(checkRendered);
            currentSvg = previewOutput.innerHTML;
            applyDiagramTheme();
            previewOutput.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            previewError.classList.add('hidden');
            status.textContent = 'Rendered (local)';
            btnRender.textContent = 'Render';
            btnRender.disabled = false;
        }
    }, 100);

    setTimeout(() => {
        clearInterval(checkRendered);
        if (!previewOutput.querySelector('svg')) {
            previewOutput.style.display = 'none';
            previewPlaceholder.style.display = 'none';
            previewError.classList.remove('hidden');
            previewError.textContent = 'Render timed out. Check your PlantUML syntax.';
            status.textContent = 'Error';
            btnRender.textContent = 'Render';
            btnRender.disabled = false;
        }
    }, 30000);
}

btnRender.addEventListener('click', doRender);

btnCopy.addEventListener('click', async () => {
    if (!currentSvg) return;
    try {
        await navigator.clipboard.writeText(currentSvg);
        btnCopy.textContent = 'Copied!';
        setTimeout(() => btnCopy.textContent = 'Copy SVG', 1500);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = currentSvg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btnCopy.textContent = 'Copied!';
        setTimeout(() => btnCopy.textContent = 'Copy SVG', 1500);
    }
});

btnDownload.addEventListener('click', () => {
    if (!currentSvg) return;
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
});

// Open file
btnOpen.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.value = ev.target.result;
        saveContent();
        doRender();
        status.textContent = `Opened: ${file.name}`;
    };
    reader.readAsText(file);
    fileInput.value = '';
});

// Save file
btnSave.addEventListener('click', () => {
    const text = editor.value;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
    status.textContent = `Saved: ${currentFileName}`;
});

selectExample.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && examples[key]) {
        editor.value = examples[key];
        selectExample.value = '';
        doRender();
    }
});

editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doRender();
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
    }
});

// Resizable divider
let isDragging = false;

divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const main = document.querySelector('main');
    const rect = main.getBoundingClientRect();
    const editorPane = document.querySelector('.editor-pane');
    const previewPane = document.querySelector('.preview-pane');

    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(Math.max(percentage, 20), 80);

    editorPane.style.flex = 'none';
    editorPane.style.width = `calc(${clamped}% - 2px)`;
    previewPane.style.flex = 'none';
    previewPane.style.width = `calc(${100 - clamped}% - 2px)`;
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        divider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Auto-save to localStorage
const STORAGE_KEY = 'plantuml-editor-content';

function saveContent() {
    localStorage.setItem(STORAGE_KEY, editor.value);
}

function loadContent() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        editor.value = saved;
    }
}

let renderTimeout = null;

editor.addEventListener('input', () => {
    saveContent();
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(doRender, 500);
});

loadContent();

// Load engine then auto-render
loadPlantUML().then(() => {
    if (editor.value.trim()) {
        doRender();
    }
});
