import { axiosInstance } from "./axios";
export const getGlobalCallHistory = (page=1)=> axiosInstance.get(`/calls?page=${page}`);
export const getChatCallHistory = (userId:string, page=1)=> axiosInstance.get(`/calls/chat/${userId}?page=${page}`);
