import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPasswordApi } from "../../apis/auth.api";
import { Button, TextInput, Text } from "@mantine/core";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9._-]+$/;

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateIdentifier = () => {
    const trimmedIdentifier = identifier.trim();

    setError("");

    if (!trimmedIdentifier) {
      setError("Email or username is required");
      return false;
    }

    if (trimmedIdentifier.length > 50) {
      setError("Maximum length is 50 characters");
      return false;
    }

    if (trimmedIdentifier.includes("@")) {
      if (!emailRegex.test(trimmedIdentifier)) {
        setError("Invalid email format");
        return false;
      }
    } else {
      if (!usernameRegex.test(trimmedIdentifier)) {
        setError("Invalid username format");
        return false;
      }
    }

    return true;
  };

  const handleForgot = async () => {
    if (!validateIdentifier()) return;

    const trimmedIdentifier = identifier.trim();

    try {
      setLoading(true);

      await forgotPasswordApi({ identifier: trimmedIdentifier });

      navigate(
        "/reset-password?identifier=" +
          encodeURIComponent(trimmedIdentifier)
      );
    } catch (err: any) {
      setError(err?.response?.data?.msg || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#16120F] p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-teal-500/20 blur-[140px]" />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

      {/* Card */}
      <div
        className="
          w-full max-w-md sm:max-w-lg
          rounded-3xl p-8
          bg-[#1D1712]/90 backdrop-blur-xl
          border border-white/10
          shadow-2xl shadow-black/40
          fade-in
          relative z-10
          flex flex-col gap-6
        "
      >
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white text-center">
          Forgot Password
        </h1>

        <Text className="text-center text-white/60">
          Enter your <b>email or username</b> to receive a one-time code.
        </Text>

        {/* Input */}
        <TextInput
          label="Email or Username"
          placeholder="your@email.com or username"
          radius="md"
          size="md"
          value={identifier}
          onChange={(e) => {
            let val = e.target.value;

            // remove leading spaces + collapse multiple spaces
            val = val.replace(/^\s+/, "").replace(/\s+/g, " ");

            if (val.length <= 50) setIdentifier(val);
          }}
          error={error}
          classNames={{
            input:
              "bg-[#16120F] border-white/10 text-white placeholder:text-white/40",
            label: "text-white/70",
          }}
        />

        {/* Submit */}
        <Button
          size="lg"
          radius="lg"
          fullWidth
          loading={loading}
          disabled={loading}
          onClick={handleForgot}
          className="
            bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400
            text-white
            transition-all
            hover:-translate-y-0.5
            hover:shadow-xl hover:shadow-orange-500/30
          "
        >
          Send OTP
        </Button>

        {/* Bottom link */}
        <Text className="text-center text-sm text-white/60">
          Remember your password?{" "}
          <button
            className="text-orange-400 font-semibold underline hover:text-orange-300"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </Text>
      </div>
    </div>
  );
}
