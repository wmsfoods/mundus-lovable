import { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function SignupShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col">
      <div className="pt-8 flex justify-center">
        <Logo />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-[700px]">{children}</div>
      </div>
      <footer className="pb-6 flex flex-col items-center gap-2">
        <Logo className="scale-75 opacity-70" />
        <p className="text-xs text-gray-400">© Copyright 2025 – All rights reserved.</p>
      </footer>
    </div>
  );
}