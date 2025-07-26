import { db, scheduleRef, professionalsRef, specialtiesRef, unitsRef } from '../firebase-config.js';
import { 
    doc, addDoc, deleteDoc, updateDoc, query, where, writeBatch, getDocs, arrayUnion, arrayRemove, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { constants } from '../modules/config.js';

export function listenToCollection(collectionName, callback) {
    let collectionRef;
    switch (collectionName) {
        case 'units': collectionRef = unitsRef; break;
        case 'specialties': collectionRef = specialtiesRef; break;
        case 'professionals': collectionRef = professionalsRef; break;
        case 'schedule': collectionRef = scheduleRef; break;
        default: throw new Error('Coleção desconhecida.');
    }

    return onSnapshot(collectionRef, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    });
}


export async function createSingleAllocation(allocationData) {
    return addDoc(scheduleRef, allocationData);
}

export async function createRecurringAllocations(baseData, startDate, existingAllocations) {
    const batch = writeBatch(db);
    const recurringId = `rec_${Date.now()}`;

    for (let i = 0; i < constants.RECURRING_WEEKS; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + (i * 7));
        const dateString = targetDate.toISOString().split('T')[0];

        const newAllocation = {
            ...baseData,
            date: dateString,
            recurringId,
        };

        const isDuplicate = existingAllocations.some(s =>
            s.date === newAllocation.date && s.unitId === newAllocation.unitId &&
            s.room === newAllocation.room && s.period === newAllocation.period
        );

        if (!isDuplicate) {
            const newDocRef = doc(scheduleRef);
            batch.set(newDocRef, newAllocation);
        } else {
            console.warn(`Alocação duplicada em ${newAllocation.date} ignorada.`);
        }
    }
    return batch.commit();
}

export async function moveAllocation(scheduleId, { date, unitId, room, period }) {
    const scheduleDocRef = doc(db, "schedule", scheduleId);
    return updateDoc(scheduleDocRef, { date, unitId, room, period, recurringId: null });
}

export async function removeAllocation(type, scheduleId, recurringId, originalDate) {
    if (type === 'one') {
        return deleteDoc(doc(db, "schedule", scheduleId));
    }
    
    const batch = writeBatch(db);
    let q;
    if (type === 'all') {
        q = query(scheduleRef, where("recurringId", "==", recurringId));
    } else { 
        q = query(scheduleRef, where("recurringId", "==", recurringId), where("date", ">=", originalDate));
    }
    
    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(document => batch.delete(document.ref));
    return batch.commit();
}

export async function deleteMultipleAllocations(scheduleIds) {
    const batch = writeBatch(db);
    scheduleIds.forEach(id => {
        const docRef = doc(db, "schedule", id);
        batch.delete(docRef);
    });
    return batch.commit();
}


export async function updateAllocationHours(type, scheduleId, recurringId, originalDate, newTimes) {
    if (type === 'one') {
        return updateDoc(doc(db, "schedule", scheduleId), { ...newTimes, recurringId: null });
    }
    
    const batch = writeBatch(db);
    const q = query(scheduleRef, where("recurringId", "==", recurringId), where("date", ">=", originalDate));
    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(document => batch.update(document.ref, newTimes));
    return batch.commit();
}

export async function saveValidation(scheduleId, validated, observation) {
    return updateDoc(doc(db, "schedule", scheduleId), { validated, observation });
}


export const addProfessional = (data) => addDoc(professionalsRef, data);
export const updateProfessional = (id, data) => updateDoc(doc(db, "professionals", id), data);
export const deleteProfessional = (id) => deleteDoc(doc(db, "professionals", id));
export const addSpecialty = (data) => addDoc(specialtiesRef, data);
export const updateSpecialty = (id, data) => updateDoc(doc(db, "specialties", id), data);
export const deleteSpecialty = (id) => deleteDoc(doc(db, "specialties", id));
export const addUnit = (data) => addDoc(unitsRef, data);
export const updateUnit = (id, data) => updateDoc(doc(db, "units", id), data);
export const deleteUnit = (id) => deleteDoc(doc(db, "units", id));
export const addRoomToUnit = (unitId, roomName) => {
    const unitDocRef = doc(db, "units", unitId);
    return updateDoc(unitDocRef, {
        rooms: arrayUnion(roomName)
    });
};

export const removeRoomFromUnit = (unitId, roomName) => {
    const unitDocRef = doc(db, "units", unitId);
    return updateDoc(unitDocRef, {
        rooms: arrayRemove(roomName)
    });
};


export const updateRoomInUnit = async (unitId, oldRoomName, newRoomName) => {
    const unitDocRef = doc(db, "units", unitId);
    const { get, update } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");
    const { runTransaction } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");

    return runTransaction(db, async (transaction) => {
        const unitDoc = await transaction.get(unitDocRef);
        if (!unitDoc.exists()) {
            throw "Documento da unidade não encontrado!";
        }

        const currentRooms = unitDoc.data().rooms || [];
        if (currentRooms.includes(newRoomName)) {
            throw "Este nome de sala já existe nesta unidade.";
        }
        
        transaction.update(unitDocRef, { rooms: arrayRemove(oldRoomName) });
        transaction.update(unitDocRef, { rooms: arrayUnion(newRoomName) });
    });
};