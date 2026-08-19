import { useState } from "react";
import { Button, TextInput, PasswordInput, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../../apis/auth.api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9._-]{3,30}$/;
const passwordRegex = /^[\x20-\x7E]{6,20}$/;

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    let ok = true;

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setUsernameError("");
    setEmailError("");
    setPasswordError("");

    if (!trimmedUsername) {
      setUsernameError("Username is required");
      ok = false;
    } else if (trimmedUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      ok = false;
    } else if (trimmedUsername.length > 30) {
      setUsernameError("Maximum length is 30 characters");
      ok = false;
    } else if (!usernameRegex.test(trimmedUsername)) {
      setUsernameError("Username can contain letters, numbers, . _ - only");
      ok = false;
    }

    if (!trimmedEmail) {
      setEmailError("Email is required");
      ok = false;
    } else if (trimmedEmail.length > 100) {
      setEmailError("Maximum email length is 100 characters");
      ok = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Invalid email format");
      ok = false;
    }

    if (!trimmedPassword) {
      setPasswordError("Password is required");
      ok = false;
    } else if (trimmedPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      ok = false;
    } else if (trimmedPassword.length > 20) {
      setPasswordError("Password must be 20 characters max");
      ok = false;
    } else if (!passwordRegex.test(trimmedPassword)) {
      setPasswordError("Password contains invalid characters");
      ok = false;
    }

    return ok;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      setLoading(true);

      await registerApi({
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
    } catch (err: any) {
      const msg = err?.response?.data?.msg || "";

      if (msg.toLowerCase().includes("username")) {
        setUsernameError(msg);
      } else if (msg.toLowerCase().includes("email")) {
        setEmailError(msg);
      } else {
        setPasswordError(msg || "Registration failed");
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

      {/* Register Card */}
      <div
        className="
          w-full max-w-md sm:max-w-lg
          rounded-3xl p-8
          bg-[#121520]/90 backdrop-blur-xl
          border border-white/10
          shadow-2xl shadow-black/40
          fade-in
          relative z-10
          flex flex-col gap-6
        "
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white text-center">
          Create Account
        </h1>
        <p className="text-white/60 text-center">
          Join ChitChat and start clean conversations
        </p>

        <div className="space-y-4">
          <TextInput
            label="Username"
            placeholder="your_username"
            radius="md"
            size="md"
            value={username}
            onChange={(e) => {
              let v = e.target.value;

              // no leading spaces + remove ALL spaces for username
              v = v.replace(/\s/g, "");

              if (v.length <= 30) setUsername(v);
            }}
            error={usernameError}
            classNames={{
              input:
                "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
              label: "text-white/70",
            }}
          />

          <TextInput
            label="Email"
            placeholder="you@example.com"
            radius="md"
            size="md"
            value={email}
            onChange={(e) => {
              let v = e.target.value;

              // remove leading spaces + collapse multiple spaces
              v = v.replace(/^\s+/, "").replace(/\s+/g, " ");

              if (v.length <= 100) setEmail(v);
            }}
            error={emailError}
            classNames={{
              input:
                "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
              label: "text-white/70",
            }}
          />

          <PasswordInput
            label="Password"
            placeholder="Create a password"
            radius="md"
            size="md"
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= 20) setPassword(v);
            }}
            error={passwordError}
            classNames={{
              input:
                "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
              label: "text-white/70",
            }}
          />
        </div>

        <Button
          size="lg"
          radius="lg"
          fullWidth
          loading={loading}
          disabled={loading}
          onClick={handleRegister}
          className="
            bg-indigo-600 hover:bg-indigo-500
            text-white
            transition-all
            hover:-translate-y-0.5
            hover:shadow-xl hover:shadow-indigo-600/30
          "
        >
          Create Account
        </Button>

        <Text className="text-center text-sm text-white/60">
          Already have an account?{" "}
          <button
            className="text-indigo-400 font-semibold underline hover:text-indigo-300"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </Text>
      </div>
    </div>
  );
}