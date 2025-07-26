import * as firebaseService from '../services/firebaseService.js';

const state = {
    currentUserRole: null,
    currentDate: new Date(),
    allUnits: [],
    allSpecialties: [],
    allProfessionals: [],
    scheduleData: [],
    draggedItem: null,
    currentActionContext: {},
    initialLoadStatus: {
        units: false,
        specialties: false,
        professionals: false,
        schedule: false,
    },
    isInitialLoadComplete: false,
};

const listeners = {
    render: null,
    initialLoad: null,
};

export function initializeListeners(renderCallback, initialLoadCallback) {
    listeners.render = renderCallback;
    listeners.initialLoad = initialLoadCallback;
    
    firebaseService.listenToCollection('units', (data) => updateState('allUnits', data, 'units'));
    firebaseService.listenToCollection('specialties', (data) => updateState('allSpecialties', data, 'specialties'));
    firebaseService.listenToCollection('professionals', (data) => updateState('allProfessionals', data, 'professionals'));
    firebaseService.listenToCollection('schedule', (data) => updateState('scheduleData', data, 'schedule'));
}

function updateState(key, value, loadFlagKey) {
    state[key] = value;
    
    if (loadFlagKey) {
        state.initialLoadStatus[loadFlagKey] = true;
    }
    if (state.isInitialLoadComplete && listeners.render) {
        listeners.render();
    }    
    checkInitialLoad();
}

function checkInitialLoad() {
    if (state.isInitialLoadComplete) {
        return;
    }

    const allDataLoaded = Object.values(state.initialLoadStatus).every(status => status === true);
                      
    if (allDataLoaded) {
        state.isInitialLoadComplete = true;
        console.log("Todas as coleções foram carregadas. Disparando callback de carga inicial.");
        if (listeners.initialLoad) {
            listeners.initialLoad();
        }
    }
}


export function setCurrentUserRole(role) {
    state.currentUserRole = role;
}
export const currentUserRole = () => state.currentUserRole;

export function setCurrentDate(date) {
    state.currentDate = date;
    if (listeners.render) listeners.render();
}
export const currentDate = () => state.currentDate;

export function setDraggedItem(item) {
    state.draggedItem = item;
}
export const draggedItem = () => state.draggedItem;

export function setCurrentActionContext(context) {
    state.currentActionContext = { ...state.currentActionContext, ...context };
}
export const currentActionContext = () => state.currentActionContext;
export const allUnits = () => state.allUnits;
export const allSpecialties = () => state.allSpecialties;
export const allProfessionals = () => state.allProfessionals;
export const scheduleData = () => state.scheduleData;