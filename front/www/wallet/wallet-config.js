import { getServerUrl as getSharedServerUrl } from "../js/conexion.js";

export function getUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("BeGO_user") || "null");
        return user?._id || user?.id || null;
    } catch {
        return null;
    }
}

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("BeGO_user") || "null");
    } catch {
        return null;
    }
}

export function getToken() {
    let token = localStorage.getItem("token");
    if (token && token.startsWith('"')) token = token.slice(1, -1);
    return token;
}

export function getServerUrl() {
    return getSharedServerUrl();
}
