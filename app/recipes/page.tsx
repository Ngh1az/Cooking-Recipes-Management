import Link from "next/link";
import Image from "next/image";
import { getBaseUrl } from "@/lib/get-base-url";
import { getCurrentUser } from "@/lib/auth";
import LikeButton from "@/components/LikeButton";
import type { CSSProperties } from "react";

type SearchParams = Promise<{ q?: string; page?: string }>;
type Recipe = {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  image_urls?: string[];
  likes: number;
  average_rating?: number;
  rating_count?: number;
  viewer_liked: boolean;
  viewer_can_edit?: boolean;
};

function formatRating(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "New";
  }

  return value.toFixed(1);
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams?.q ?? "";
  const parsedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const currentUser = await getCurrentUser();
  const createRecipeHref = currentUser
    ? "/recipes/new"
    : "/auth/login?next=%2Frecipes%2Fnew";

  const res = await fetch(
    `${getBaseUrl()}/api/recipes?q=${encodeURIComponent(q)}&page=${page}&limit=6`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <h2 className="text-lg font-semibold">Unable to load recipes</h2>
        <p className="mt-1 text-sm">
          Please try refreshing this page. If the issue continues, check your
          database connection.
        </p>
      </div>
    );
  }

  const data = await res.json();
  const recipes: Recipe[] = data.data || [];
  const recipeEmojis = ["🥪", "🥗", "🍲", "🍰", "🥩", "🍝"];
  const fallbackBackgrounds = [
    "from-amber-100 via-orange-50 to-rose-100",
    "from-lime-100 via-emerald-50 to-teal-100",
    "from-sky-100 via-cyan-50 to-blue-100",
    "from-rose-100 via-pink-50 to-fuchsia-100",
    "from-violet-100 via-purple-50 to-indigo-100",
    "from-orange-100 via-amber-50 to-yellow-100",
  ];

  return (
    <div className="fx-fade-up mx-auto max-w-6xl space-y-8">
      <div className="fx-fade-up flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Recipes
          </h1>
          <p className="mt-1 text-gray-500">Find, cook, enjoy.</p>
        </div>

        <Link
          href={createRecipeHref}
          className="fx-lift inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Recipe
        </Link>
      </div>

      {/* 🔍 SEARCH */}
      <form className="fx-fade-up relative w-full max-w-md mx-auto group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          name="q"
          placeholder="Search recipes..."
          defaultValue={q}
          className="w-full rounded-full border border-gray-300 bg-white py-3 pl-10 pr-24 text-sm shadow-sm transition-shadow focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          type="submit"
          className="absolute right-1 top-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
        >
          Search
        </button>
      </form>

      {/* 📦 LIST */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r, index) => (
            <div
              key={r.id}
              className="fx-fade-up fx-stagger fx-glow group relative flex flex-col overflow-hidden rounded-2xl border border-orange-100/70 bg-white shadow-[0_8px_24px_rgba(251,146,60,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_20px_50px_rgba(251,146,60,0.24)]"
              style={{ "--d": index + 1 } as CSSProperties}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-orange-50/80 via-orange-50/30 to-transparent" />

              <div className="relative h-52 overflow-hidden">
                {r.image_urls?.[0] || r.image_url ? (
                  <Image
                    src={r.image_urls?.[0] || r.image_url || ""}
                    alt={r.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className={`flex h-full items-center justify-center bg-gradient-to-br ${fallbackBackgrounds[r.id % fallbackBackgrounds.length]} text-7xl opacity-90 transition-transform duration-500 group-hover:scale-105`}
                  >
                    {recipeEmojis[r.id % recipeEmojis.length] || "🍳"}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                <div className="absolute right-3 top-3">
                  <LikeButton
                    id={String(r.id)}
                    initialLiked={r.viewer_liked ?? false}
                    variant="compact"
                  />
                </div>

                <h3 className="absolute bottom-3 left-3 right-3 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-white drop-shadow">
                  {r.title}
                </h3>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="flex-1 text-sm leading-6 text-gray-600 line-clamp-3">
                  {r.description ||
                    "No description available for this delicious recipe."}
                </p>

                <div className="mt-5 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    ⭐ {formatRating(Number(r.average_rating ?? 0))}
                    {Number(r.rating_count ?? 0) > 0
                      ? ` (${Number(r.rating_count ?? 0)})`
                      : ""}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/recipes/${r.id}`}
                    className="fx-lift inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition-all hover:bg-orange-600 hover:text-white hover:shadow-md"
                  >
                    View Recipe
                  </Link>
                  {r.viewer_can_edit ? (
                    <Link
                      href={`/recipes/${r.id}/edit`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-5xl mb-4 opacity-50">🍽️</div>
          <h3 className="text-lg font-medium text-gray-900">
            No recipes found
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {q
              ? `No result for "${q}".`
              : "No recipe yet. Create your first one."}
          </p>
          {q && (
            <Link
              href="/recipes"
              className="mt-4 text-orange-600 hover:text-orange-700 hover:underline"
            >
              Clear search
            </Link>
          )}
        </div>
      )}

      {/* 📄 PAGINATION */}
      {recipes.length > 0 && (
        <div className="flex items-center justify-center space-x-2 pt-8 border-t">
          <Link
            href={`/recipes?q=${q}&page=${Math.max(1, page - 1)}`}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border transition-colors hover:bg-gray-50 ${page <= 1 ? "pointer-events-none opacity-50 bg-gray-50" : "bg-white"}`}
            aria-disabled={page <= 1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </Link>
          <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
            Page {page}
          </span>
          <Link
            href={`/recipes?q=${q}&page=${page + 1}`}
            className="inline-flex items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            Next
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
