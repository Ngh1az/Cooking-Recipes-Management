"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";

type AuthUser = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export default function AuthMenu({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMenu = open || isClosing;

  const initial = useMemo(() => {
    const text = user?.displayName || user?.email || "U";
    return text.trim().charAt(0).toUpperCase() || "U";
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const startCloseMenu = () => {
    if (!open) {
      return;
    }

    setOpen(false);
    setIsClosing(true);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 180);
  };

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsClosing(false);
    setOpen(true);
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      startCloseMenu();
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleAvatarPress = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setRipple({ x, y, key: Date.now() });
    if (open) {
      startCloseMenu();
      return;
    }

    openMenu();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="rounded-md px-3 py-2 text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="rounded-md border border-orange-200 bg-white px-3 py-2 text-orange-700 transition-colors hover:bg-orange-50"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleAvatarPress}
        className="relative flex items-center gap-2 overflow-hidden rounded-full border border-orange-200 bg-white px-2 py-1 pr-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-50 hover:shadow-md hover:shadow-orange-100"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {ripple ? (
          <span
            key={ripple.key}
            className="fx-avatar-ripple"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ) : null}

        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-8 w-8 rounded-full border border-orange-100 object-cover"
          />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[9rem] truncate text-sm text-gray-700 sm:inline">
          {user.displayName}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
        >
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 0 1 1.1 1.02l-4.25 4.5a.75.75 0 0 1-1.1 0l-4.25-4.5a.75.75 0 0 1 .02-1.04z"
          />
        </svg>
      </button>

      {showMenu ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className={`fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] ${open ? "fx-account-overlay" : "fx-account-overlay-closing"}`}
            onClick={startCloseMenu}
          />
          <div
            role="menu"
            className={`absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-lg ${open ? "fx-account-menu" : "fx-account-menu-closing"}`}
          >
            <div className="flex items-center gap-3 border-b border-orange-100 bg-orange-50/40 px-4 py-3">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full border border-orange-100 object-cover"
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="p-1.5">
              <Link
                href="/profile"
                onClick={startCloseMenu}
                className="fx-account-item flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                My Profile
              </Link>
              <Link
                href="/settings"
                onClick={startCloseMenu}
                className="fx-account-item flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="fx-account-item mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
