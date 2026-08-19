import { axiosInstance } from "./axios";

export const loginApi = (data:{ identifier: string, password: string }) => {
  return axiosInstance.post("/auth/login", data);
};

export const registerApi = (data: {
  username: string;
  email: string;
  password: string;
}) => {
  return axiosInstance.post("/auth/register", data);
};


export const verifyEmailApi = (data: { email:string; verificationCode: string }) => {
  return axiosInstance.post("/auth/verifyemail", data);
};

export const resendVerificationOtpApi = (data:{ email: string }) => {
  return axiosInstance.post("/auth/resendverificationcode", data);
};

export const checkAuthApi = () => {
  return axiosInstance.get("/auth/check");
};


export const forgotPasswordApi = (data:{identifier: string}) => {
  return axiosInstance.post("/auth/forgotpassword", data);
};

export const resetPasswordApi = (data: {
  identifier: string;
  resetPasswordOtp: string;
  newPassword: string;
}) => {
  return axiosInstance.post("/auth/updatepassword", data);
};


export const logoutApi = () => {
  return axiosInstance.post(
    "/auth/logout",
    {},
    { _skipAuthRefresh: true }
  );
};
export const refreshApi = () => {
  return axiosInstance.post(
    "/auth/refresh",
    {},
    { withCredentials: true }
  );
};
