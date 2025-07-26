import * as state from './modules/state.js';
import * as ui from './modules/ui.js';
import * as eventManager from './modules/eventManager.js';
import { selectors, ROLES } from './modules/config.js';


document.addEventListener('DOMContentLoaded', () => {
    eventManager.attachLoginListeners(startApp);
});

async function startApp(role) {
    console.log(`Iniciando a aplicação para o perfil: ${role}`);

    state.setCurrentUserRole(role);

    const loadingNotification = ui.showNotification("Preparando o ambiente...", "Aguarde");

    try {
       transitionToAppView(role);
        eventManager.attachAppListeners();
        
        await new Promise(resolve => {
            state.initializeListeners(ui.render, resolve);
        });
        console.log("Dados iniciais carregados com sucesso.");

        ui.render(); 

    } catch (error) {
        console.error("Falha crítica ao inicializar a aplicação:", error);
        ui.showNotification("Não foi possível carregar os dados. Verifique sua conexão e tente recarregar.", "Erro Crítico");
        
    } finally {
        if (loadingNotification) {
            ui.hideModal(loadingNotification);
        }
        console.log("Fluxo de inicialização finalizado.");
    }
}
function transitionToAppView(role) {
    const loginPage = document.querySelector(selectors.pages.login);
    const appPage = document.querySelector(selectors.pages.app);

    if (!loginPage || !appPage) {
        throw new Error("Elementos críticos da UI (loginPage ou appPage) não encontrados no DOM.");
    }
    
    document.body.className = `role-${role}`;
    ui.hideElement(loginPage);
    ui.showElement(appPage); 
    ui.updateMainTitle(role === ROLES.GESTOR ? 'Gestão de Escalas' : 'Minha Escala');
}