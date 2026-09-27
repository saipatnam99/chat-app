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
import { connectSocket } from "@/lib/socket";

const Toast = dynamic(
  () => import("@/components/Toast"),
  { ssr: false }
);

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

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

    emailInputRef.current?.focus();
  }, [router]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {
      email: "",
      password: "",
    };

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
    return newErrors.email === "" &&
      newErrors.password === ""
      ? true
      : false;
  }, [formData]);

  // Handle Login
  const handleLogin = useCallback(async () => {
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
      const res = await API.post(
        "/auth/login",
        formData
      );

      // localStorage.setItem(
      //   "token",
      //   res.data.token
      // );
      // localStorage.setItem(
      //   "user",
      //   JSON.stringify(res.data.user)
      // );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      connectSocket();


      setToast({
        message: "Login successful! Redirecting...",
        type: "success",
      });

      setTimeout(() => {
        router.push("/chat");
      }, 1500);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Login failed";

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
        if (e.currentTarget === emailInputRef.current) {
          passwordInputRef.current?.focus();
        } else {
          handleLogin();
        }
      }
    },
    [loading, handleLogin]
  );

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:px-6 md:px-8 bg-linear-to-br from-blue-50 to-indigo-100">
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
              Welcome Back
            </h1>
            <p className="text-sm sm:text-base text-slate-500">
              Sign in to your account
            </p>
          </div>

          {/* Email Input */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 sm:text-slate-700 mb-2">
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
                setErrors({ ...errors, email: "" });
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-sm sm:text-base transition-all duration-200 focus:outline-none cursor-text ${errors.email
                  ? "border-red-500 focus:border-red-600 bg-red-50"
                  : "border-slate-200 focus:border-blue-500 hover:border-slate-300"
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
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 sm:text-slate-700 mb-2">
              Password
            </label>
            <input
              ref={passwordInputRef}
              type="password"
              placeholder="Enter your password"
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
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg text-sm sm:text-base transition-all duration-200 focus:outline-none cursor-text ${errors.password
                  ? "border-red-500 focus:border-red-600 bg-red-50"
                  : "border-slate-200 focus:border-blue-500 hover:border-slate-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">
                  ⟳
                </span>
                <span className="hidden sm:inline">Logging in...</span>
              </>
            ) : (
              <>
                <span>🔓</span>
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">Sign In</span>
              </>
            )}
          </button>

          {/* Helper Text */}
          <p className="text-xs text-slate-400 text-center mt-2 sm:mt-3">
            💡 Press Enter to login
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4 sm:my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400">
              OR
            </span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-slate-600 text-xs sm:text-sm mb-2">
              Don't have an account?
            </p>
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-blue-600 hover:text-blue-700 font-bold text-sm sm:text-base cursor-pointer transition-all duration-200 hover:underline"
            >
              📝 Create account
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