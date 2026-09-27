import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onClose?: () => void;
}

export default function Toast({
  message,
  type,
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      onClose?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "info":
        return "bg-blue-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "info":
        return "ℹ";
      default:
        return "•";
    }
  };

  return (
    <div
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 animate-in fade-in slide-in-from-right mx-4 sm:mx-0"
      role="status"
      aria-live="polite"
    >
      <div
        className={`${getStyles()} px-3 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 text-sm sm:text-base max-w-xs sm:max-w-sm`}
      >
        <span className="text-base sm:text-lg font-bold shrink-0">
          {getIcon()}
        </span>
        <span className="font-medium wrap-break-word">{message}</span>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="ml-1 sm:ml-2 text-lg sm:text-xl font-bold cursor-pointer hover:opacity-80 shrink-0"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
