import {axiosInstance } from "./axios";

export const getChatListApi = () =>
  axiosInstance.get("/message/chats");

export const getMessagesApi = (
  id: string,
  params?: { skip?: number; limit?: number }
) =>
  axiosInstance.get(`/message/chat/${id}`, {
    params,
  });

export const sendMessageApi = (
  chatId: string,
  form: FormData,
  onProgress?: (p: number) => void
) => {
  return axiosInstance.post(`/message/send/${chatId}`, form, {
    onUploadProgress: (e) => {
      if (!e.total) return;
      const percent = Math.round((e.loaded * 100) / e.total);
      onProgress?.(percent);
    },
  });
};


export const markReadApi = (id: string) =>
  axiosInstance.post(`/message/read/${id}`);

export const deleteMessageForEveryoneApi = (id: string) =>
  axiosInstance.delete(`/message/${id}`);

export const deleteMessageForMeApi = (id: string) =>
  axiosInstance.delete(`/message/me/${id}`);

export const messageReactionApi = (id: string, emoji: string) =>
  axiosInstance.post(`/message/${id}/react`, { emoji });

