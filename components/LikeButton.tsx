"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function LikeButton({
  id,
  initialLiked = false,
  variant = "default",
}: {
  id: string;
  initialLiked?: boolean;
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  const baseClass =
    variant === "compact"
      ? "inline-flex items-center rounded-full border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
      : "inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70";

  const stateClass = liked
    ? "border-red-700 bg-red-600 text-white shadow-sm"
    : "border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50";

  const handleLike = async () => {
    if (pending) return;

    setPending(true);

    try {
      const res = await fetch(`/api/recipes/${id}/like`, {
        method: "POST",
      });

      if (res.status === 401) {
        router.push(
          `/auth/login?next=${encodeURIComponent(pathname || "/recipes")}`,
        );
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      if (typeof data?.liked === "boolean") {
        setLiked(data.liked);
      } else {
        setLiked((prev) => !prev);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Remove from favorites" : "Save to favorites"}
      title={liked ? "Saved" : "Save"}
      className={`${baseClass} ${stateClass}`}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {liked ? "♥" : "♡"}
      </span>
    </button>
  );
}
