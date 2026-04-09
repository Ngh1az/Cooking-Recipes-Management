"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function LikeButton({
  id,
  initialLikes,
  initialLiked = false,
  variant = "default",
}: {
  id: string;
  initialLikes: number;
  initialLiked?: boolean;
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

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

      if (typeof data?.likes === "number") {
        setLikes(data.likes);
      } else {
        setLikes((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
      }

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
      className={
        variant === "compact"
          ? `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
              liked
                ? "border-orange-300 bg-orange-100 text-orange-800"
                : "border-orange-200 bg-white text-gray-700 hover:bg-orange-50"
            }`
          : `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
              liked
                ? "border-orange-300 bg-orange-100 text-orange-800"
                : "border-orange-200 bg-white text-gray-700 hover:bg-orange-50"
            }`
      }
    >
      <span aria-hidden="true">❤️</span>
      <span>{likes}</span>
      {variant === "compact" ? null : (
        <span className="text-xs text-gray-500">
          {pending
            ? "Saving..."
            : liked
              ? "Click again to unlike"
              : "Like this recipe"}
        </span>
      )}
    </button>
  );
}
