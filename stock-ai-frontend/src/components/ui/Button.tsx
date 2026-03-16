import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: Props) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50",
        variant === "secondary" && "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
        variant === "ghost" && "text-gray-600 hover:bg-gray-100",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        (disabled || loading) && "cursor-not-allowed opacity-60",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
};
