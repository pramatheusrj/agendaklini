import * as state from './state.js';
import { selectors } from './config.js';
import { getWeekDates, getWeekDisplay } from '../utils/dateUtils.js';

const scheduleGrid = document.querySelector(selectors.pages.scheduleGrid);
const mainTitle = document.querySelector(selectors.ui.mainTitle);
const currentWeekDisplay = document.getElementById('current-week-display');
const doctorsPanel = document.getElementById('doctors-panel');
const specialtyFilterSidebar = document.querySelector(selectors.filters.specialtySidebar);
const unitFilter = document.querySelector(selectors.filters.unit);
const specialtyFilterMain = document.querySelector(selectors.filters.specialtyMain);

let distributionChartInstance = null;
let capacityChartInstance = null;

export function showElement(element) {
    if (element) element.classList.remove('hidden');
}

export function hideElement(element) {
    if (element) element.classList.add('hidden');
}

export function showModal(modalElement) {
    showElement(modalElement);
}

export function hideModal(modalElement) {
    hideElement(modalElement);
}

export function showNotification(message, title = "Notificação") {
    const notificationModal = document.querySelector(selectors.modals.notification);
    const titleEl = notificationModal.querySelector('#notification-title');
    const messageEl = notificationModal.querySelector('#notification-message');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    showModal(notificationModal);
    
    return notificationModal;
}

export function downloadJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadCsv(csvContent, filename) {
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function updateMainTitle(titleText) {
    if (mainTitle) mainTitle.textContent = titleText;
}

export function render() {
    if (!state.allUnits() || state.allUnits().length === 0) return;

    updateFilters();
    renderDoctorsPanel();
    renderScheduleGrid();
    renderRegistrationPanels();
    renderFullScheduleTable();
    renderDashboard();
}

function updateFilters() {
    const populateSelect = (selectElement, data, valueField, textField, defaultOptionText) => {
        if (!selectElement) return;
        const currentValue = selectElement.value;
        let optionsHTML = `<option value="all">${defaultOptionText}</option>`;
        if (selectElement.id.includes('professional-specialty') || selectElement.id.includes('unit-select')) {
            optionsHTML = `<option value="">Selecione...</option>`;
        }

        const validData = data.filter(item => item && typeof item.name === 'string');

        validData.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
            optionsHTML += `<option value="${item[valueField]}">${item[textField]}</option>`;
        });
        selectElement.innerHTML = optionsHTML;
        selectElement.value = currentValue || (optionsHTML.startsWith('<option value=""') ? '' : 'all');
    };

    populateSelect(unitFilter, state.allUnits(), 'id', 'name', 'Todas as Unidades');
    populateSelect(specialtyFilterSidebar, state.allSpecialties(), 'id', 'name', 'Todas as Especialidades');
    populateSelect(specialtyFilterMain, state.allSpecialties(), 'id', 'name', 'Todas as Especialidades');

    populateSelect(document.getElementById('professional-specialty'), state.allSpecialties(), 'id', 'name', '');
    populateSelect(document.getElementById('edit-professional-specialty'), state.allSpecialties(), 'id', 'name', '');
    populateSelect(document.getElementById('unit-select-for-room'), state.allUnits(), 'id', 'name', '');
}

export function renderDoctorsPanel() {
    if (!doctorsPanel) return;
    doctorsPanel.innerHTML = '';
    const selectedSpecialty = specialtyFilterSidebar.value;
    
    const validProfessionals = state.allProfessionals().filter(p => p && typeof p.name === 'string');

    const filteredProfessionals = validProfessionals
        .filter(p => selectedSpecialty === 'all' || p.specialtyId === selectedSpecialty)
        .sort((a, b) => a.name.localeCompare(b.name));

    filteredProfessionals.forEach(prof => {
        const specName = state.allSpecialties().find(s => s.id === prof.specialtyId)?.name || 'N/A';
        const docElement = createDOMElement('div', {
            className: 'draggable',
            dataset: { professionalId: prof.id },
            children: [
                createDOMElement('div', { className: 'doctor-name', textContent: prof.name }),
                createDOMElement('div', { className: 'doctor-spec', textContent: specName })
            ]
        });
        docElement.draggable = true;
        doctorsPanel.appendChild(docElement);
    });
}

export function renderScheduleGrid() {
    const scheduleGrid = document.querySelector(selectors.pages.scheduleGrid);
    if (!scheduleGrid) return;

    scheduleGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const weekDays = getWeekDates(state.currentDate());
    currentWeekDisplay.textContent = getWeekDisplay(state.currentDate());

    // Cabeçalhos
    const headers = ['Unidade', 'Sala / Período', ...weekDays.map(d => `${d.toLocaleDateString('pt-BR', { weekday: 'short' })} - ${d.getDate()}`)];
    headers.forEach(headerText => {
        fragment.appendChild(createDOMElement('div', { className: 'grid-header', textContent: headerText }));
    });

    const selectedUnitId = document.querySelector(selectors.filters.unit).value;
    const validUnits = state.allUnits().filter(u => u && typeof u.name === 'string');
    const visibleUnits = selectedUnitId === 'all' ? validUnits : validUnits.filter(u => u.id === selectedUnitId);

    // Dias com plantão contínuo (manhã atravessando 13:00)
    const continuousShiftCells = new Set(
        state.scheduleData()
            .filter(alloc => alloc.startTime && alloc.endTime && alloc.startTime < '13:00' && alloc.endTime > '13:00')
            .map(alloc => `${alloc.date}-${alloc.unitId}-${alloc.room}`)
    );

    visibleUnits.sort((a, b) => a.name.localeCompare(b.name)).forEach((unit, unitIndex) => {
        const rooms = (Array.isArray(unit.rooms) && unit.rooms.length > 0) ? [...unit.rooms].sort() : ['N/A'];
        const rowBaseClass = unitIndex % 2 === 0 ? 'grid-row-light' : 'grid-row-dark';

        // Coluna "Unidade" ocupa 2 linhas por sala (manhã+tarde)
        const rowSpan = rooms.length * 2;
        fragment.appendChild(createDOMElement('div', {
            className: `unit-header ${rowBaseClass}`,
            textContent: unit.name,
            style: `grid-row: span ${rowSpan};`
        }));

        rooms.forEach(roomName => {
            ['Manhã', 'Tarde'].forEach(period => {
                // Coluna "Sala / Período"
                fragment.appendChild(createDOMElement('div', {
                    className: `period-header ${rowBaseClass}`,
                    children: [
                        createDOMElement('strong', { textContent: roomName }),
                        createDOMElement('span', { className: 'period-label', textContent: period })
                    ]
                }));

                weekDays.forEach(day => {
                    const dateString = day.toISOString().split('T')[0];
                    const isContinuousDay = continuousShiftCells.has(`${dateString}-${unit.id}-${roomName}`);

                    // Se manhã atravessa o almoço, a tarde é “consumida” por esse turno
                    if (period === 'Tarde' && isContinuousDay) return;

                    // >>> NOVO: pegar TODAS as alocações da célula (em vez de find(...))
                    const allocations = state.scheduleData()
                        .filter(s =>
                            s.date === dateString &&
                            s.unitId === unit.id &&
                            s.room === roomName &&
                            (isContinuousDay ? true : s.period === period)
                        )
                        .sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));

                    // Sempre cria uma drop-zone como contêiner (vazia ou com slots)
                    const dz = createDOMElement('div', {
                        className: 'drop-zone',
                        dataset: { date: dateString, unitId: unit.id, room: roomName, period }
                    });

                    if (allocations.length === 0) {
                        dz.textContent = 'Vago';
                    } else {
                        allocations.forEach(allocation => {
                            const professional = state.allProfessionals().find(p => p.id === allocation.professionalId);
                            const specialty = professional ? state.allSpecialties().find(s => s.id === professional.specialtyId) : null;

                            const slot = createDOMElement('div', {
                                className: `allocated-slot ${allocation.validated ? 'validated' : ''}`,
                                dataset: { scheduleId: allocation.id, recurringId: allocation.recurringId || '' },
                                innerHTML: `
                                    <div class="allocated-slot-header">${professional?.name || 'Não encontrado'}</div>
                                    <div class="allocated-slot-spec">${specialty?.name || 'N/A'}</div>
                                    <div class="allocated-slot-council">${professional?.conselhoTipo || 'CRM'}: ${professional?.conselho || 'N/A'}</div>
                                    <div class="allocated-slot-phone">${professional?.phone ? `📞 ${professional.phone}` : ''}</div>
                                    <div class="allocated-slot-time">${allocation.startTime || 'N/A'} - ${allocation.endTime || 'N/A'}</div>



                                    <div class="allocated-slot-actions">
                                        <button class="slot-action-btn edit-hours-btn" title="Editar Horário">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 18.5v-3.225l7.1-7.1 3.225 3.225-7.1 7.1H5Zm14.2-8.575L16.075 6.8l1.425-1.425q.575-.575 1.413-.575t1.412.575l.4.4q.575.575.575 1.413t-.575 1.412L19.2 9.925ZM3 20.5v-5.2l9.6-9.6q.3-.3.675-.45t.775-.15q.4 0 .775.15t.675.45l3.225 3.225q.3.3.45.675t.15.775q0 .4-.15.775t-.45.675L8.2 20.5H3Z"/></svg>
                                        </button>
                                        <button class="slot-action-btn validate-btn" title="Validar Presença">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="m9.55 18-5.7-5.7 1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4 9.55 18Z"/></svg>
                                        </button>
                                    </div>



                                `
                            });
                            slot.draggable = state.currentUserRole() === 'gestor';
                            dz.appendChild(slot);
                        });
                    }

                    fragment.appendChild(createDOMElement('div', {
                        className: `grid-cell ${rowBaseClass}`,
                        style: (period === 'Manhã' && isContinuousDay) ? 'grid-row: span 2; align-self: stretch;' : '',
                        children: [dz]
                    }));
                });
            });
        });
    });

    scheduleGrid.appendChild(fragment);
}





const createDOMElement = (tag, { className, textContent, dataset, style, children = [], innerHTML }) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    if (style) el.style.cssText = style;
    if (dataset) {
        for (const key in dataset) {
            el.dataset[key] = dataset[key];
        }
    }
    if (innerHTML) el.innerHTML = innerHTML;
    children.forEach(child => el.appendChild(child));
    return el;
};

function renderFullScheduleTable() {
    const tableBody = document.querySelector(selectors.tables.fullScheduleBody);
    if (!tableBody) return;

    tableBody.innerHTML = '';
    state.scheduleData().forEach(s => {
        const unit = state.allUnits().find(u => u.id === s.unitId) || {};
        const professional = state.allProfessionals().find(p => p.id === s.professionalId) || {};
        const specialty = state.allSpecialties().find(sp => sp.id === professional.specialtyId) || {};
        const row = createDOMElement('tr', {
            dataset: { scheduleId: s.id },
            innerHTML: `
                <td><input type="checkbox" class="row-checkbox" value="${s.id}"></td>
                <td>${new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${unit.name || 'N/A'}</td>
                <td>${s.room || 'N/A'}</td>
                <td>${s.period || 'N/A'}</td>
                <td>${professional.name || 'N/A'}</td>
                <td>${specialty.name || 'N/A'}</td>
                <td>${s.startTime} - ${s.endTime}</td>
                <td>${s.validated ? 'Sim' : 'Não'}</td>
            `
        });
        tableBody.appendChild(row);
    });
}

export function renderRegistrationPanels() {
    renderProfessionalsTable();
    renderSpecialtiesTable();
    renderUnitsAndRooms();
}

function renderProfessionalsTable() {
    const tableBody = document.querySelector(selectors.tables.professionalsBody);
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const validProfessionals = state.allProfessionals().filter(p => p && typeof p.name === 'string');

    validProfessionals.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
        const spec = state.allSpecialties().find(s => s.id === p.specialtyId);
        const row = createDOMElement('tr', {
            dataset: { id: p.id },
            innerHTML: `
                <td>${p.name}</td>
                <td>${spec ? spec.name : 'N/A'}</td>
                <td>${p.conselhoTipo || 'CRM'}: ${p.conselho || 'N/A'}</td>
                <td>${p.phone || 'N/A'}</td>
                <td>
                    <button class="edit-professional-btn" data-action="edit" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 18.5v-3.225l7.1-7.1 3.225 3.225-7.1 7.1H5Zm14.2-8.575L16.075 6.8l1.425-1.425q.575-.575 1.413-.575t1.412.575l.4.4q.575.575.575 1.413t-.575 1.412L19.2 9.925ZM3 20.5v-5.2l9.6-9.6q.3-.3.675-.45t.775-.15q.4 0 .775.15t.675.45l3.225 3.225q.3.3.45.675t.15.775q0 .4-.15.775t-.45.675L8.2 20.5H3Z"></path></svg></button>
                    <button class="delete-professional-btn" data-action="delete" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg></button>
                </td>
            `
        });
        tableBody.appendChild(row);
    });
}

function renderSpecialtiesTable() {
    const tableBody = document.querySelector(selectors.tables.specialtiesBody);
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const validSpecialties = state.allSpecialties().filter(s => s && typeof s.name === 'string');
    
    validSpecialties.sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
        const row = createDOMElement('tr', {
            dataset: { id: s.id },
            innerHTML: `
                <td>${s.name}</td>
                <td>${s.pacientesPorHora || 'N/A'}</td>
                <td>
                    <button class="edit-specialty-btn" data-action="edit" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 18.5v-3.225l7.1-7.1 3.225 3.225-7.1 7.1H5Zm14.2-8.575L16.075 6.8l1.425-1.425q.575-.575 1.413-.575t1.412.575l.4.4q.575.575.575 1.413t-.575 1.412L19.2 9.925ZM3 20.5v-5.2l9.6-9.6q.3-.3.675-.45t.775-.15q.4 0 .775.15t.675.45l3.225 3.225q.3.3.45.675t.15.775q0 .4-.15.775t-.45.675L8.2 20.5H3Z"></path></svg></button>
                    <button class="delete-specialty-btn" data-action="delete" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg></button>
                </td>
            `
        });
        tableBody.appendChild(row);
    });
}


function renderUnitsAndRooms() {
    const container = document.querySelector(selectors.pages.unitsContainer);
    if (!container) return;
    container.innerHTML = '';

    const validUnits = state.allUnits().filter(u => u && typeof u.name === 'string');

    validUnits.sort((a, b) => a.name.localeCompare(b.name)).forEach(u => {
        const roomsHTML = (u.rooms && u.rooms.length > 0)
            ? u.rooms.map(r => `
                <span>
                    ${r}
                    <button class="edit-room-btn" data-action="edit-room" data-unit-id="${u.id}" data-original-name="${r}" title="Editar Nome da Sala">✏️</button>
                    <button class="delete-room-btn" data-action="delete" data-unit-id="${u.id}" data-room-name="${r}" title="Excluir Sala">&times;</button>
                </span>
            `).join('')
            : '<p>Nenhuma sala cadastrada.</p>';

        const unitCard = createDOMElement('div', {
            className: 'unit-card',
            dataset: { id: u.id },
            innerHTML: `
                <h4>${u.name}</h4>
                <div class="unit-card-actions">
                    
                    <button class="edit-unit-btn" data-action="edit" title="Editar Unidade"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 18.5v-3.225l7.1-7.1 3.225 3.225-7.1 7.1H5Zm14.2-8.575L16.075 6.8l1.425-1.425q.575-.575 1.413-.575t1.412.575l.4.4q.575.575.575 1.413t-.575 1.412L19.2 9.925ZM3 20.5v-5.2l9.6-9.6q.3-.3.675-.45t.775-.15q.4 0 .775.15t.675.45l3.225 3.225q.3.3.45.675t.15.775q0 .4-.15.775t-.45.675L8.2 20.5H3Z"></path></svg></button>
                    <button class="delete-unit-btn" data-action="delete" title="Excluir Unidade"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg></button>
                </div>
                <div class="unit-card-rooms">${roomsHTML}</div>
            `
        });
        container.appendChild(unitCard);
    });
}


export function populateProfessionalForm(id) {
    const professional = state.allProfessionals().find(p => p.id === id);
    if (!professional) return;
    const form = document.querySelector(selectors.modals.professionalForm);
    form.querySelector('#professional-id').value = professional.id;
    form.querySelector('#professional-name').value = professional.name;
    form.querySelector('#professional-specialty').value = professional.specialtyId;
    form.querySelector('#professional-conselho-tipo').value = professional.conselhoTipo || 'CRM';
    form.querySelector('#professional-conselho').value = professional.conselho;
    form.querySelector('#professional-phone').value = professional.phone || '';
}

export function populateSpecialtyForm(id) {
    const specialty = state.allSpecialties().find(s => s.id === id);
    if (!specialty) return;
    const form = document.querySelector(selectors.modals.specialtyForm);
    form.querySelector('#specialty-id').value = specialty.id;
    form.querySelector('#specialty-name').value = specialty.name;
    form.querySelector('#specialty-patients-per-hour').value = specialty.pacientesPorHora || '';
}

export function populateUnitForm(id) {
    const unit = state.allUnits().find(u => u.id === id);
    if (!unit) return;
    const form = document.querySelector(selectors.modals.unitForm);
    form.querySelector('#unit-id').value = unit.id;
    form.querySelector('#unit-name-input').value = unit.name;
}

export function resetForm(formElement) {
    formElement.reset();
    const hiddenId = formElement.querySelector('input[type="hidden"]');
    if (hiddenId) hiddenId.value = '';
}


export function openPrintOptionsModal(type) {
    const modal = document.querySelector(selectors.modals.printOptions);
    const titleEl = document.getElementById('print-options-title');
    const form = document.querySelector(selectors.forms.printOptions);
    const select = document.getElementById('print-unit-filter');

    titleEl.textContent = `Imprimir Escala de ${type === 'doctors' ? 'Médicos' : 'Enfermagem'}`;
    form.dataset.type = type;

    select.innerHTML = '<option value="all">Todas as Unidades</option>';
    state.allUnits().forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
    });

    showModal(modal);
}

export function generatePrintableView(data, title, weekDates) {
    const unitMap = new Map();
    data.forEach(alloc => {
        const unit = state.allUnits().find(u => u.id === alloc.unitId);
        if (!unit) return;

        if (!unitMap.has(alloc.unitId)) {
            unitMap.set(alloc.unitId, { name: unit.name, days: new Map() });
        }
        const unitData = unitMap.get(alloc.unitId);

        if (!unitData.days.has(alloc.date)) {
            unitData.days.set(alloc.date, []);
        }
        unitData.days.get(alloc.date).push(alloc);
    });

    let bodyHtml = '';
    const sortedUnits = Array.from(unitMap.values()).sort((a,b) => a.name.localeCompare(b.name));

    for (const unitData of sortedUnits) {
        bodyHtml += `<h2>${unitData.name}</h2><table class="print-table">`;
        bodyHtml += `<thead><tr><th>Dia</th><th>Profissional</th><th>Telefone</th><th>Conselho</th><th>Horário</th></tr></thead><tbody>`;

        for (const date of weekDates.map(d => d.toISOString().split('T')[0])) {
            const allocations = unitData.days.get(date) || [];
            if (allocations.length > 0) {
                const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
                allocations.sort((a,b) => a.startTime.localeCompare(b.startTime));

                allocations.forEach((alloc, index) => {
                    const professional = state.allProfessionals().find(p => p.id === alloc.professionalId);
                    bodyHtml += `
                        <tr>
                            ${index === 0 ? `<td rowspan="${allocations.length}">${dateStr}</td>` : ''}
                            <td>${professional.name}</td>
                            <td>${professional.phone || 'N/A'}</td>
                            <td>${professional.conselhoTipo}: ${professional.conselho}</td>
                            <td>${alloc.startTime} - ${alloc.endTime}</td>
                        </tr>
                    `;
                });
            }
        }
        bodyHtml += `</tbody></table>`;
    }

    if (!bodyHtml) {
        bodyHtml = '<h2>Nenhuma alocação encontrada para os critérios selecionados.</h2>';
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    h1, h2 { color: #333; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
                    .print-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                    .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .print-table th { background-color: #f2f2f2; }
                    .print-table tr:nth-child(even) { background-color: #f9f9f9; }
                    @media print {
                        body { margin: 0; }
                        button { display: none; }
                        @page { size: A4 landscape; }
                    }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p>${getWeekDisplay(state.currentDate())}</p>
                <hr>
                ${bodyHtml}
                <script>
                    setTimeout(() => { window.print(); window.close(); }, 500);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}


export function switchDashboardTab(tabId) {
    document.querySelectorAll('.dashboard-filter-panel').forEach(panel => hideElement(panel));
    document.querySelectorAll(selectors.tabs.dashboardSubButton).forEach(btn => btn.classList.remove('active'));
    showElement(document.getElementById(tabId));
    document.querySelector(`[data-dashboard-tab="${tabId}"]`).classList.add('active');
}

function populateDashboardFilters() {
    const unitFilters = document.querySelectorAll('#dashboard-unit-filter-daily, #dashboard-unit-filter-date-range');
    unitFilters.forEach(select => {
        const selectedValue = select.value;
        select.innerHTML = '<option value="all">Todas as Unidades</option>';
        state.allUnits().sort((a,b) => a.name.localeCompare(b.name)).forEach(u => {
            select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
        });
        select.value = selectedValue || 'all';
    });
}

export function renderDashboard() {
    if (state.currentUserRole() !== 'gestor' || !document.getElementById('dashboard-panel')) return;

    populateDashboardFilters();

    const activeTab = document.querySelector(`${selectors.tabs.dashboardSubButton}.active`).dataset.dashboardTab;
    let filteredSchedule = [...state.scheduleData()];

    if (activeTab === 'daily-summary') {
        const unitId = document.getElementById('dashboard-unit-filter-daily').value;
        const period = document.getElementById('dashboard-time-filter-daily').value;
        const weekday = document.getElementById('dashboard-weekday-filter').value;

        if (unitId !== 'all') {
            filteredSchedule = filteredSchedule.filter(item => item.unitId === unitId);
        }
        if (period !== 'all') {
            filteredSchedule = filteredSchedule.filter(item => item.period === period);
        }
        if (weekday !== 'all') {
            filteredSchedule = filteredSchedule.filter(item => new Date(item.date + 'T00:00:00').getUTCDay().toString() === weekday);
        }
    } else { 
        const unitId = document.getElementById('dashboard-unit-filter-date-range').value;
        const startDate = document.getElementById('dashboard-start-date').value;
        const endDate = document.getElementById('dashboard-end-date').value;

        if (unitId !== 'all') {
            filteredSchedule = filteredSchedule.filter(item => item.unitId === unitId);
        }
        if (startDate) {
            filteredSchedule = filteredSchedule.filter(item => item.date >= startDate);
        }
        if (endDate) {
            filteredSchedule = filteredSchedule.filter(item => item.date <= endDate);
        }
    }

    document.getElementById('kpi-total-scheduled').textContent = filteredSchedule.length;
    document.getElementById('kpi-total-validated').textContent = filteredSchedule.filter(s => s.validated).length;

    renderDistributionChart(filteredSchedule);
    renderCapacityChart(filteredSchedule);
}

function renderDistributionChart(filteredSchedule) {
    const ctx = document.getElementById('distributionChart')?.getContext('2d');
    if (!ctx) return;

    if (distributionChartInstance) distributionChartInstance.destroy();

    const specialtyCounts = {};
    filteredSchedule.forEach(allocation => {
        const professional = state.allProfessionals().find(p => p.id === allocation.professionalId);
        if (professional) {
            const specialty = state.allSpecialties().find(s => s.id === professional.specialtyId);
            if(specialty) {
                 specialtyCounts[specialty.name] = (specialtyCounts[specialty.name] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(specialtyCounts);
    const data = Object.values(specialtyCounts);
    const colors = generateRandomColors(labels.length);

    distributionChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(255, 255, 255, 0.7)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.chart.getDatasetMeta(0).total;
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderCapacityChart(filteredSchedule) {
    const ctx = document.getElementById('capacityChart')?.getContext('2d');
    if (!ctx) return;

    if (capacityChartInstance) capacityChartInstance.destroy();

    const capacityBySpecialty = {};
    state.allSpecialties().forEach(spec => {
        capacityBySpecialty[spec.name] = 0;
    });

    filteredSchedule.forEach(s => {
        const professional = state.allProfessionals().find(p => p.id === s.professionalId);
        if (professional) {
            const spec = state.allSpecialties().find(sp => sp.id === professional.specialtyId);
            if (spec && s.startTime && s.endTime) {
                const start = new Date(`1970-01-01T${s.startTime}`);
                const end = new Date(`1970-01-01T${s.endTime}`);
                const hours = (end - start) / 3600000;
                const capacity = hours * (spec.pacientesPorHora || 1);
                capacityBySpecialty[spec.name] += capacity;
            }
        }
    });

    const labels = Object.keys(capacityBySpecialty);
    const data = Object.values(capacityBySpecialty);
    const colors = generateRandomColors(labels.length, 0.7);

    capacityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Capacidade de Atendimento (Nº de Pacientes)',
                data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

const generateRandomColors = (num, alpha = 0.6) => {
    const colors = [];
    for (let i = 0; i < num; i++) {
        const hue = i * (360 / 1.61803398875);
        colors.push(`hsla(${hue % 360}, 70%, 50%, ${alpha})`);
    }
    return colors;

};

export function switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    document.querySelectorAll('.tabs .tab-button').forEach(button => {
        button.classList.remove('active');
    });
    const panelToShow = document.getElementById(tabId);
    if (panelToShow) {
        panelToShow.classList.remove('hidden');
    }
    const buttonToActivate = document.querySelector(`.tabs .tab-button[data-tab='${tabId}']`);
    if (buttonToActivate) {
        buttonToActivate.classList.add('active');
    }
    if (tabId === 'dashboard-panel') {
        renderDashboard();
    }
}
