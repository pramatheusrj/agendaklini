export function getWeekDates(date) {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
    startOfWeek.setDate(diff);

    const week = [];
    for (let i = 0; i < 6; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(currentDay.getDate() + i);
        week.push(currentDay);
    }
    return week;
}


export function getWeekDisplay(date) {
    const weekDates = getWeekDates(date);
    const startDate = weekDates[0].toLocaleDateString('pt-BR');
    const endDate = weekDates[5].toLocaleDateString('pt-BR');
    return `Semana de ${startDate} a ${endDate}`;
}