export const ROLES = {
    GESTOR: 'gestor',
    COLABORADOR: 'colaborador'
};

export const credentials = {
    GESTOR_USERNAME: "klinisaude",
    GESTOR_PASSWORD: "2580",
    DELETE_PASS: "excluir2580"
};

export const selectors = {
    pages: {
        login: '#login-page',
        app: '#app-page',
        scheduleGrid: '#schedule-grid',
        unitsContainer: '#units-container',
        removeZone: '#remove-zone',
    },

    modals: {
        gestorLogin: '#gestor-login-modal',
        notification: '#notification-modal',
        addOptions: '#add-options-modal',
        removeOptions: '#remove-options-modal',
        editHours: '#edit-hours-modal',
        editOptions: '#edit-options-modal',
        validation: '#validation-modal',
        timesheet: '#timesheet-modal',
        printOptions: '#print-options-modal',
        deletePassword: '#delete-password-modal',
        professionalForm: '#professional-form-modal',
        specialtyForm: '#specialty-form-modal',
        unitForm: '#unit-form-modal',
        addRoomForm: '#add-room-form',
    },

    buttons: {
        loginGestor: '#login-gestor',
        loginColaborador: '#login-colaborador',
        notificationOk: '#notification-ok-btn',
        prevWeek: '#prev-week',
        nextWeek: '#next-week',
        addOnce: '#add-once-btn',
        addRecurring: '#add-recurring-btn',
        removeOne: '#remove-one-btn',
        removeFuture: '#remove-future-btn',
        removeAll: '#remove-all-btn',
        editOne: '#edit-one-btn',
        editFuture: '#edit-future-btn',
        exportCsv: '#export-csv-btn',
        exportTimesheet: '#export-timesheet-btn',
        exportDb: '#export-db-btn',
        printDoctorsSchedule: '#print-doctors-schedule-btn',
        printNursesSchedule: '#print-nurses-schedule-btn',
        deleteSelected: '#delete-selected-btn',
        editHours: '.edit-hours-btn',
        validate: '.validate-btn',
        edit: '[data-action="edit"]',
        delete: '[data-action="delete"]',
    },

    forms: {
        gestorLogin: '#gestor-login-form',
        editHours: '#edit-hours-form',
        validation: '#validation-form',
        timesheet: '#timesheet-form',
        printOptions: '#print-options-form',
        deletePassword: '#delete-password-form',
    },
    inputs: {
        gestorUsername: '#gestor-username',
        gestorPassword: '#gestor-password',
        editStartTime: '#edit-start-time',
        editEndTime: '#edit-end-time',
        validationStatus: '#validation-status',
        validationObservation: '#validation-observation',
        validationProfessionalName: '#validation-professional-name',
        importCsv: '#import-csv-input',
        selectAllRowsCheckbox: '#select-all-rows',
        deletePassword: '#delete-password-input',
    },
    
    filters: {
        unit: '#unit-filter',
        specialtyMain: '#specialty-filter-main',
        specialtySidebar: '#specialty-filter-sidebar',
    },
    tabs: {
        container: '.tabs',
        subContainer: '.sub-tabs',
        dashboardSubContainer: '.dashboard-sub-tabs',
        button: '.tab-button',
        subButton: '.sub-tab-button',
        dashboardSubButton: '.dashboard-sub-tab-button',
        panel: '.tab-panel',
        subPanel: '.sub-tab-panel',
    },

    tables: {
        fullSchedule: '#full-schedule-table',
        fullScheduleBody: '#full-schedule-table tbody',
        professionalsBody: '#professionals-table-body',
        specialtiesBody: '#specialties-table-body',
    },

    ui: {
        mainTitle: '.main-title',
        loginErrorMsg: '#login-error-msg',
        deletePasswordErrorMsg: '#delete-password-error-msg',
    },
    
    states: {
        hiddenClass: 'hidden',
        draggingClass: 'dragging',
        dragOverClass: 'drag-over',
        activeTabClass: 'active',
    },
    dataAttributes: {
        draggableItem: '.draggable',
        allocatedSlot: '.allocated-slot',
        dropZone: '.drop-zone',
    },
};

export const constants = {
    RECURRING_WEEKS: 52,
    DEFAULT_MORNING_START: '07:00',
    DEFAULT_MORNING_END: '13:00',
    DEFAULT_AFTERNOON_START: '13:00',
    DEFAULT_AFTERNOON_END: '19:00',
};