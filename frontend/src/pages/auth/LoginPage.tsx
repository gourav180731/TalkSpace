import { useState } from "react";
import {
  Button,
  TextInput,
  PasswordInput,
  Group,
  Text,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../../apis/auth.api";
import { useAuth } from "../../context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9._-]+$/;
const passwordRegex = /^[\x20-\x7E]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    let isValid = true;

    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    setIdentifierError("");
    setPasswordError("");

    if (!trimmedIdentifier) {
      setIdentifierError("Identifier is required");
      isValid = false;
    } else if (trimmedIdentifier.length > 50) {
      setIdentifierError("Maximum length is 50 characters");
      isValid = false;
    } else if (trimmedIdentifier.includes("@")) {
      if (!emailRegex.test(trimmedIdentifier)) {
        setIdentifierError("Invalid email format");
        isValid = false;
      }
    } else {
      if (!usernameRegex.test(trimmedIdentifier)) {
        setIdentifierError("Username cannot contain spaces or emojis");
        isValid = false;
      }
    }

    if (!trimmedPassword) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (trimmedPassword.length > 20) {
      setPasswordError("Password must be 20 characters max");
      isValid = false;
    } else if (!passwordRegex.test(trimmedPassword)) {
      setPasswordError("Password contains invalid characters");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    try {
      setLoading(true);

      await loginApi({
        identifier: trimmedIdentifier,
        password: trimmedPassword,
      });

      await refreshAuth();
    } catch (err: any) {
      const msg = err.response?.data?.msg;

      if (msg === "wrong password") {
        setPasswordError("Incorrect password");
      } else if (msg === "User not found") {
        setIdentifierError("No user exists with this identifier");
      } else if (msg?.includes("email not verified")) {
        setIdentifierError("Email not verified. Please check your inbox.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px]" />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

      {/* Login Card */}
      <div
        className="
          w-full max-w-md sm:max-w-lg
          rounded-3xl p-8
          bg-[#121520]/90 backdrop-blur-xl
          border border-white/10
          shadow-2xl shadow-black/40
          fade-in
          relative z-10
        "
      >
        {/* Title */}
        <h1 className="mb-2 text-4xl sm:text-5xl font-extrabold text-white text-center">
          Welcome Back
        </h1>
        <p className="text-white/60 text-center mb-8">
          Continue chatting without distractions
        </p>

        {/* Inputs */}
        <div className="space-y-4">
          <TextInput
            label="Email or Username"
            placeholder="Enter email or username"
            radius="md"
            size="md"
            value={identifier}
            onChange={(e) => {
              let val = e.target.value;

              // prevent leading spaces + collapse multiple spaces
              val = val.replace(/^\s+/, "").replace(/\s+/g, " ");

              if (val.length <= 50) setIdentifier(val);
            }}
            error={identifierError}
            classNames={{
              input:
                "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
              label: "text-white/70",
            }}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            radius="md"
            size="md"
            value={password}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= 20) setPassword(val);
            }}
            error={passwordError}
            classNames={{
              input:
                "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
              label: "text-white/70",
            }}
          />
        </div>

        {/* Login Button */}
        <Group grow className="mt-6">
          <Button
            size="lg"
            radius="lg"
            loading={loading}
            disabled={loading}
            className="
              bg-indigo-600 hover:bg-indigo-500
              text-white
              transition-all
              hover:-translate-y-0.5
              hover:shadow-xl hover:shadow-indigo-600/30
            "
            onClick={handleLogin}
          >
            Login
          </Button>
        </Group>

        {/* Links */}
        <div className="mt-6 text-center text-sm text-white/60">
          <button
            className="underline hover:text-white transition"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </button>

          <div className="mt-3">
            <Text className="text-white/60">
              Don’t have an account?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-indigo-400 font-semibold underline hover:text-indigo-300"
              >
                Create one
              </button>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}