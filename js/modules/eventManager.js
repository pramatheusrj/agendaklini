import * as actions from './actions.js';
import * as auth from './auth.js';
import * as ui from './ui.js';
import { selectors, ROLES, credentials } from './config.js';
import * as state from './state.js';

export function attachLoginListeners(onLoginSuccess) {
    document.addEventListener('click', (e) => {
        if (e.target.closest(selectors.buttons.loginGestor)) {
            ui.showModal(document.querySelector(selectors.modals.gestorLogin));
        } else if (e.target.closest(selectors.buttons.loginColaborador)) {
            onLoginSuccess(ROLES.COLABORADOR);
        } else if (e.target.closest('#cancel-login-btn')) {
            ui.hideModal(document.querySelector(selectors.modals.gestorLogin));
        }
    });

    document.querySelector(selectors.forms.gestorLogin).addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.querySelector(selectors.inputs.gestorUsername).value;
        const pass = document.querySelector(selectors.inputs.gestorPassword).value;
        const role = auth.attemptLogin(user, pass);
        if (role) {
            ui.hideModal(document.querySelector(selectors.modals.gestorLogin));
            onLoginSuccess(role);
        }
    });
}

export function attachAppListeners() {
    document.addEventListener('click', handleAppClick);
    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('change', handleInputChange);
    document.addEventListener('dragstart', actions.handleDragStart);
    document.addEventListener('dragend', actions.handleDragEnd);
    document.addEventListener('dragover', actions.handleDragOver);
    document.addEventListener('drop', actions.handleDrop);
}

function handleAppClick(e) {
    if (!document.body.contains(document.querySelector(selectors.pages.app)) || document.querySelector(selectors.pages.app).classList.contains('hidden')) {
        return;
    }

    const target = e.target;

    const buttonActions = {
        [selectors.buttons.notificationOk]: () => ui.hideModal(target.closest('.modal')),
        [selectors.buttons.prevWeek]: actions.goToPreviousWeek,
        [selectors.buttons.nextWeek]: actions.goToNextWeek,
        [selectors.buttons.addOnce]: actions.handleAddOnce,
        [selectors.buttons.addRecurring]: actions.handleAddRecurring,
        [selectors.buttons.removeOne]: () => actions.handleRemoveRecurring('one'),
        [selectors.buttons.removeFuture]: () => actions.handleRemoveRecurring('future'),
        [selectors.buttons.removeAll]: () => actions.handleRemoveRecurring('all'),
        [selectors.buttons.editOne]: () => actions.handleUpdateRecurringHours('one'),
        [selectors.buttons.editFuture]: () => actions.handleUpdateRecurringHours('future'),
        [selectors.buttons.exportCsv]: actions.handleExportRawCsv,
        [selectors.buttons.exportTimesheet]: actions.handleOpenTimesheetModal,
        [selectors.buttons.exportDb]: actions.handleExportDatabase,
        [selectors.buttons.deleteSelected]: actions.handleDeleteSelected,
        [selectors.buttons.printDoctorsSchedule]: () => actions.openPrintOptionsModal('doctors'),
        [selectors.buttons.printNursesSchedule]: () => actions.openPrintOptionsModal('nurses'),
    };

    for (const selector in buttonActions) {
        if (target.closest(selector)) {
            e.preventDefault();
            buttonActions[selector]();
            return;
        }
    }
    
    if (target.closest(selectors.tabs.button)) {
        actions.handleTabSwitch(e);
        return;
    }
    if (target.closest(selectors.tabs.subButton)) {
        actions.handleSubTabSwitch(e);
        return;
    }
    if (target.closest(selectors.tabs.dashboardSubButton)) {
        actions.handleDashboardTabSwitch(e);
        return;
    }
    
    if (target.closest(selectors.buttons.editHours)) {
        actions.handleEditHoursClick(target);
        return;
    }

    if (target.closest(selectors.buttons.validate)) {
        actions.handleValidateClick(target);
        return;
    }
    
    if (target.closest('[data-action="edit-room"]')) {
        actions.handleEditRoomClick(e);
        return;
    }

    if (target.closest('[data-action="edit"]')) {
        actions.handleEditClick(e);
        return;
    }

    if (target.closest('[data-action="delete"]')) {
        if (target.closest(selectors.tables.professionalsBody)) {
            actions.handleDeleteProfessional(e);
        } else if (target.closest(selectors.tables.specialtiesBody)) {
            actions.handleDeleteSpecialty(e);
        }
        else if (target.closest('[data-room-name]')) {
            actions.handleRemoveRoom(e);
        } 
        else if (target.closest('.unit-card')) {
            actions.handleDeleteUnit(e);
        }
        return;
    }
    if (target.closest('.modal-button.btn-secondary')) {
        ui.hideModal(target.closest('.modal'));
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    const formActions = {
        'professional-form-modal': () => actions.handleSaveProfessional(e),
        'specialty-form-modal': () => actions.handleSaveSpecialty(e),
        'unit-form-modal': () => actions.handleSaveUnit(e),
        'add-room-form': () => actions.handleAddRoom(e),
        'edit-hours-form': () => actions.handleSaveHours(e),
        'validation-form': () => actions.handleSaveValidation(form),
        'timesheet-form': () => actions.handleExportTimesheet(form),
        'print-options-form': () => actions.handleGeneratePrint(form),
        'delete-password-form': () => {
             const passwordInput = form.querySelector(selectors.inputs.deletePassword);
             if (!passwordInput) return;
             const password = passwordInput.value;

             if (password === credentials.DELETE_PASS) {
                 const currentContext = state.currentActionContext();
                 if (currentContext && typeof currentContext.onConfirmDelete === 'function') {
                     currentContext.onConfirmDelete();
                 }
                 ui.hideModal(form.closest('.modal'));
                 form.reset();
             } else {
                 const errorMsg = form.querySelector(selectors.ui.deletePasswordErrorMsg);
                 if(errorMsg) ui.showElement(errorMsg);
             }
        }
    };
    
    if (formActions[form.id]) {
        formActions[form.id]();
    }
}

function handleInputChange(e) {
    const targetId = e.target.id;
    const dashboardFilterIds = ['dashboard-unit-filter-daily', 'dashboard-time-filter-daily', 'dashboard-weekday-filter', 'dashboard-unit-filter-date-range', 'dashboard-start-date', 'dashboard-end-date'];

    if (['specialty-filter-sidebar', 'unit-filter', 'specialty-filter-main'].includes(targetId)) {
        ui.render();
    } else if (dashboardFilterIds.includes(targetId)) {
        ui.renderDashboard();
    } else if (targetId === 'select-all-rows') {
        actions.handleSelectAllRows(e);
    }
}