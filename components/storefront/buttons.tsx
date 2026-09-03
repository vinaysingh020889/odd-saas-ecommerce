import Link from "next/link";
import type { ReactNode } from "react";

type PremiumButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

const buttonVariants = {
  primary: "bg-[#b00000] text-white shadow-sm hover:bg-[#d91400] disabled:bg-omd-muted",
  secondary: "border border-omd-sand bg-white text-omd-brown shadow-sm hover:border-[#b00000] hover:bg-[#fff3ef] hover:text-[#b00000]",
  ghost: "text-omd-brown hover:bg-[#fff3ef] hover:text-[#b00000]",
  gold: "bg-[#b00000] text-white shadow-sm hover:bg-[#d91400]"
};

export function PremiumButton({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled
}: PremiumButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PremiumLink({
  href,
  children,
  variant = "primary",
  className = ""
}: {
  href: string;
  children: ReactNode;
  variant?: PremiumButtonProps["variant"];
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${buttonVariants[variant ?? "primary"]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function FilterChip({
  href,
  children,
  selected = false
}: {
  href: string;
  children: ReactNode;
  selected?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${
        selected
          ? "border-[#b00000] bg-[#b00000] text-white shadow-sm"
          : "border-omd-sand bg-white text-omd-muted hover:border-[#b00000] hover:text-[#b00000]"
      }`}
    >
      {children}
    </Link>
  );
}
