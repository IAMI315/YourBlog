import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export function Button({ children, className, icon, type = "button", ...props }: ButtonProps) {
  return (
    <button className={["button", className].filter(Boolean).join(" ")} type={type} {...props}>
      {icon ? <span className="button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
