import { CookieOptions } from "express";

const isSecureCookie = process.env.NODE_ENV === "production";


export const RefreshOptions: CookieOptions = {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: isSecureCookie ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
export const AccessOptions: CookieOptions = {
    httpOnly: true,
    secure:isSecureCookie,
    sameSite: isSecureCookie? "none" : "lax",
    maxAge:    30 * 60 * 1000,
};

export const logoutOptions: CookieOptions = {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: isSecureCookie ? "none" : "lax",
    expires: new Date(0),
};
