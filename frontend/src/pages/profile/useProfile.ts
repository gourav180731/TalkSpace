import { useEffect, useRef, useState } from "react";
import {
  getProfileApi,
  updateProfileApi,
  uploadProfilePhotoApi,
} from "../../apis/profile.api";
import { useAuth } from "../../context/AuthContext";

export type Profile = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  dob: string ;
  gender: string;
  bio: string ;
  avatar: string;
};

export function useProfile() {
  const fileRef = useRef<HTMLInputElement | null>(null);
const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [initializing, setInitializing] = useState(true);

  /* ---------- helpers ---------- */

  const getFullName = () =>
    `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();

  const updateFullName = (value: string) => {
    const cleaned = value.replace(/\s+/g, " ").trimStart();
    const parts = cleaned.split(" ");

    setProfile((p) =>
      p
        ? {
            ...p,
            firstName: parts[0]?.slice(0, 20) || "",
            lastName: parts.slice(1).join(" ").slice(0, 20),
          }
        : p
    );
  };

  /* ---------- load profile ---------- */
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getProfileApi();
      const u = res.data.safeUser;

      setProfile({
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        username: u.username || "",
        email: u.email || "",
      dob: u.dob ? new Date(u.dob).toISOString().split("T")[0] : "",
        gender: u.gender ?? "male",
        bio: u.bio || "",
         avatar: u.avatar ? `${u.avatar}?t=${Date.now()}` : "",
      });
        
    } finally {
      setInitializing(false);
    }
  };

  /* ---------- validation ---------- */
  const validate = () => {
    if (!profile) return false;
    const err: any = {};
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;

    if (!profile.firstName.trim()) err.firstName = "Required";
    if (isDesktop && !profile.lastName.trim()) err.lastName = "Required";

    if (!profile.username.trim()) err.username = "Required";
    else if (profile.username.length > 20)
      err.username = "Max 20 characters";
    else if (!/^[a-zA-Z0-9._-]+$/.test(profile.username))
      err.username = "Invalid username";
     if (profile.dob) {
  const dobDate = new Date(profile.dob);
  const age =
    new Date().getFullYear() - dobDate.getFullYear();

  if (age < 12 || age > 101) {
    err.dob = "Age must be between 12 and 101 years";
  }
}

    if (profile.bio.length > 50) err.bio = "Max 50 characters";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  /* ---------- save ---------- */
   const saveChanges = async () => {
  

  if (!profile) return;

  const isValid = validate();

  if (!isValid) return;

  try {
    setLoading(true);
    await updateProfileApi({
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob ,
      bio: profile.bio,
      gender: profile.gender,
    });
    await loadProfile();
  } finally {
    setLoading(false);
  }
};

  /* ---------- upload ---------- */
  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      await uploadProfilePhotoApi(file);
      await loadProfile();
    } finally {
      setUploading(false);
    }
  };

 const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };


  return {
    profile,
    setProfile,
    loading,
    uploading,
    errors,
    initializing,
    fileRef,
    getFullName,
    updateFullName,
    saveChanges,
    handleUpload,
    handleLogout,
  };
}
