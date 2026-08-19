import { axiosInstance } from "./axios";

export const getNotificationsApi = () =>
  axiosInstance.get("/notifications");

export const markNotificationReadApi = (id: string) =>
  axiosInstance.post(`/notifications/read/${id}`);

export const markAllNotificationsReadApi = () =>
  axiosInstance.post("/notifications/read-all");
