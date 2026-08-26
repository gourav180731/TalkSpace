import { axiosInstance } from "./axios";
export const getStickerPacks = ()=> axiosInstance.get("/stickers/packs");
export const getStickerPack = (id:string)=> axiosInstance.get(`/stickers/packs/${id}`);
