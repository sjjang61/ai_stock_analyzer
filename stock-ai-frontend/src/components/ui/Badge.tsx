import clsx from "clsx";

interface Props {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md";
  className?: string;
}

const variantMap = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-700",
  danger:  "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info:    "bg-blue-100 text-blue-700",
};

export const Badge = ({ children, variant = "default", size = "md", className }: Props) => (
  <span
    className={clsx(
      "inline-flex items-center font-medium rounded-full",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      variantMap[variant],
      className
    )}
  >
    {children}
  </span>
);
