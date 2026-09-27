"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import API from "@/lib/axios";
import { useRouter } from "next/navigation";

const Toast = dynamic(
  () => import("@/components/Toast"),
  { ssr: false }
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        router.replace("/chat");
        return;
      }
    }

    nameInputRef.current?.focus();
  }, [router]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
    };

    if (!formData.name) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 3) {
      newErrors.name =
        "Name must be at least 3 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password =
        "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return newErrors.name === "" &&
      newErrors.email === "" &&
      newErrors.password === ""
      ? true
      : false;
  }, [formData]);

  // Handle Register
  const handleRegister = useCallback(async () => {
    if (!validateForm()) {
      setToast({
        message: "Please fix the errors above",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      await API.post("/auth/register", formData);

      setToast({
        message:
          "Registration successful! Redirecting to login...",
        type: "success",
      });

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed";

      setToast({
        message: errorMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, router]);

  // Handle Enter Key
  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<
        HTMLInputElement
      >
    ) => {
      if (e.key === "Enter" && !loading) {
        e.preventDefault();
        if (e.currentTarget === nameInputRef.current) {
          emailInputRef.current?.focus();
        } else if (
          e.currentTarget === emailInputRef.current
        ) {
          passwordInputRef.current?.focus();
        } else {
          handleRegister();
        }
      }
    },
    [loading, handleRegister]
  );

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:px-6 md:px-8 bg-linear-to-br from-green-50 to-emerald-100">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-sm sm:max-w-md">
        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl backdrop-blur">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Create Account
            </h1>
            <p className="text-sm sm:text-base text-slate-500">
              Join our community
            </p>
          </div>

          {/* Name Input */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Full Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  name: e.target.value,
                });
                setErrors({
                  ...errors,
                  name: "",
                });
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-sm sm:text-base transition-all duration-200 focus:outline-none cursor-text ${
                errors.name
                  ? "border-red-500 focus:border-red-600 bg-red-50"
                  : "border-slate-200 focus:border-green-500 hover:border-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 font-medium">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              ref={emailInputRef}
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  email: e.target.value,
                });
                setErrors({
                  ...errors,
                  email: "",
                });
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-sm sm:text-base transition-all duration-200 focus:outline-none cursor-text ${
                errors.email
                  ? "border-red-500 focus:border-red-600 bg-red-50"
                  : "border-slate-200 focus:border-green-500 hover:border-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              ref={passwordInputRef}
              type="password"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  password: e.target.value,
                });
                setErrors({
                  ...errors,
                  password: "",
                });
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-sm sm:text-base transition-all duration-200 focus:outline-none cursor-text ${
                errors.password
                  ? "border-red-500 focus:border-red-600 bg-red-50"
                  : "border-slate-200 focus:border-green-500 hover:border-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          {/* Register Button */}
          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">
                  ⟳
                </span>
                <span className="hidden sm:inline">Creating account...</span>
              </>
            ) : (
              <>
                <span>📝</span>
                <span className="hidden sm:inline">Register</span>
                <span className="sm:hidden">Sign Up</span>
              </>
            )}
          </button>

          {/* Helper Text */}
          <p className="text-xs text-slate-400 text-center mt-2 sm:mt-3">
            💡 Press Enter to register
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4 sm:my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400">
              OR
            </span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-600 text-xs sm:text-sm mb-2">
              Already have an account?
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-green-600 hover:text-green-700 font-bold text-sm sm:text-base cursor-pointer transition-all duration-200 hover:underline"
            >
              🔓 Sign in
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-4 sm:mt-6">
          © 2026 Communication App
        </p>
      </div>
    </div>
  );
}