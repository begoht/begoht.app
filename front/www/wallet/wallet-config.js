import { getServerUrl as getSharedServerUrl } from "../js/conexion.js";

export function getUserId() {
    const user = JSON.parse(localStorage.getItem("BeGO_user"));
    return user?._id || user?.id || null;
}

export function getToken() {
    let token = localStorage.getItem("token");
    if (token && token.startsWith('"')) token = token.slice(1, -1);
    return token;
}

export function getServerUrl() {
    return getSharedServerUrl();
}
