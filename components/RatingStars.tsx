"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  id: string;
  initialAverage: number;
  initialCount: number;
  initialUserRating: number;
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function toSafeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export default function RatingStars({
  id,
  initialAverage,
  initialCount,
  initialUserRating,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [average, setAverage] = useState(toSafeNumber(initialAverage));
  const [count, setCount] = useState(Math.max(0, Math.floor(initialCount)));
  const [userRating, setUserRating] = useState(
    Math.min(5, Math.max(0, Math.floor(initialUserRating))),
  );
  const [pending, setPending] = useState(false);

  const averageText = useMemo(() => average.toFixed(1), [average]);
  const averageStars = useMemo(
    () => Math.min(5, Math.max(0, Math.round(average))),
    [average],
  );

  const submitRating = async (nextRating: number) => {
    if (pending) return;

    setPending(true);

    try {
      const res = await fetch(`/api/recipes/${id}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: nextRating }),
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

      if (typeof data?.viewer_rating === "number") {
        setUserRating(Math.min(5, Math.max(0, Math.floor(data.viewer_rating))));
      }

      if (typeof data?.average_rating === "number") {
        setAverage(toSafeNumber(data.average_rating));
      }

      if (typeof data?.rating_count === "number") {
        setCount(Math.max(0, Math.floor(data.rating_count)));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Average</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {STAR_VALUES.map((value) => (
              <span
                key={`avg-${value}`}
                className={`text-base leading-none ${value <= averageStars ? "text-amber-500" : "text-gray-300"}`}
              >
                ★
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{averageText}</span>
            <span className="text-gray-500"> / 5</span>
            <span className="ml-2 text-gray-500">({count} ratings)</span>
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Your rating</p>
        <div className="flex items-center gap-2">
          {STAR_VALUES.map((value) => {
            const active = value <= userRating;

            return (
              <button
                key={value}
                type="button"
                onClick={() => submitRating(value)}
                disabled={pending}
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                className={`text-xl leading-none transition ${
                  active
                    ? "text-amber-500"
                    : "text-gray-300 hover:text-amber-400"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                ★
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {pending
          ? "Saving your rating..."
          : userRating > 0
            ? `You rated this recipe ${userRating}/5.`
            : "Tap a star to rate this recipe."}
      </p>
    </div>
  );
}
