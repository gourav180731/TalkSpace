import { axiosInstance } from "./axios";
export const searchMessages = (chatId:string, q:string, page=1)=> axiosInstance.get(`/search/messages/${chatId}?q=${encodeURIComponent(q)}&page=${page}`);
export const searchGroupMessages = (groupId:string, q:string, page=1)=> axiosInstance.get(`/search/messages/group/${groupId}?q=${encodeURIComponent(q)}&page=${page}`);
