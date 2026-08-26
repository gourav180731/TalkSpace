import { axiosInstance } from "./axios";
export const getUserSettings = ()=> axiosInstance.get("/settings");
export const updateUserSettings = (data:any)=> axiosInstance.patch("/settings", data);
export const setChatWallpaper = (chatId:string, data:FormData)=> axiosInstance.post(`/settings/chat/${chatId}/wallpaper`, data, {headers:{"Content-Type":"multipart/form-data"}});
export const setChatTheme = (chatId:string, data:any)=> axiosInstance.patch(`/settings/chat/${chatId}/theme`, data);
export const clearCache = ()=> axiosInstance.delete("/settings/cache");
