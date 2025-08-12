import * as state from './state.js';
import * as ui from './ui.js';
import * as firebaseService from '../services/firebaseService.js';
import { selectors, constants, credentials, ROLES } from './config.js';
import { getWeekDates } from '../utils/dateUtils.js';

function handleError(error, userMessage) {
    console.error(userMessage, error);
    ui.showNotification(userMessage, "Erro");
}

async function confirmDeletionWithPassword(deleteCallback) {
    state.setCurrentActionContext({ onConfirmDelete: deleteCallback });
    const passwordModal = document.querySelector(selectors.modals.deletePassword);
    const errorMsg = passwordModal.querySelector(selectors.ui.deletePasswordErrorMsg);
    const passwordInput = passwordModal.querySelector(selectors.inputs.deletePassword);
    
    errorMsg.classList.add('hidden');
    passwordInput.value = '';
    ui.showModal(passwordModal);
}

export function goToPreviousWeek() {
    const newDate = new Date(state.currentDate());
    newDate.setDate(newDate.getDate() - 7);
    state.setCurrentDate(newDate);
}

export function goToNextWeek() {
    const newDate = new Date(state.currentDate());
    newDate.setDate(newDate.getDate() + 7);
    state.setCurrentDate(newDate);
}

export function handleTabSwitch(e) {
    const tabButton = e.target.closest(selectors.tabs.button);
    if (!tabButton) return;

    const container = tabButton.closest(selectors.tabs.container);
    container.querySelector('.active')?.classList.remove('active');
    tabButton.classList.add('active');

    document.querySelectorAll(selectors.tabs.panel).forEach(panel => panel.classList.add('hidden'));
    const activePanel = document.getElementById(tabButton.dataset.tab);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        if (activePanel.id === 'dashboard-panel') {
            ui.renderDashboard();
        }
    }
}

export function handleExportRawCsv() {
    const headers = ["ID Alocação", "Data", "ID Unidade", "Nome Unidade", "Sala", "Período", "ID Profissional", "Nome Profissional", "ID Especialidade", "Nome Especialidade", "Início", "Fim", "Validado", "Observação", "ID Recorrência"];
    
    const rows = state.scheduleData().map(s => {
        const unit = state.allUnits().find(u => u.id === s.unitId) || {};
        const professional = state.allProfessionals().find(p => p.id === s.professionalId) || {};
        const specialty = state.allSpecialties().find(sp => sp.id === professional.specialtyId) || {};
        return [ s.id, s.date, s.unitId, unit.name, s.room, s.period, s.professionalId, professional.name, specialty.id, specialty.name, s.startTime, s.endTime, s.validated, s.observation || '', s.recurringId || '' ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    ui.downloadCsv(csvContent, 'dados_brutos_escala.csv');
}

export function handleOpenTimesheetModal() {
    ui.showModal(document.querySelector(selectors.modals.timesheet));
}

export function handleExportTimesheet(form) {
    const startDate = form.querySelector('#timesheet-start-date').value;
    const endDate = form.querySelector('#timesheet-end-date').value;
    const filteredData = state.scheduleData().filter(s => s.date >= startDate && s.date <= endDate);
    const headers = ["Profissional", "Data", "Unidade", "Horário Agendado", "Status", "Observação"];
    
    const rows = filteredData.map(s => {
        const professional = state.allProfessionals().find(p => p.id === s.professionalId) || {};
        const unit = state.allUnits().find(u => u.id === s.unitId) || {};
        const status = s.validated === true ? 'Presente' : (s.validated === false ? 'Ausente' : 'Não validado');
        return [`"${professional.name}"`, new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR'), `"${unit.name}"`, `${s.startTime}-${s.endTime}`, status, `"${s.observation || ''}"`].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    ui.downloadCsv(csvContent, `folha_de_ponto_${startDate}_a_${endDate}.csv`);
    ui.hideModal(document.querySelector(selectors.modals.timesheet));
    form.reset();
}

export function handleImportCsv(e) {
}


export function handleExportDatabase() {
    try {
        const backupData = { units: state.allUnits(), specialties: state.allSpecialties(), professionals: state.allProfessionals(), schedule: state.scheduleData() };
        ui.downloadJson(backupData, `backup-escala-medica-${new Date().toISOString().split('T')[0]}.json`);
        ui.showNotification("Backup exportado com sucesso.", "Sucesso");
    } catch (error) {
        handleError(error, "Ocorreu um erro ao gerar o backup.");
    }
}

export function handleSelectAllRows(e) {
    document.querySelectorAll(`${selectors.tables.fullSchedule} .row-checkbox`).forEach(cb => cb.checked = e.target.checked);
}

export async function handleDeleteSelected() {
    const idsToDelete = Array.from(document.querySelectorAll(`${selectors.tables.fullSchedule} .row-checkbox:checked`)).map(cb => cb.value);
    if (idsToDelete.length === 0) {
        return ui.showNotification("Nenhuma linha selecionada para exclusão.", "Aviso");
    }
    
    const deleteCallback = async () => {
        try {
            await firebaseService.deleteMultipleAllocations(idsToDelete);
            ui.showNotification(`${idsToDelete.length} alocação(ões) foram apagadas.`, "Sucesso");
            document.querySelector(selectors.inputs.selectAllRowsCheckbox).checked = false;
        } catch(error) {
            handleError(error, "Erro ao apagar as alocações selecionadas.");
        }
    };
    await confirmDeletionWithPassword(deleteCallback);
}

export function openPrintOptionsModal(type) {
    ui.openPrintOptionsModal(type);
}

export function handleGeneratePrint(form) {
    const type = form.dataset.type;
    const unitId = form.querySelector('#print-unit-filter').value;
    const weekDates = getWeekDates(state.currentDate());
    const professionalFilter = type === 'doctors' ? (prof) => (prof.conselhoTipo || 'CRM') === 'CRM' : (prof) => prof.conselhoTipo === 'COREN';

    const filteredSchedule = state.scheduleData().filter(alloc => {
        const professional = state.allProfessionals().find(p => p.id === alloc.professionalId);
        return professional && professionalFilter(professional) &&
               weekDates.some(d => d.toISOString().split('T')[0] === alloc.date) &&
               (unitId === 'all' || alloc.unitId === unitId);
    });

    const title = `Escala de ${type === 'doctors' ? 'Médicos' : 'Enfermagem'}`;
    ui.generatePrintableView(filteredSchedule, title, weekDates);
    ui.hideModal(document.querySelector(selectors.modals.printOptions));
}

export function handleDragStart(e) {
    if (state.currentUserRole() !== ROLES.GESTOR) return;
    const draggable = e.target.closest(selectors.dataAttributes.draggableItem) || e.target.closest(selectors.dataAttributes.allocatedSlot);
    if (draggable) {
        state.setDraggedItem(draggable);
        setTimeout(() => draggable.classList.add(selectors.states.draggingClass), 0);
    }
}

export function handleDragEnd() {
    const draggedItem = state.draggedItem();
    if (draggedItem) {
        draggedItem.classList.remove(selectors.states.draggingClass);
        state.setDraggedItem(null);
    }
}

export function handleDragOver(e) {
    if (state.currentUserRole() !== ROLES.GESTOR || !state.draggedItem()) return;
    e.preventDefault();
}

export async function handleDrop(e) {
    if (state.currentUserRole() !== ROLES.GESTOR || !state.draggedItem()) return;
    e.preventDefault();
    
    const dropTarget = e.target.closest(`${selectors.dataAttributes.dropZone}, ${selectors.pages.removeZone}`);
    if (!dropTarget) return;

    if (dropTarget.matches(selectors.pages.removeZone)) {
        await handleRemoveDrop();
    } else {
        await handleScheduleDrop(dropTarget);
    }
}





async function handleScheduleDrop(target) {
  const draggedItem = state.draggedItem();
  const isMoving = !!draggedItem.dataset.scheduleId;

  try {
    if (isMoving) {
      await firebaseService.moveAllocation(draggedItem.dataset.scheduleId, target.dataset);
      ui.showNotification("Alocação movida. A recorrência foi desfeita.", "Sucesso");
    } else {
      state.setCurrentActionContext({ professionalId: draggedItem.dataset.professionalId, ...target.dataset, period: target.dataset.period });
      ui.showModal(document.querySelector(selectors.modals.addOptions));
    }
  } catch (error) {
    handleError(error, "Erro ao processar a alocação.");
  }
}

async function handleRemoveDrop() {
    const draggedItem = state.draggedItem();
    if (!draggedItem.dataset.scheduleId) return;

    const { scheduleId, recurringId } = draggedItem.dataset;
    state.setCurrentActionContext({ scheduleId, recurringId });

    if (recurringId && recurringId !== 'null') {
        ui.showModal(document.querySelector(selectors.modals.removeOptions));
    } else {
        await confirmDeletionWithPassword(async () => {
            try {
                await firebaseService.removeAllocation('one', scheduleId);
                ui.showNotification("Alocação removida.", "Sucesso");
            } catch (error) { handleError(error, "Erro ao remover alocação."); }
        });
    }
}


export async function handleAddOnce() {
  ui.hideModal(document.querySelector(selectors.modals.addOptions));
  const { professionalId, date, unitId, room, period } = state.currentActionContext();
  const professional = state.allProfessionals().find(p => p.id === professionalId);
  if (!professional) return handleError(new Error("Profissional não encontrado"), "Profissional não encontrado.");

  const isMorning = period === 'Manhã';
  let start = isMorning ? constants.DEFAULT_MORNING_START  : constants.DEFAULT_AFTERNOON_START;
  const end = isMorning ? constants.DEFAULT_MORNING_END    : constants.DEFAULT_AFTERNOON_END;

  // NOVO: pega alocações no mesmo dia/sala/período, ordena e encaixa após a última
  const existing = state.scheduleData()
    .filter(s => s.date === date && s.unitId === unitId && s.room === room && s.period === period)
    .sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));

  if (existing.length > 0) {
    const last = existing[existing.length - 1];
    if (last.endTime && last.endTime < end) {
      start = last.endTime;
    }
  }

  const newAllocation = { professionalId, date, unitId, room, period, startTime: start, endTime: end, recurringId: null };

  try {
    await firebaseService.createSingleAllocation(newAllocation);
    ui.showNotification("Profissional alocado com sucesso.", "Sucesso");
  } catch (error) {
    handleError(error, "Erro ao alocar profissional.");
  }
}









export async function handleAddRecurring() {
    ui.hideModal(document.querySelector(selectors.modals.addOptions));
    const { professionalId, date, unitId, room, period } = state.currentActionContext();
    const professional = state.allProfessionals().find(p => p.id === professionalId);
    if (!professional) return handleError(new Error("Profissional não encontrado"), "Profissional não encontrado.");

    const isMorning = period === 'Manhã';
    const baseData = { professionalId, unitId, room, period, startTime: isMorning ? constants.DEFAULT_MORNING_START : constants.DEFAULT_AFTERNOON_START, endTime: isMorning ? constants.DEFAULT_MORNING_END : constants.DEFAULT_AFTERNOON_END };
    
    try {
        ui.showNotification("Processando alocação recorrente...", "Aguarde");
        await firebaseService.createRecurringAllocations(baseData, new Date(date + 'T12:00:00Z'), state.scheduleData());
        ui.showNotification("Alocação recorrente criada com sucesso.", "Sucesso");
    } catch (error) { handleError(error, "Erro ao criar alocação recorrente."); }
}

export async function handleRemoveRecurring(type) {
    ui.hideModal(document.querySelector(selectors.modals.removeOptions));
    const { scheduleId, recurringId } = state.currentActionContext();
    const originalDoc = state.scheduleData().find(s => s.id === scheduleId);
    
    await confirmDeletionWithPassword(async () => {
        try {
            await firebaseService.removeAllocation(type, scheduleId, recurringId, originalDoc.date);
            ui.showNotification("Alocação(ões) removida(s) com sucesso.", "Sucesso");
        } catch(error) { handleError(error, "Erro ao remover alocação(ões)."); }
    });
}

export function handleEditHoursClick(editBtn) {
    const slot = editBtn.closest(selectors.dataAttributes.allocatedSlot);
    const allocation = state.scheduleData().find(s => s.id === slot.dataset.scheduleId);
    if (!allocation) return;

    state.setCurrentActionContext({ scheduleId: allocation.id, recurringId: allocation.recurringId });
    document.querySelector(selectors.inputs.editStartTime).value = allocation.startTime || '';
    document.querySelector(selectors.inputs.editEndTime).value = allocation.endTime || '';
    ui.showModal(document.querySelector(selectors.modals.editHours));
}

export function handleSaveHours(e) {
    e.preventDefault();
    const { scheduleId, recurringId } = state.currentActionContext();
    const startTime = document.querySelector(selectors.inputs.editStartTime).value;
    const endTime = document.querySelector(selectors.inputs.editEndTime).value;
    const period = parseInt(startTime.split(':')[0], 10) < 13 ? 'Manhã' : 'Tarde';
    
    state.setCurrentActionContext({ newTimes: { startTime, endTime, period } });
    ui.hideModal(document.querySelector(selectors.modals.editHours));

    if (recurringId && recurringId !== 'null') {
        ui.showModal(document.querySelector(selectors.modals.editOptions));
    } else {
        firebaseService.updateAllocationHours('one', scheduleId, null, null, { startTime, endTime, period })
            .then(() => ui.showNotification("Horário atualizado com sucesso.", "Sucesso"))
            .catch(err => handleError(err, "Erro ao atualizar horário."));
    }
}

export async function handleUpdateRecurringHours(type) {
    ui.hideModal(document.querySelector(selectors.modals.editOptions));
    const { scheduleId, recurringId, newTimes } = state.currentActionContext();
    const originalDoc = state.scheduleData().find(s => s.id === scheduleId);

    try {
        await firebaseService.updateAllocationHours(type, scheduleId, recurringId, originalDoc.date, newTimes);
        ui.showNotification("Horário(s) atualizado(s) com sucesso.", "Sucesso");
    } catch(error) {
        handleError(error, "Erro ao atualizar horário(s) recorrente(s).");
    }
}

export function handleValidateClick(validateBtn) {
    const slot = validateBtn.closest(selectors.dataAttributes.allocatedSlot);
    const allocation = state.scheduleData().find(s => s.id === slot.dataset.scheduleId);
    const professional = state.allProfessionals().find(p => p.id === allocation.professionalId);
    if (!allocation || !professional) return;
    
    state.setCurrentActionContext({ scheduleId: allocation.id });
    document.querySelector(selectors.inputs.validationProfessionalName).textContent = professional.name;
    document.querySelector(selectors.inputs.validationStatus).value = 'true';
    document.querySelector(selectors.inputs.validationObservation).value = allocation.observation || '';
    ui.showModal(document.querySelector(selectors.modals.validation));
}

export function handleSaveValidation(form) {
    const { scheduleId } = state.currentActionContext();
    const isValidated = form.querySelector(selectors.inputs.validationStatus).value === 'true';
    const observation = form.querySelector(selectors.inputs.validationObservation).value;

    firebaseService.saveValidation(scheduleId, isValidated, observation)
        .then(() => ui.showNotification("Validação salva.", "Sucesso"))
        .catch(err => handleError(err, "Erro ao salvar validação."))
        .finally(() => ui.hideModal(document.querySelector(selectors.modals.validation)));
}


export function handleEditClick(e) {
    const button = e.target.closest(selectors.buttons.edit);
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;

    if (button.closest(selectors.tables.professionalsBody)) {
        ui.populateProfessionalForm(id);
    } else if (button.closest(selectors.tables.specialtiesBody)) {
        ui.populateSpecialtyForm(id);
    } else if (button.closest(selectors.pages.unitsContainer)) {
        // As linhas devem ficar DENTRO deste bloco
        ui.populateUnitForm(id);
        document.querySelector(selectors.modals.unitForm).scrollIntoView({ behavior: 'smooth', block: 'center' });
        ui.showNotification("Formulário preenchido para edição.", "Aviso");
    }
}


async function crudSubmit(form, type, id) {
    let data;
    if (type === 'Professional') data = { name: form.querySelector('#professional-name').value, specialtyId: form.querySelector('#professional-specialty').value, conselho: form.querySelector('#professional-conselho').value, conselhoTipo: form.querySelector('#professional-conselho-tipo').value, phone: form.querySelector('#professional-phone').value };
    else if (type === 'Specialty') data = { name: form.querySelector('#specialty-name').value, pacientesPorHora: Number(form.querySelector('#specialty-patients-per-hour').value) };
    else {
        const unitData = state.allUnits().find(u => u.id === id);
        data = { name: form.querySelector('#unit-name-input').value, rooms: unitData ? unitData.rooms : [] };
    }

    try {
        const action = id ? 'atualizado' : 'adicionado';
        await (id ? firebaseService[`update${type}`](id, data) : firebaseService[`add${type}`](data));
        ui.showNotification(`${type} ${action} com sucesso.`, "Sucesso");
        ui.resetForm(form);
    } catch (error) { handleError(error, `Erro ao salvar ${type}.`); }
}

export async function handleSaveProfessional(e) { await crudSubmit(e.target, 'Professional', e.target.querySelector('#professional-id').value); }
export async function handleSaveSpecialty(e) { await crudSubmit(e.target, 'Specialty', e.target.querySelector('#specialty-id').value); }
export async function handleSaveUnit(e) { await crudSubmit(e.target, 'Unit', e.target.querySelector('#unit-id').value); }



async function crudDelete(id, type, checkUsage) {
    if (checkUsage()) {
        return ui.showNotification(`Não é possível excluir. ${type} está em uso.`, "Ação Bloqueada");
    }
    await confirmDeletionWithPassword(async () => {
        try {
            let deleteFunction;
            switch (type) {
                case 'Profissional':
                    deleteFunction = firebaseService.deleteProfessional;
                    break;
                case 'Especialidade':
                    deleteFunction = firebaseService.deleteSpecialty;
                    break;
                case 'Unidade':
                    deleteFunction = firebaseService.deleteUnit;
                    break;
                default:
                    throw new Error(`Tipo de exclusão desconhecido: ${type}`);
            }
            await deleteFunction(id);
            ui.showNotification(`${type} excluído.`, "Sucesso");
        } catch (error) { 
            handleError(error, "Erro ao excluir."); 
        }
    });
}



export async function handleDeleteProfessional(e) {
    const id = e.target.closest('[data-id]').dataset.id;
    await crudDelete(id, 'Profissional', () => state.scheduleData().some(s => s.professionalId === id));
}
export async function handleDeleteSpecialty(e) {
    const id = e.target.closest('[data-id]').dataset.id;
    await crudDelete(id, 'Especialidade', () => state.allProfessionals().some(p => p.specialtyId === id));
}
export async function handleDeleteUnit(e) {
    const id = e.target.closest('[data-id]').dataset.id;
    await crudDelete(id, 'Unidade', () => state.scheduleData().some(s => s.unitId === id));
}

export async function handleAddRoom(e) {
    e.preventDefault();
    const form = e.target;
    const unitId = form.querySelector('#unit-select-for-room').value;
    const roomName = form.querySelector('#room-name-input').value;
    if (!unitId || !roomName) return;
    try {
        await firebaseService.addRoomToUnit(unitId, roomName);
        ui.showNotification("Sala adicionada.", "Sucesso");
        form.reset();
    } catch (error) { handleError(error, "Erro ao adicionar sala."); }
}




export async function handleRemoveRoom(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const { unitId, roomName } = button.dataset;

    const isInUse = state.scheduleData().some(s => s.unitId === unitId && s.room === roomName);
    if (isInUse) {
        return ui.showNotification(`A sala "${roomName}" possui agendamentos e não pode ser removida.`, "Ação Bloqueada");
    }

    const deleteCallback = async () => {
        try {
            await firebaseService.removeRoomFromUnit(unitId, roomName);
            ui.showNotification("Sala removida com sucesso.", "Sucesso");
        } catch (error) {
            handleError(error, "Erro ao remover a sala.");
        }
    };
    await confirmDeletionWithPassword(deleteCallback);
}


export async function handleEditRoomClick(e) {
    const button = e.target.closest('[data-action="edit-room"]');
    if (!button) return;

    const { unitId, originalName } = button.dataset;

    const newName = prompt(`Digite o novo nome para a sala "${originalName}":`, originalName);

    if (!newName || newName.trim() === '' || newName === originalName) {
        ui.showNotification("Edição cancelada ou nome inválido.", "Aviso");
        return;
    }

    try {
        await firebaseService.updateRoomInUnit(unitId, originalName, newName.trim());
        ui.showNotification("Nome da sala atualizado com sucesso!", "Sucesso");
    } catch (error) {
        handleError(error, `Erro ao atualizar a sala: ${error.message || error}`);
    }
}





export function handleDashboardTabSwitch(e) {
    const tabButton = e.target.closest(selectors.tabs.dashboardSubButton);
    if (!tabButton) return;

    const tabId = tabButton.dataset.dashboardTab;
    if (tabId) {
        ui.switchDashboardTab(tabId);
        ui.renderDashboard();
    }
}


export function handleSubTabSwitch(e) {
    const tabButton = e.target.closest(selectors.tabs.subButton);
    if (!tabButton) return;

    const navContainer = tabButton.closest('.sub-tabs');
    if (navContainer) {
        navContainer.querySelector('.active')?.classList.remove('active');
    }
    tabButton.classList.add('active');

    const registrationPanel = document.getElementById('registration-management-panel');
    if (registrationPanel) {
        registrationPanel.querySelectorAll(selectors.tabs.subPanel).forEach(panel => {
            panel.classList.add('hidden');
        });
    }

    const subTabId = `subtab-${tabButton.dataset.subtab}`;
    const panelToShow = document.getElementById(subTabId);
    if (panelToShow) {
        panelToShow.classList.remove('hidden');
    }
}
