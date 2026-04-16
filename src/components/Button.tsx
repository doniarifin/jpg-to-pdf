import React from "react";

type ButtonVariant = "primary" | "secondary" | "gray" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const baseStyle =
  "px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-gray-200 hover:bg-blue-700 active:scale-95 shadow-md",
  secondary:
    "bg-green-600 text-gray-200 hover:bg-green-700 active:scale-95 shadow-md",
  gray: "bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 active:scale-95",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`
        ${baseStyle}
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
