import { axiosInstance } from "./axios";
export const getPrivacySettings = ()=> axiosInstance.get("/privacy");
export const updatePrivacySettings = (data:any)=> axiosInstance.patch("/privacy", data);
export const blockUser = (id:string)=> axiosInstance.post(`/privacy/block/${id}`);
export const unblockUser = (id:string)=> axiosInstance.delete(`/privacy/block/${id}`);
export const getBlockedUsers = ()=> axiosInstance.get("/privacy/blocked");
