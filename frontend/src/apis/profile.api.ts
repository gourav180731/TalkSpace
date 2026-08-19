import { axiosInstance } from "./axios";

// GET USER PROFILE
export const getProfileApi = async () => {
  return await axiosInstance.get("/me/getuser");
};

// UPDATE PROFILE
export const updateProfileApi = async (data: {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bio: string;
}) => {
  return await axiosInstance.post("/me/updateprofile", data);
};

// UPLOAD PROFILE PHOTO
export const uploadProfilePhotoApi = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return await axiosInstance.post("/me/uploadprofilephoto", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
