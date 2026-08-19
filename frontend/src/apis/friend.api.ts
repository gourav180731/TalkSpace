import {axiosInstance} from "./axios";

export const getMyFriendsApi = () =>
  axiosInstance.get("/friends");

export const getAllUsersApi = (q?: string, signal?: AbortSignal) =>
  axiosInstance.get("/friends/allusers", {
    params: { ...(q && { q }) },
    signal,
  });

export const sendFriendRequestApi = (userId: string) =>
  axiosInstance.post(`/friends/request`, { userId});

export const cancelFriendRequestApi = (id: string) =>
  axiosInstance.delete(`/friends/request/${id}`);

export const getFriendRequestsApi = () =>
  axiosInstance.get("/friends/requests");

export const acceptFriendRequestApi = (requestId: string) =>
  axiosInstance.post(`/friends/accept/${requestId}`);

export const rejectFriendRequestApi = (requestId: string) =>
  axiosInstance.post(`/friends/reject/${requestId}`);
