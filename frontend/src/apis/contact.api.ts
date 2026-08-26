import { axiosInstance } from "./axios";
export const syncContacts = (contacts:any[])=> axiosInstance.post("/contacts/sync", {contacts});
