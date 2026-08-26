import { axiosInstance } from "./axios";
export const createStatus = (data:FormData)=> axiosInstance.post("/status", data, {headers:{"Content-Type":"multipart/form-data"}});
export const getFriendsStatuses = ()=> axiosInstance.get("/status");
export const getMyStatuses = ()=> axiosInstance.get("/status/my");
export const viewStatus = (id:string)=> axiosInstance.post(`/status/${id}/view`);
export const deleteStatus = (id:string)=> axiosInstance.delete(`/status/${id}`);
