import React from "react";

type ButtonVariant = "primary" | "secondary" | "gray" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const baseStyle =
  "rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-gray-200 hover:bg-brand-700 active:scale-95 shadow-md",
  secondary:
    "bg-success-600 text-gray-200 hover:bg-success-700 active:scale-95 shadow-md",
  gray: "bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 active:scale-95",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`
        ${baseStyle}
        ${sizes[size]}
        ${variants[variant]}
        ${className}   // ⬅️ ini kuncinya
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      )}

      {children}
    </button>
  );
};

export default Button;
