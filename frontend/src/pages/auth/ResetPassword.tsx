import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { forgotPasswordApi, resetPasswordApi } from "../../apis/auth.api";
import { Button, PasswordInput, Text } from "@mantine/core";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔥 IMPORTANT: trim identifier from URL
  const identifier = (searchParams.get("identifier") ?? "").trim();

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  /* ---------------- OTP CHANGE ---------------- */
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === "" && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = "";
      setOtpDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  /* ---------------- OTP PASTE ---------------- */
  const handlePasteOtp = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(paste)) return;

    setOtpDigits(paste.split(""));
    inputRefs.current[5]?.focus();
  };

  /* ---------------- VALIDATION ---------------- */
  const validateInputs = () => {
    let ok = true;

    const trimmedPassword = newPassword.trim();

    setOtpError("");
    setPasswordError("");

    if (otpDigits.join("").length !== 6) {
      setOtpError("OTP must be 6 digits");
      ok = false;
    }

    if (!trimmedPassword) {
      setPasswordError("Password is required");
      ok = false;
    } else if (trimmedPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      ok = false;
    }

    return ok;
  };

  /* ---------------- RESET ---------------- */
  const handleReset = async () => {
    if (!validateInputs()) return;

    const trimmedPassword = newPassword.trim();

    try {
      setLoading(true);

      await resetPasswordApi({
        identifier,
        resetPasswordOtp: otpDigits.join(""),
        newPassword: trimmedPassword,
      });

      navigate("/login");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.msg || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RESEND ---------------- */
  const handleResend = async () => {
    if (timer > 0) return; // 🔥 prevent spam

    setOtpError("");

    try {
      setResendLoading(true);

      await forgotPasswordApi({ identifier });

      setTimer(30);
    } catch {
      setOtpError("Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d12] p-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px]" />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

      {/* Card */}
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
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white text-center">
          Reset Password
        </h1>

        <Text className="text-center text-white/60">
          OTP sent to <b>{identifier}</b>
        </Text>

        {/* OTP */}
        <div className="flex flex-col items-center gap-4" onPaste={handlePasteOtp}>
          <label className="text-sm font-semibold text-white/70">
            Enter OTP
          </label>

          <div className="flex gap-2 sm:gap-3">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                className="
                  w-10 h-12 sm:w-14 sm:h-16
                  text-center text-xl sm:text-2xl font-semibold
                  rounded-xl
                  bg-[#0b0d12]
                  border border-white/10
                  text-white
                  focus:border-indigo-500
                  focus:ring-2 focus:ring-indigo-500/40
                  transition-all
                "
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace") handleBackspace(i, digit);
                }}
              />
            ))}
          </div>

          {otpError && <span className="text-red-500 text-sm">{otpError}</span>}

          <Text className="text-sm text-white/60">
            Didn’t receive OTP?{" "}
            {timer > 0 ? (
              <span className="font-semibold text-indigo-400">
                Resend in {timer}s
              </span>
            ) : (
              <button
                className="font-semibold text-indigo-400 underline disabled:opacity-50"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </Text>
        </div>

        {/* Password */}
        <PasswordInput
          label="New Password"
          placeholder="Enter new password"
          radius="md"
          size="md"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={passwordError}
          classNames={{
            input:
              "bg-[#0b0d12] border-white/10 text-white placeholder:text-white/40",
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
          onClick={handleReset}
          className="
            bg-indigo-600 hover:bg-indigo-500
            text-white
            transition-all
            hover:-translate-y-0.5
            hover:shadow-xl hover:shadow-indigo-600/30
          "
        >
          Reset Password
        </Button>

        <Text className="text-center text-sm text-white/60">
          Back to{" "}
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