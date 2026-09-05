import { axiosInstance } from "./axios";
export const getPresence = () => axiosInstance.get("/presence");
export const getUserPresence = (userId:string) => axiosInstance.get(`/presence/${userId}`);
