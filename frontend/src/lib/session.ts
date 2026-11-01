import { cache } from "react";
import { api } from "./api";
import type { Academy, CurrentUser } from "./types";

/** Current user, fetched once per request however many components ask. */
export const getMe = cache(() => api<CurrentUser>("/auth/me"));
export const getAcademy = cache(() => api<Academy>("/academy"));

export const isStaff = (user: CurrentUser) => user.role === "academy_admin" || user.role === "coach";
export const isAdmin = (user: CurrentUser) => user.role === "academy_admin";
