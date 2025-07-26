import { credentials, selectors, ROLES } from './config.js';
import * as ui from './ui.js';

export function attemptLogin(username, password) {
    if (username.toLowerCase() === credentials.GESTOR_USERNAME && password === credentials.GESTOR_PASSWORD) {
        return ROLES.GESTOR;
    }

    const errorMsgElement = document.querySelector(selectors.ui.loginErrorMsg);
    if(errorMsgElement) {
       ui.showElement(errorMsgElement);
    }
    
    return null;
}