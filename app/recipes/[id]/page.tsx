import LikeButton from "@/components/LikeButton";
import RatingStars from "@/components/RatingStars";
import CommentSection from "@/components/CommentSection";
import DeleteRecipeButton from "@/components/DeleteRecipeButton";
import Link from "next/link";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/get-base-url";

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

function normalizeUrlList(value: unknown, fallback?: unknown): string[] {
  const fromArray = normalizeList(value);
  if (fromArray.length > 0) {
    return fromArray;
  }

  const fallbackValue = String(fallback ?? "").trim();
  return fallbackValue ? [fallbackValue] : [];
}

function formatDate(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${getBaseUrl()}/api/recipes/${resolvedParams.id}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <h2 className="text-lg font-semibold">Recipe not available</h2>
        <p className="mt-1 text-sm">
          This recipe may have been removed or is currently unreachable.
        </p>
        <Link
          href="/recipes"
          className="mt-3 inline-block text-sm font-medium underline"
        >
          Back to recipes
        </Link>
      </div>
    );
  }

  const data = await res.json();
  const recipe = data.data;
  const ingredients = normalizeList(recipe.ingredients);
  const steps = normalizeList(recipe.steps);
  const publishedAt = formatDate(recipe.created_at);
  const chefName =
    recipe.author_name || recipe.author_username || "Unknown chef";
  const imageUrls = normalizeUrlList(recipe.image_urls, recipe.image_url);
  const videoUrls = normalizeUrlList(recipe.video_urls, recipe.video_url);
  const hasImage = imageUrls.length > 0;
  const hasVideo = videoUrls.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-white/90 px-4 py-3 shadow-sm">
        <Link
          href="/recipes"
          className="text-sm font-medium text-orange-700 transition hover:text-orange-800"
        >
          ← Back to recipes
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <article className="space-y-6 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {recipe.title}
            </h1>
            <p className="text-base leading-7 text-gray-600">
              {recipe.description}
            </p>
          </header>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                Media
              </h2>
            </div>

            {hasVideo || hasImage ? (
              <div className="space-y-3">
                {videoUrls.length > 0 ? (
                  <div className="grid gap-3">
                    {videoUrls.map((videoUrl, index) => (
                      <div
                        key={`${videoUrl}-${index}`}
                        className="overflow-hidden rounded-xl border border-orange-100 bg-black"
                      >
                        <video
                          controls
                          preload="metadata"
                          className="h-64 w-full bg-black object-contain sm:h-80"
                          src={videoUrl}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ))}
                  </div>
                ) : null}

                {imageUrls.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {imageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="overflow-hidden rounded-xl border border-orange-100 bg-orange-50/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={`${recipe.title} image ${index + 1}`}
                          className="h-52 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-orange-100 bg-orange-50/30">
                <div className="flex h-64 items-center justify-center text-6xl opacity-70 sm:h-80">
                  🍳
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Ingredients
                </h2>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                  {ingredients.length} items
                </span>
              </div>

              {ingredients.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  No ingredients provided.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  {ingredients.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 leading-6"
                    >
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Steps
                </h2>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                  {steps.length} steps
                </span>
              </div>

              {steps.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No steps provided.</p>
              ) : (
                <ol className="mt-4 space-y-3 text-sm text-gray-700">
                  {steps.map((step, index) => (
                    <li
                      key={`${step}-${index}`}
                      className="flex gap-3 rounded-lg bg-white px-3 py-3 leading-6"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Quick Info
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-gray-500">Chef</dt>
                <dd className="text-right font-medium text-gray-900">
                  {chefName}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-gray-500">Published</dt>
                <dd className="text-right font-medium text-gray-900">
                  {publishedAt || "N/A"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
              <LikeButton
                id={resolvedParams.id}
                initialLikes={data.likes}
                initialLiked={data.viewer_liked ?? false}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Rate This Recipe
            </h2>
            <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
              <RatingStars
                id={resolvedParams.id}
                initialAverage={Number(data.average_rating ?? 0)}
                initialCount={Number(data.rating_count ?? 0)}
                initialUserRating={Number(data.viewer_rating ?? 0)}
              />
            </div>
          </section>

          {data.viewer_can_edit ? (
            <section className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
                Manage Recipe
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href={`/recipes/${resolvedParams.id}/edit`}
                  className="inline-flex items-center justify-center rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
                >
                  Edit recipe
                </Link>
                <DeleteRecipeButton id={resolvedParams.id} />
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <CommentSection recipeId={resolvedParams.id} />
      </section>
    </div>
  );
}
