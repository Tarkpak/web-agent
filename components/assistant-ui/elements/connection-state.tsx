"use client";

import { useEffect, useState } from "react";
import { CloudOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function ConnectionState({ className }: { className?: string }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <div
      data-slot="connection-state"
      role="status"
      className={cn(
        paper,
        "fade-in slide-in-from-top-1 animate-in mx-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] duration-300",
        className,
      )}
    >
      <CloudOffIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>Connection lost. Check your network and try again.</span>
    </div>
  );
}
