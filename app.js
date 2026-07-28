// ======= DOM REFERENCES =======
let plantumlRender = null;

const editor = document.getElementById('editor');
const previewOutput = document.getElementById('preview-output');
const previewPlaceholder = document.getElementById('preview-placeholder');
const previewError = document.getElementById('preview-error');
const previewPane = document.getElementById('preview-pane');
const previewContainer = document.getElementById('preview-container');
const editorPane = document.getElementById('editor-pane');
const btnRender = document.getElementById('btn-render');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnImportClipboard = document.getElementById('btn-import-clipboard');
const btnCopySource = document.getElementById('btn-copy-source');
const btnClear = document.getElementById('btn-clear');
const btnExportModal = document.getElementById('btn-export-modal');
const btnViewer = document.getElementById('btn-viewer');
const btnVisualEditor = document.getElementById('btn-visual-editor');
const btnWide = document.getElementById('btn-wide');
const fileInput = document.getElementById('file-input');
const selectExample = document.getElementById('select-example');
const divider = document.getElementById('divider');
const status = document.getElementById('status');
const titleField = document.getElementById('title-field');
const dirtyIndicator = document.getElementById('dirty-indicator');

// Viewer mode
const viewerMode = document.getElementById('viewer-mode');
const viewerCanvas = document.getElementById('viewer-canvas');
const viewerContent = document.getElementById('viewer-content');
const viewerZoomLevel = document.getElementById('viewer-zoom-level');
const viewerZoomIn = document.getElementById('viewer-zoom-in');
const viewerZoomOut = document.getElementById('viewer-zoom-out');
const viewerZoomReset = document.getElementById('viewer-zoom-reset');
const viewerExit = document.getElementById('viewer-exit');

// Zoom overlay
const zoomOverlay = document.getElementById('zoom-overlay');
const zoomLevelDisplay = document.getElementById('zoom-level-display');

// Modals
const modalImport = document.getElementById('modal-import');
const importTextarea = document.getElementById('import-textarea');
const importCancel = document.getElementById('import-cancel');
const importConfirm = document.getElementById('import-confirm');
const modalExport = document.getElementById('modal-export');
const exportTextarea = document.getElementById('export-textarea');
const exportCopy = document.getElementById('export-copy');
const exportClose = document.getElementById('export-close');

// Visual editor
const visualEditorPanel = document.getElementById('visual-editor-panel');
const veClose = document.getElementById('ve-close');
const veParticipantName = document.getElementById('ve-participant-name');
const veParticipantAlias = document.getElementById('ve-participant-alias');
const veParticipantType = document.getElementById('ve-participant-type');
const veParticipantColor = document.getElementById('ve-participant-color');
const veAddParticipant = document.getElementById('ve-add-participant');
const veParticipantList = document.getElementById('ve-participant-list');
const veConnFrom = document.getElementById('ve-conn-from');
const veConnArrow = document.getElementById('ve-conn-arrow');
const veConnTo = document.getElementById('ve-conn-to');
const veConnLabel = document.getElementById('ve-conn-label');
const veAddConnection = document.getElementById('ve-add-connection');
const veDividerTitle = document.getElementById('ve-divider-title');
const veAddDivider = document.getElementById('ve-add-divider');
const veEventList = document.getElementById('ve-event-list');
const veGenerate = document.getElementById('ve-generate');

// Toast container
const toastContainer = document.getElementById('toast-container');

// ======= STATE =======
let currentFileName = 'diagram.plantuml';
let currentSvg = '';
let lastSavedContent = '';
let previewZoom = 1;
let viewerZoom = 1;
let viewerPanX = 0;
let viewerPanY = 0;
let isViewerDragging = false;
let viewerDragStart = { x: 0, y: 0 };
let isWideMode = false;
let isVisualEditorOpen = false;

// Visual editor state
let veParticipants = [];
let veEvents = [];
let veSelectedEventIndex = -1;
let veSyncingFromCode = false;
let veSyncingToCode = false;

// ======= TOAST NOTIFICATIONS =======
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 200);
    }, 2000);
}

// ======= PLANTUML ENGINE =======
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

// ======= EXAMPLES =======
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

// ======= DIAGRAM THEME =======
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

// ======= INTERACTIVE DIAGRAM =======
function makeDiagramInteractive(svg) {
    const parsed = parseSequenceDiagram(editor.value);

    // Build participant search strings (handle \n in names)
    const participantSearchTerms = [];
    for (let i = 0; i < parsed.participants.length; i++) {
        const p = parsed.participants[i];
        const terms = [];
        // Full name and alias
        terms.push(p.name);
        if (p.alias && p.alias !== p.name) terms.push(p.alias);
        // Split on \n for multi-line participant names
        if (p.name.includes('\\n')) {
            p.name.split('\\n').forEach(part => {
                const trimmed = part.trim();
                if (trimmed.length > 2) terms.push(trimmed);
            });
        }
        participantSearchTerms.push({ index: i, participant: p, terms });
    }

    // Build message/divider label search
    const eventSearchTerms = [];
    for (let i = 0; i < parsed.events.length; i++) {
        const ev = parsed.events[i];
        const terms = [];
        if (ev.type === 'message' && ev.label) {
            terms.push(ev.label.trim());
            // Also split on \n for multi-line labels
            if (ev.label.includes('\\n')) {
                ev.label.split('\\n').forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed.length > 2) terms.push(trimmed);
                });
            }
        }
        if (ev.type === 'divider' && ev.title) {
            terms.push(ev.title.trim());
        }
        if (terms.length) eventSearchTerms.push({ index: i, terms });
    }

    // Find all shape elements in the header area (rects, circles, ellipses, paths, lines, polygons)
    const allShapes = svg.querySelectorAll('rect, circle, ellipse, path, polygon, line, image');
    const allTexts = Array.from(svg.querySelectorAll('text'));

    // Get Y threshold: participant headers are in the top area
    let headerMaxY = 0;
    for (const t of allTexts) {
        const y = parseFloat(t.getAttribute('y') || 0);
        if (y > headerMaxY && y < 200) headerMaxY = y;
    }
    if (!headerMaxY) headerMaxY = 120;

    // Helper: get the vertical center of any SVG element
    function getElY(el) {
        const tag = el.tagName;
        if (tag === 'rect') return parseFloat(el.getAttribute('y') || 0);
        if (tag === 'circle' || tag === 'ellipse') return parseFloat(el.getAttribute('cy') || 0) - (parseFloat(el.getAttribute('r') || el.getAttribute('ry') || 0));
        if (tag === 'line') return Math.min(parseFloat(el.getAttribute('y1') || 0), parseFloat(el.getAttribute('y2') || 0));
        if (tag === 'polygon' || tag === 'path') {
            const bbox = el.getBBox ? el.getBBox() : null;
            return bbox ? bbox.y : 999;
        }
        if (tag === 'image') return parseFloat(el.getAttribute('y') || 0);
        return 999;
    }

    function getElCenterX(el) {
        const tag = el.tagName;
        if (tag === 'rect' || tag === 'image') return parseFloat(el.getAttribute('x') || 0) + parseFloat(el.getAttribute('width') || 0) / 2;
        if (tag === 'circle') return parseFloat(el.getAttribute('cx') || 0);
        if (tag === 'ellipse') return parseFloat(el.getAttribute('cx') || 0);
        if (tag === 'line') return (parseFloat(el.getAttribute('x1') || 0) + parseFloat(el.getAttribute('x2') || 0)) / 2;
        if (tag === 'polygon' || tag === 'path') {
            const bbox = el.getBBox ? el.getBBox() : null;
            return bbox ? bbox.x + bbox.width / 2 : 0;
        }
        return 0;
    }

    // Compute participant X positions from their text elements
    const participantXPositions = participantSearchTerms.map(ps => {
        // Find texts that belong to this participant
        let sumX = 0, count = 0;
        for (const t of allTexts) {
            const ty = parseFloat(t.getAttribute('y') || 0);
            if (ty > headerMaxY + 20) continue;
            const text = t.textContent.trim();
            for (const term of ps.terms) {
                if (text === term || term.includes(text) || text.includes(term)) {
                    sumX += parseFloat(t.getAttribute('x') || 0);
                    count++;
                    break;
                }
            }
        }
        return { ...ps, centerX: count > 0 ? sumX / count : -1 };
    });

    // Find nearest participant by X coordinate
    function findParticipantByX(x) {
        let best = null, bestDist = Infinity;
        for (const ps of participantXPositions) {
            if (ps.centerX < 0) continue;
            const dist = Math.abs(x - ps.centerX);
            if (dist < bestDist) {
                bestDist = dist;
                best = ps;
            }
        }
        return bestDist < 80 ? best : null;
    }

    // Make all shapes in the header area clickable (rects, icons, actor stick figures, etc.)
    allShapes.forEach(el => {
        const elY = getElY(el);
        if (elY > headerMaxY + 10) return;

        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const centerX = getElCenterX(el);
            const ps = findParticipantByX(centerX);
            if (ps) {
                selectParticipantForEdit(ps.index, ps.participant);
            }
        });
    });

    // Make all text elements clickable
    for (const el of allTexts) {
        const text = el.textContent.trim();
        if (!text) continue;
        const y = parseFloat(el.getAttribute('y') || 0);
        const x = parseFloat(el.getAttribute('x') || 0);

        // Header area: use X-position proximity to match participants
        if (y <= headerMaxY + 20) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const ps = findParticipantByX(x);
                if (ps) {
                    selectParticipantForEdit(ps.index, ps.participant);
                }
            });
            continue;
        }

        // Below header: try to match events
        // First try exact match, then substring match
        let eventMatched = false;
        for (const es of eventSearchTerms) {
            for (const term of es.terms) {
                // Normalize: remove \n for comparison
                const normTerm = term.replace(/\\n/g, ' ').trim();
                const normText = text.trim();
                if (normText === normTerm ||
                    normTerm.includes(normText) ||
                    normText.includes(normTerm) ||
                    (normText.length > 3 && normTerm.toLowerCase().includes(normText.toLowerCase()))) {
                    el.style.cursor = 'pointer';
                    const eIdx = es.index;
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectEventForEdit(eIdx);
                    });
                    eventMatched = true;
                    break;
                }
            }
            if (eventMatched) break;
        }

        // If no event matched but it's bold/divider-like text, try dividers specifically
        if (!eventMatched && text.length > 1) {
            for (let i = 0; i < parsed.events.length; i++) {
                const ev = parsed.events[i];
                if (ev.type === 'divider' && ev.title) {
                    const normTitle = ev.title.replace(/\\n/g, ' ').trim();
                    if (normTitle.toLowerCase().includes(text.toLowerCase()) ||
                        text.toLowerCase().includes(normTitle.toLowerCase())) {
                        el.style.cursor = 'pointer';
                        const eIdx = i;
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            selectEventForEdit(eIdx);
                        });
                        break;
                    }
                }
            }
        }
    }

    // Also make lines and polygons below header clickable for connections
    svg.querySelectorAll('line, polygon').forEach(el => {
        let elY = 0;
        if (el.tagName === 'line') {
            elY = parseFloat(el.getAttribute('y1') || 0);
        } else {
            const bbox = el.getBBox ? el.getBBox() : null;
            if (bbox) elY = bbox.y;
        }
        if (elY <= headerMaxY) return;

        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            // Find nearest event by Y position
            let bestIdx = -1, bestDist = Infinity;
            const clickY = elY;
            // Estimate event Y positions based on order
            const eventSpacing = 50;
            const firstEventY = headerMaxY + 60;
            for (let i = 0; i < parsed.events.length; i++) {
                const estimatedY = firstEventY + i * eventSpacing;
                const dist = Math.abs(clickY - estimatedY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
            if (bestIdx >= 0 && bestDist < eventSpacing) {
                selectEventForEdit(bestIdx);
            }
        });
    });

    // Click on the SVG background deselects
    svg.addEventListener('click', (e) => {
        if (e.target === svg || e.target.tagName === 'svg') {
            clearEditPanel();
        }
    });
}

function selectParticipantForEdit(index, participant) {
    openVisualEditorIfClosed();
    switchToSequenceTab();

    const editPanel = document.getElementById('ve-edit-panel');
    const editTitle = document.getElementById('ve-edit-title');
    const editBody = document.getElementById('ve-edit-body');

    editPanel.classList.remove('hidden');
    editTitle.textContent = 'Edit participant';

    const colorVal = participant.color || '#e20074';

    editBody.innerHTML = `
        <div class="ve-grid-2">
            <label class="ve-label">Name
                <input type="text" id="ve-edit-pname" value="${escHtml(participant.name)}" />
            </label>
            <label class="ve-label">Alias
                <input type="text" id="ve-edit-palias" value="${escHtml(participant.alias || '')}" />
            </label>
        </div>
        <div class="ve-grid-2">
            <label class="ve-label">Type
                <select id="ve-edit-ptype">
                    <option value="participant" ${participant.type === 'participant' ? 'selected' : ''}>Participant</option>
                    <option value="actor" ${participant.type === 'actor' ? 'selected' : ''}>Actor</option>
                    <option value="database" ${participant.type === 'database' ? 'selected' : ''}>Database</option>
                    <option value="queue" ${participant.type === 'queue' ? 'selected' : ''}>Queue</option>
                    <option value="boundary" ${participant.type === 'boundary' ? 'selected' : ''}>Boundary</option>
                    <option value="control" ${participant.type === 'control' ? 'selected' : ''}>Control</option>
                    <option value="entity" ${participant.type === 'entity' ? 'selected' : ''}>Entity</option>
                </select>
            </label>
            <label class="ve-label">Color
                <input type="color" id="ve-edit-pcolor" value="${colorVal}" />
            </label>
        </div>
        <label class="ve-label">Internal notes (not shown in diagram)
            <textarea id="ve-edit-pnotes" rows="3" placeholder="Notes for editors only">${escHtml(participant.internalNotes || '')}</textarea>
        </label>
        <div class="ve-edit-actions">
            <button id="ve-edit-left">Move left</button>
            <button id="ve-edit-right">Move right</button>
            <button class="ve-edit-btn-delete" id="ve-edit-delete">Delete</button>
        </div>
    `;

    const autoApplyParticipant = () => {
        veParticipants[index] = {
            type: document.getElementById('ve-edit-ptype').value,
            name: document.getElementById('ve-edit-pname').value.trim(),
            alias: document.getElementById('ve-edit-palias').value.trim(),
            color: document.getElementById('ve-edit-pcolor').value,
            internalNotes: document.getElementById('ve-edit-pnotes').value
        };
        renderParticipantList();
        renderConnectionDropdowns();
        syncCodeFromVisualEditor();
    };

    document.getElementById('ve-edit-pname').addEventListener('input', autoApplyParticipant);
    document.getElementById('ve-edit-palias').addEventListener('input', autoApplyParticipant);
    document.getElementById('ve-edit-ptype').addEventListener('change', autoApplyParticipant);
    document.getElementById('ve-edit-pcolor').addEventListener('input', autoApplyParticipant);
    document.getElementById('ve-edit-pnotes').addEventListener('input', autoApplyParticipant);

    document.getElementById('ve-edit-left').addEventListener('click', () => {
        if (index > 0) {
            [veParticipants[index - 1], veParticipants[index]] = [veParticipants[index], veParticipants[index - 1]];
            renderParticipantList();
            renderConnectionDropdowns();
            syncCodeFromVisualEditor();
            selectParticipantForEdit(index - 1, veParticipants[index - 1]);
            showToast('Moved left');
        }
    });

    document.getElementById('ve-edit-right').addEventListener('click', () => {
        if (index < veParticipants.length - 1) {
            [veParticipants[index], veParticipants[index + 1]] = [veParticipants[index + 1], veParticipants[index]];
            renderParticipantList();
            renderConnectionDropdowns();
            syncCodeFromVisualEditor();
            selectParticipantForEdit(index + 1, veParticipants[index + 1]);
            showToast('Moved right');
        }
    });

    document.getElementById('ve-edit-delete').addEventListener('click', () => {
        if (confirm(`Delete participant "${participant.name}"?`)) {
            veParticipants.splice(index, 1);
            renderParticipantList();
            renderConnectionDropdowns();
            syncCodeFromVisualEditor();
            clearEditPanel();
            showToast('Participant deleted');
        }
    });
}

function selectEventForEdit(index) {
    openVisualEditorIfClosed();
    switchToSequenceTab();

    veSelectedEventIndex = index;
    renderEventList();

    const ev = veEvents[index];
    if (!ev) return;

    const editPanel = document.getElementById('ve-edit-panel');
    const editTitle = document.getElementById('ve-edit-title');
    const editBody = document.getElementById('ve-edit-body');

    editPanel.classList.remove('hidden');

    if (ev.type === 'message') {
        editTitle.textContent = 'Edit connection';
        const participantOpts = veParticipants.map(p => {
            const alias = p.alias || p.name;
            const display = p.name !== alias ? `${p.name} (${alias})` : p.name;
            return `<option value="${escHtml(alias)}">${escHtml(display)}</option>`;
        }).join('');

        editBody.innerHTML = `
            <label class="ve-label">Label
                <textarea id="ve-edit-label" rows="2">${escHtml(ev.label || '')}</textarea>
            </label>
            <label class="ve-label">Internal notes (not shown in diagram)
                <textarea id="ve-edit-notes" rows="2" placeholder="Notes for editors only">${escHtml(ev.internalNotes || '')}</textarea>
            </label>
            <div class="ve-grid-2">
                <label class="ve-label">From
                    <select id="ve-edit-from">${participantOpts}</select>
                </label>
                <label class="ve-label">To
                    <select id="ve-edit-to">${participantOpts}</select>
                </label>
            </div>
            <div class="ve-grid-2">
                <label class="ve-label">Type
                    <select id="ve-edit-arrow">
                        <option value="->" ${ev.arrow === '->' ? 'selected' : ''}>Request (solid)</option>
                        <option value="-->" ${ev.arrow === '-->' ? 'selected' : ''}>Response (dashed)</option>
                        <option value="&lt;-" ${ev.arrow === '<-' ? 'selected' : ''}>Reverse solid</option>
                        <option value="&lt;--" ${ev.arrow === '<--' ? 'selected' : ''}>Reverse dashed</option>
                    </select>
                </label>
                <label class="ve-label">Color
                    <input type="color" id="ve-edit-color" value="${ev.color || '#e20074'}" />
                </label>
            </div>
            <div class="ve-edit-actions">
                <button id="ve-edit-up">Move up</button>
                <button id="ve-edit-down">Move down</button>
                <button class="ve-edit-btn-delete" id="ve-edit-delete">Delete</button>
            </div>
        `;

        document.getElementById('ve-edit-from').value = ev.from;
        document.getElementById('ve-edit-to').value = ev.to;

        // Auto-apply on any change
        const autoApply = () => {
            veEvents[index] = {
                type: 'message',
                from: document.getElementById('ve-edit-from').value,
                arrow: document.getElementById('ve-edit-arrow').value,
                to: document.getElementById('ve-edit-to').value,
                label: document.getElementById('ve-edit-label').value.trim(),
                color: document.getElementById('ve-edit-color').value,
                internalNotes: document.getElementById('ve-edit-notes').value
            };
            renderEventList();
            syncCodeFromVisualEditor();
        };

        document.getElementById('ve-edit-label').addEventListener('input', autoApply);
        document.getElementById('ve-edit-notes').addEventListener('input', autoApply);
        document.getElementById('ve-edit-from').addEventListener('change', autoApply);
        document.getElementById('ve-edit-to').addEventListener('change', autoApply);
        document.getElementById('ve-edit-arrow').addEventListener('change', autoApply);
        document.getElementById('ve-edit-color').addEventListener('input', autoApply);

        document.getElementById('ve-edit-up').addEventListener('click', () => {
            if (index > 0) {
                [veEvents[index - 1], veEvents[index]] = [veEvents[index], veEvents[index - 1]];
                veSelectedEventIndex = index - 1;
                renderEventList();
                syncCodeFromVisualEditor();
                selectEventForEdit(index - 1);
            }
        });

        document.getElementById('ve-edit-down').addEventListener('click', () => {
            if (index < veEvents.length - 1) {
                [veEvents[index], veEvents[index + 1]] = [veEvents[index + 1], veEvents[index]];
                veSelectedEventIndex = index + 1;
                renderEventList();
                syncCodeFromVisualEditor();
                selectEventForEdit(index + 1);
            }
        });

        document.getElementById('ve-edit-delete').addEventListener('click', () => {
            veEvents.splice(index, 1);
            veSelectedEventIndex = -1;
            renderEventList();
            syncCodeFromVisualEditor();
            clearEditPanel();
            showToast('Connection deleted');
        });

    } else if (ev.type === 'divider') {
        editTitle.textContent = 'Edit section';
        editBody.innerHTML = `
            <label class="ve-label">Section title
                <input type="text" id="ve-edit-divtitle" value="${escHtml(ev.title || '')}" />
            </label>
            <div class="ve-grid-2">
                <label class="ve-label">Color
                    <input type="color" id="ve-edit-color" value="${ev.color || '#e20074'}" />
                </label>
                <label class="ve-label">&nbsp;</label>
            </div>
            <label class="ve-label">Internal notes (not shown in diagram)
                <textarea id="ve-edit-notes" rows="2" placeholder="Notes for editors only">${escHtml(ev.internalNotes || '')}</textarea>
            </label>
            <div class="ve-edit-actions">
                <button id="ve-edit-up">Move up</button>
                <button id="ve-edit-down">Move down</button>
                <button class="ve-edit-btn-delete" id="ve-edit-delete">Delete</button>
            </div>
        `;

        // Auto-apply on any change
        const autoApplyDiv = () => {
            veEvents[index].title = document.getElementById('ve-edit-divtitle').value.trim();
            veEvents[index].color = document.getElementById('ve-edit-color').value;
            veEvents[index].internalNotes = document.getElementById('ve-edit-notes').value;
            renderEventList();
            syncCodeFromVisualEditor();
        };

        document.getElementById('ve-edit-divtitle').addEventListener('input', autoApplyDiv);
        document.getElementById('ve-edit-color').addEventListener('input', autoApplyDiv);
        document.getElementById('ve-edit-notes').addEventListener('input', autoApplyDiv);

        document.getElementById('ve-edit-up').addEventListener('click', () => {
            if (index > 0) {
                [veEvents[index - 1], veEvents[index]] = [veEvents[index], veEvents[index - 1]];
                veSelectedEventIndex = index - 1;
                renderEventList();
                syncCodeFromVisualEditor();
                selectEventForEdit(index - 1);
            }
        });

        document.getElementById('ve-edit-down').addEventListener('click', () => {
            if (index < veEvents.length - 1) {
                [veEvents[index], veEvents[index + 1]] = [veEvents[index + 1], veEvents[index]];
                veSelectedEventIndex = index + 1;
                renderEventList();
                syncCodeFromVisualEditor();
                selectEventForEdit(index + 1);
            }
        });

        document.getElementById('ve-edit-delete').addEventListener('click', () => {
            veEvents.splice(index, 1);
            veSelectedEventIndex = -1;
            renderEventList();
            syncCodeFromVisualEditor();
            clearEditPanel();
            showToast('Section deleted');
        });
    }
}

function clearEditPanel() {
    const editPanel = document.getElementById('ve-edit-panel');
    if (editPanel) editPanel.classList.add('hidden');
    veSelectedEventIndex = -1;
    renderEventList();
}

function openVisualEditorIfClosed() {
    if (!isVisualEditorOpen) {
        isVisualEditorOpen = true;
        visualEditorPanel.classList.remove('hidden');
        btnVisualEditor.classList.add('active');
        syncVisualEditorFromCode();
    }
}

function switchToSequenceTab() {
    document.querySelectorAll('.ve-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ve-tab-content').forEach(c => c.classList.remove('active'));
    const seqTab = document.querySelector('.ve-tab[data-tab="sequence"]');
    const seqContent = document.getElementById('ve-tab-sequence');
    if (seqTab) seqTab.classList.add('active');
    if (seqContent) seqContent.classList.add('active');
}

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Close edit panel button
document.getElementById('ve-edit-close')?.addEventListener('click', clearEditPanel);

// ======= RENDERING =======
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
            makeDiagramInteractive(svg);
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

// ======= TITLE SYNC =======
function extractTitle(text) {
    const match = text.match(/^\s*title\s+(.+)$/m);
    return match ? match[1].trim() : '';
}

function updateTitleInSource(newTitle) {
    const text = editor.value;
    const titleRegex = /^(\s*title\s+).+$/m;
    if (titleRegex.test(text)) {
        if (newTitle) {
            editor.value = text.replace(titleRegex, `$1${newTitle}`);
        } else {
            editor.value = text.replace(/^\s*title\s+.+\n?/m, '');
        }
    } else if (newTitle) {
        // Insert after @startuml
        editor.value = text.replace(/(@startuml[^\n]*\n)/, `$1title ${newTitle}\n`);
    }
    saveContent();
    scheduleRender();
}

titleField.addEventListener('input', () => {
    updateTitleInSource(titleField.value);
});

function syncTitleFromSource() {
    const title = extractTitle(editor.value);
    titleField.value = title;
}

// ======= DIRTY STATE =======
function updateDirtyState() {
    if (editor.value !== lastSavedContent) {
        dirtyIndicator.classList.remove('hidden');
    } else {
        dirtyIndicator.classList.add('hidden');
    }
}

function markSaved() {
    lastSavedContent = editor.value;
    updateDirtyState();
}

// ======= UNSAVED CHANGES WARNING =======
window.addEventListener('beforeunload', (e) => {
    if (editor.value !== lastSavedContent) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ======= TOOLBAR: Render =======
btnRender.addEventListener('click', doRender);

// ======= TOOLBAR: Copy SVG =======
btnCopy.addEventListener('click', async () => {
    if (!currentSvg) {
        showToast('No SVG to copy. Render first.', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(currentSvg);
        showToast('SVG copied to clipboard', 'success');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = currentSvg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('SVG copied to clipboard', 'success');
    }
});

// ======= TOOLBAR: Download SVG =======
btnDownload.addEventListener('click', () => {
    if (!currentSvg) {
        showToast('No SVG to download. Render first.', 'error');
        return;
    }
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName.replace(/\.\w+$/, '.svg');
    a.click();
    URL.revokeObjectURL(url);
    showToast('SVG downloaded', 'success');
});

// ======= TOOLBAR: Open File =======
btnOpen.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.value = ev.target.result;
        saveContent();
        markSaved();
        syncTitleFromSource();
        syncVisualEditorFromCode();
        doRender();
        showToast(`Opened: ${file.name}`, 'success');
    };
    reader.readAsText(file);
    fileInput.value = '';
});

// ======= TOOLBAR: Save File =======
btnSave.addEventListener('click', () => {
    const text = editor.value;
    if (!text.trim()) {
        showToast('Nothing to save', 'error');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
    showToast(`Saved: ${currentFileName}`, 'success');
});

// ======= TOOLBAR: Import from Clipboard =======
btnImportClipboard.addEventListener('click', () => {
    importTextarea.value = '';
    modalImport.classList.remove('hidden');
    importTextarea.focus();
});

importCancel.addEventListener('click', () => {
    modalImport.classList.add('hidden');
});

modalImport.querySelector('.modal-backdrop').addEventListener('click', () => {
    modalImport.classList.add('hidden');
});

importConfirm.addEventListener('click', () => {
    const text = importTextarea.value.trim();
    if (text) {
        editor.value = text;
        saveContent();
        syncTitleFromSource();
        syncVisualEditorFromCode();
        doRender();
        showToast('Imported from clipboard', 'success');
    }
    modalImport.classList.add('hidden');
});

// ======= TOOLBAR: Copy Source =======
btnCopySource.addEventListener('click', async () => {
    const text = editor.value;
    if (!text.trim()) {
        showToast('Editor is empty', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('Source copied to clipboard', 'success');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Source copied to clipboard', 'success');
    }
});

// ======= TOOLBAR: Clear =======
btnClear.addEventListener('click', () => {
    if (!editor.value.trim()) return;
    if (confirm('Clear the editor? This cannot be undone.')) {
        editor.value = '@startuml\n\n@enduml';
        saveContent();
        syncTitleFromSource();
        syncVisualEditorFromCode();
        previewOutput.innerHTML = '';
        previewOutput.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        currentSvg = '';
        showToast('Editor cleared', 'info');
    }
});

// ======= TOOLBAR: Export Modal =======
btnExportModal.addEventListener('click', () => {
    exportTextarea.value = editor.value;
    modalExport.classList.remove('hidden');
});

exportCopy.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(exportTextarea.value);
        showToast('Source copied', 'success');
    } catch {
        exportTextarea.select();
        document.execCommand('copy');
        showToast('Source copied', 'success');
    }
});

exportClose.addEventListener('click', () => {
    modalExport.classList.add('hidden');
});

modalExport.querySelector('.modal-backdrop').addEventListener('click', () => {
    modalExport.classList.add('hidden');
});

// ======= TOOLBAR: Examples =======
selectExample.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && examples[key]) {
        editor.value = examples[key];
        selectExample.value = '';
        saveContent();
        syncTitleFromSource();
        syncVisualEditorFromCode();
        doRender();
    }
});

// ======= TOOLBAR: Viewer Mode =======
btnViewer.addEventListener('click', () => {
    openViewer();
});

function openViewer() {
    if (!currentSvg) {
        showToast('No diagram to view. Render first.', 'error');
        return;
    }
    viewerContent.innerHTML = currentSvg;
    viewerZoom = 1;
    viewerPanX = 0;
    viewerPanY = 0;
    updateViewerTransform();
    viewerMode.classList.remove('hidden');
    btnViewer.classList.add('active');
}

function closeViewer() {
    viewerMode.classList.add('hidden');
    btnViewer.classList.remove('active');
}

viewerExit.addEventListener('click', closeViewer);

viewerZoomIn.addEventListener('click', () => {
    viewerZoom = Math.min(viewerZoom * 1.25, 5);
    updateViewerTransform();
});

viewerZoomOut.addEventListener('click', () => {
    viewerZoom = Math.max(viewerZoom / 1.25, 0.2);
    updateViewerTransform();
});

viewerZoomReset.addEventListener('click', () => {
    viewerZoom = 1;
    viewerPanX = 0;
    viewerPanY = 0;
    updateViewerTransform();
});

function updateViewerTransform() {
    viewerContent.style.transform = `translate(${viewerPanX}px, ${viewerPanY}px) scale(${viewerZoom})`;
    viewerZoomLevel.textContent = Math.round(viewerZoom * 100) + '%';
}

// Viewer pan/drag
viewerCanvas.addEventListener('mousedown', (e) => {
    if (e.target.closest('.viewer-controls')) return;
    isViewerDragging = true;
    viewerDragStart = { x: e.clientX - viewerPanX, y: e.clientY - viewerPanY };
    viewerCanvas.classList.add('grabbing');
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isViewerDragging) return;
    viewerPanX = e.clientX - viewerDragStart.x;
    viewerPanY = e.clientY - viewerDragStart.y;
    updateViewerTransform();
});

document.addEventListener('mouseup', () => {
    if (isViewerDragging) {
        isViewerDragging = false;
        viewerCanvas.classList.remove('grabbing');
    }
});

// Viewer mouse wheel zoom
viewerCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    viewerZoom = Math.min(Math.max(viewerZoom * delta, 0.2), 5);
    updateViewerTransform();
});

// ======= PREVIEW PANE ZOOM =======
previewPane.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        previewZoom = Math.min(Math.max(previewZoom * delta, 0.3), 4);
        previewContainer.style.transform = `scale(${previewZoom})`;
        zoomLevelDisplay.textContent = Math.round(previewZoom * 100) + '%';
        zoomOverlay.classList.remove('hidden');
        clearTimeout(zoomOverlay._hideTimeout);
        zoomOverlay._hideTimeout = setTimeout(() => {
            zoomOverlay.classList.add('hidden');
        }, 1500);
    }
});

// ======= TOOLBAR: Visual Editor Toggle =======
function resetPaneSizes() {
    editorPane.style.flex = '';
    editorPane.style.width = '';
    previewPane.style.flex = '';
    previewPane.style.width = '';
}

btnVisualEditor.addEventListener('click', () => {
    isVisualEditorOpen = !isVisualEditorOpen;
    visualEditorPanel.classList.toggle('hidden', !isVisualEditorOpen);
    btnVisualEditor.classList.toggle('active', isVisualEditorOpen);
    resetPaneSizes();
    if (isVisualEditorOpen) {
        syncVisualEditorFromCode();
    }
});

veClose.addEventListener('click', () => {
    isVisualEditorOpen = false;
    visualEditorPanel.classList.add('hidden');
    btnVisualEditor.classList.remove('active');
    resetPaneSizes();
});

// ======= KEYBOARD SHORTCUTS =======
document.addEventListener('keydown', (e) => {
    // Escape: exit viewer
    if (e.key === 'Escape') {
        if (!viewerMode.classList.contains('hidden')) {
            closeViewer();
            return;
        }
        if (!modalImport.classList.contains('hidden')) {
            modalImport.classList.add('hidden');
            return;
        }
        if (!modalExport.classList.contains('hidden')) {
            modalExport.classList.add('hidden');
            return;
        }
    }

    // Ctrl+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        btnSave.click();
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

// ======= RESIZABLE DIVIDER =======
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
    const mainRect = main.getBoundingClientRect();

    const veWidth = isVisualEditorOpen ? visualEditorPanel.offsetWidth : 0;
    const dividerWidth = 4;
    const availableWidth = mainRect.width - veWidth - dividerWidth;
    const offsetX = e.clientX - mainRect.left;
    const editorWidth = Math.min(Math.max(offsetX, availableWidth * 0.2), availableWidth * 0.8);

    editorPane.style.flex = 'none';
    editorPane.style.width = editorWidth + 'px';
    previewPane.style.flex = 'none';
    previewPane.style.width = (availableWidth - editorWidth) + 'px';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        divider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// ======= LOCAL STORAGE =======
const STORAGE_KEY = 'plantuml-editor-content';

function saveContent() {
    localStorage.setItem(STORAGE_KEY, editor.value);
    updateDirtyState();
}

function loadContent() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        editor.value = saved;
    }
    lastSavedContent = editor.value;
}

// ======= AUTO-RENDER ON TYPING =======
let renderTimeout = null;

function scheduleRender() {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(doRender, 500);
}

editor.addEventListener('input', () => {
    saveContent();
    syncTitleFromSource();
    syncVisualEditorFromCode();
    scheduleRender();
});

// ======= VISUAL EDITOR: PARSER =======
function parseSequenceDiagram(text) {
    const participants = [];
    const events = [];
    const lines = text.split('\n');

    const participantRegex = /^\s*(participant|actor|database|queue|entity|boundary|control|collections)\s+"([^"]+)"\s+as\s+(\w+)\s*(#[0-9A-Fa-f]{6})?/i;
    const participantSimpleRegex = /^\s*(participant|actor|database|queue|entity|boundary|control|collections)\s+(\w+)\s*(#[0-9A-Fa-f]{6})?\s*$/i;
    const messageRegex = /^\s*(\w+)\s*(<?--?>)\s*(\w+)\s*:\s*(.+)$/;
    const dividerRegex = /^\s*==\s*(.+?)\s*==\s*$/;
    const titleRegex = /^\s*title\s+(.+)$/i;
    const noteStartRegex = /^\s*note\s+(right|left|over)\b/i;
    const noteEndRegex = /^\s*end\s+note\s*$/i;
    const commentNoteStart = /^\s*'\s*@internal-note-start\s+(\w+)\s+(\d+)/;
    const commentNoteLine = /^\s*'\s*@internal-note:\s*(.*)/;

    let inNote = false;
    let pendingInternalNotes = new Map(); // key: "participant:alias" or "event:index"

    // First pass: collect internal notes from comments
    for (let i = 0; i < lines.length; i++) {
        const noteMatch = lines[i].match(commentNoteLine);
        if (noteMatch) {
            // Format: ' @internal-note: type:key|note text
            const parts = noteMatch[1].split('|');
            if (parts.length >= 2) {
                pendingInternalNotes.set(parts[0], parts.slice(1).join('|'));
            }
        }
    }

    let eventIndex = 0;
    for (const line of lines) {
        if (/^\s*@(startuml|enduml)/.test(line)) continue;
        if (/^\s*$/.test(line)) continue;
        if (/^\s*'/.test(line)) continue; // skip comments

        // Skip note blocks
        if (noteStartRegex.test(line)) { inNote = true; continue; }
        if (noteEndRegex.test(line)) { inNote = false; continue; }
        if (inNote) continue;

        // Skip other directives
        if (/^\s*(skinparam|hide|legend|endlegend)\b/i.test(line)) continue;

        const titleMatch = line.match(titleRegex);
        if (titleMatch) continue;

        // participant with quotes and optional color
        const pMatch = line.match(participantRegex);
        if (pMatch) {
            const alias = pMatch[3];
            participants.push({
                type: pMatch[1].toLowerCase(),
                name: pMatch[2],
                alias: alias,
                color: pMatch[4] || '',
                internalNotes: pendingInternalNotes.get('p:' + alias) || ''
            });
            continue;
        }

        // simple participant with optional color
        const pSimpleMatch = line.match(participantSimpleRegex);
        if (pSimpleMatch) {
            const alias = pSimpleMatch[2];
            participants.push({
                type: pSimpleMatch[1].toLowerCase(),
                name: alias,
                alias: alias,
                color: pSimpleMatch[3] || '',
                internalNotes: pendingInternalNotes.get('p:' + alias) || ''
            });
            continue;
        }

        // divider
        const divMatch = line.match(dividerRegex);
        if (divMatch) {
            events.push({
                type: 'divider',
                title: divMatch[1],
                internalNotes: pendingInternalNotes.get('e:' + eventIndex) || ''
            });
            eventIndex++;
            continue;
        }

        // message
        const msgMatch = line.match(messageRegex);
        if (msgMatch) {
            events.push({
                type: 'message',
                from: msgMatch[1],
                arrow: msgMatch[2],
                to: msgMatch[3],
                label: msgMatch[4].trim(),
                internalNotes: pendingInternalNotes.get('e:' + eventIndex) || ''
            });
            eventIndex++;
            continue;
        }
    }

    return { participants, events };
}

function syncVisualEditorFromCode() {
    if (veSyncingToCode) return;
    if (!isVisualEditorOpen) return;

    veSyncingFromCode = true;
    const parsed = parseSequenceDiagram(editor.value);
    veParticipants = parsed.participants;
    veEvents = parsed.events;
    veSelectedEventIndex = -1;
    renderParticipantList();
    renderConnectionDropdowns();
    renderEventList();
    updateVESubtitle();
    // Sync title to visual editor input
    const veTitleInput = document.getElementById('ve-title-input');
    if (veTitleInput) veTitleInput.value = titleField.value;
    veSyncingFromCode = false;
}

function updateVESubtitle() {
    const sub = document.getElementById('ve-subtitle');
    if (sub) {
        const msgs = veEvents.filter(e => e.type === 'message').length;
        sub.textContent = `${veParticipants.length} participants · ${msgs} connections`;
    }
}

function syncCodeFromVisualEditor() {
    if (veSyncingFromCode) return;
    veSyncingToCode = true;

    const title = titleField.value.trim();
    let code = '@startuml\n';
    if (title) code += `title ${title}\n`;
    code += '\n';

    // Internal notes as comments
    for (let i = 0; i < veParticipants.length; i++) {
        const p = veParticipants[i];
        if (p.internalNotes) {
            code += `' @internal-note: p:${p.alias || p.name}|${p.internalNotes.replace(/\n/g, '\\n')}\n`;
        }
    }
    for (let i = 0; i < veEvents.length; i++) {
        const ev = veEvents[i];
        if (ev.internalNotes) {
            code += `' @internal-note: e:${i}|${ev.internalNotes.replace(/\n/g, '\\n')}\n`;
        }
    }

    // Participants
    for (const p of veParticipants) {
        if (p.name !== p.alias && p.alias) {
            code += `${p.type} "${p.name}" as ${p.alias}`;
        } else {
            code += `${p.type} ${p.alias || p.name}`;
        }
        if (p.color) code += ` ${p.color}`;
        code += '\n';
    }
    if (veParticipants.length > 0) code += '\n';

    // Events
    for (const ev of veEvents) {
        if (ev.type === 'divider') {
            code += `== ${ev.title} ==\n`;
        } else if (ev.type === 'message') {
            if (ev.color && ev.color !== '#e20074') {
                const arrowBase = ev.arrow.replace(/[<>]/g, '');
                const isReverse = ev.arrow.startsWith('<');
                const isDashed = arrowBase === '--';
                const colorArrow = isReverse
                    ? `<-[${ev.color}${isDashed ? ',dashed' : ''}]-`
                    : `-[${ev.color}${isDashed ? ',dashed' : ''}]->`;
                code += `${ev.from} ${colorArrow} ${ev.to} : ${ev.label}\n`;
            } else {
                code += `${ev.from} ${ev.arrow} ${ev.to} : ${ev.label}\n`;
            }
        }
    }

    code += '@enduml';
    editor.value = code;
    saveContent();
    scheduleRender();
    updateVESubtitle();
    veSyncingToCode = false;
}

// ======= VISUAL EDITOR: TABS =======
document.querySelectorAll('.ve-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ve-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ve-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('ve-tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
    });
});

// ======= VISUAL EDITOR: RENDERING =======
function renderParticipantList() {
    veParticipantList.innerHTML = '';
    const countEl = document.getElementById('ve-participant-count');
    if (countEl) countEl.textContent = veParticipants.length;

    for (let i = 0; i < veParticipants.length; i++) {
        const p = veParticipants[i];
        const color = p.color || '#e20074';
        const li = document.createElement('li');
        li.innerHTML = `<span class="ve-color-dot" style="background:${color}"></span><div class="ve-participant-info"><span class="ve-name">${p.name}</span><span class="ve-alias">${p.type} as ${p.alias || p.name}</span></div><button class="ve-remove" data-index="${i}">&times;</button>`;
        veParticipantList.appendChild(li);
    }
    veParticipantList.querySelectorAll('.ve-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            veParticipants.splice(idx, 1);
            renderParticipantList();
            renderConnectionDropdowns();
            syncCodeFromVisualEditor();
        });
    });
}

function renderConnectionDropdowns() {
    const fromVal = veConnFrom.value;
    const toVal = veConnTo.value;

    veConnFrom.innerHTML = '<option value="">Select...</option>';
    veConnTo.innerHTML = '<option value="">Select...</option>';

    for (const p of veParticipants) {
        const alias = p.alias || p.name;
        const display = p.name !== alias ? `${p.name} (${alias})` : p.name;
        veConnFrom.innerHTML += `<option value="${alias}">${display}</option>`;
        veConnTo.innerHTML += `<option value="${alias}">${display}</option>`;
    }

    veConnFrom.value = fromVal;
    veConnTo.value = toVal;
}

function renderEventList() {
    veEventList.innerHTML = '';
    const countEl = document.getElementById('ve-event-count');
    if (countEl) countEl.textContent = `${veEvents.length} event${veEvents.length !== 1 ? 's' : ''}`;

    for (let i = 0; i < veEvents.length; i++) {
        const ev = veEvents[i];
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.index = i;
        if (i === veSelectedEventIndex) li.classList.add('selected');

        let label = '';
        let detail = '';
        if (ev.type === 'divider') {
            li.classList.add('ve-divider-item');
            label = `== ${ev.title} ==`;
            detail = 'Section divider';
        } else if (ev.type === 'message') {
            const arrow = ev.arrow.includes('--') ? '···>' : '→';
            label = `${ev.from} ${arrow} ${ev.to}`;
            detail = ev.label || 'No label';
        }

        li.innerHTML = `<span class="ve-drag-handle">⋮⋮</span><div class="ve-event-info"><span class="ve-event-label">${label}</span><span class="ve-event-detail">${detail}</span></div><button class="ve-remove" data-index="${i}">&times;</button>`;

        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('ve-remove')) return;
            veSelectedEventIndex = i;
            renderEventList();
            selectEventForEdit(i);
        });

        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', i.toString());
            li.style.opacity = '0.4';
        });
        li.addEventListener('dragend', () => {
            li.style.opacity = '1';
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            li.style.borderTopColor = 'var(--accent)';
        });
        li.addEventListener('dragleave', () => {
            li.style.borderTopColor = '';
        });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.style.borderTopColor = '';
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = i;
            if (fromIdx !== toIdx) {
                const [moved] = veEvents.splice(fromIdx, 1);
                veEvents.splice(toIdx, 0, moved);
                renderEventList();
                syncCodeFromVisualEditor();
            }
        });

        veEventList.appendChild(li);
    }

    veEventList.querySelectorAll('.ve-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            veEvents.splice(idx, 1);
            if (veSelectedEventIndex >= veEvents.length) veSelectedEventIndex = -1;
            renderEventList();
            syncCodeFromVisualEditor();
        });
    });
}

// ======= VISUAL EDITOR: TITLE SYNC =======
document.getElementById('ve-title-input')?.addEventListener('input', (e) => {
    const newTitle = e.target.value;
    titleField.value = newTitle;
    updateTitleInSource(newTitle);
    saveContent();
    scheduleRender();
});

// ======= VISUAL EDITOR: ADD ACTIONS =======
veAddParticipant.addEventListener('click', () => {
    const name = veParticipantName.value.trim();
    if (!name) {
        showToast('Participant name is required', 'error');
        return;
    }
    const alias = veParticipantAlias.value.trim() || name.replace(/\s+/g, '');
    const type = veParticipantType.value;
    const color = veParticipantColor.value !== '#e20074' ? veParticipantColor.value : '';

    veParticipants.push({ type, name, alias, color });
    veParticipantName.value = '';
    veParticipantAlias.value = '';
    renderParticipantList();
    renderConnectionDropdowns();
    syncCodeFromVisualEditor();
    showToast(`Added participant: ${name}`, 'success');
});

veAddConnection.addEventListener('click', () => {
    const from = veConnFrom.value;
    const to = veConnTo.value;
    const arrow = veConnArrow.value;
    const label = veConnLabel.value.trim() || 'message';

    if (!from || !to) {
        showToast('Select From and To participants', 'error');
        return;
    }

    veEvents.push({ type: 'message', from, arrow, to, label });
    veConnLabel.value = '';
    renderEventList();
    syncCodeFromVisualEditor();
    showToast('Connection added', 'success');
});

veAddDivider.addEventListener('click', () => {
    const title = veDividerTitle.value.trim();
    if (!title) {
        showToast('Divider title is required', 'error');
        return;
    }
    veEvents.push({ type: 'divider', title });
    veDividerTitle.value = '';
    renderEventList();
    syncCodeFromVisualEditor();
    showToast('Divider added', 'success');
});

veGenerate.addEventListener('click', () => {
    syncCodeFromVisualEditor();
    doRender();
    showToast('Code generated and synced', 'success');
});

// ======= INITIALIZATION =======
loadContent();
syncTitleFromSource();
updateDirtyState();

// Load engine then auto-render
loadPlantUML().then(() => {
    if (editor.value.trim()) {
        doRender();
    }
});
