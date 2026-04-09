import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import TypingEffect from "@/components/TypingEffect";
import type { CSSProperties } from "react";

export default async function Home() {
  const currentUser = await getCurrentUser();
  const exploreHref = "/recipes";
  const newRecipeHref = currentUser
    ? "/recipes/new"
    : "/auth/login?next=%2Frecipes%2Fnew";

  return (
    <div className="fx-fade-up relative overflow-hidden rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-sm sm:p-10">
      <div className="fx-float pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-orange-100/70 blur-3xl" />
      <div className="fx-float pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-amber-100/80 blur-3xl" />

      <div className="relative flex min-h-[65vh] flex-col items-center justify-center gap-10 text-center">
        <div className="space-y-4 max-w-3xl">
          <p className="fx-shimmer mx-auto w-fit rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700">
            Community Recipe Platform
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Cook, Share, and{" "}
            <TypingEffect
              words={["Enjoy", "Create", "Inspire", "Savor"]}
              className="text-orange-600"
            />
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 sm:text-xl">
            Discover delicious recipes from the community, publish your
            signature dishes, and keep all your kitchen inspirations in one
            place.
          </p>
        </div>

        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href={exploreHref}
            className="fx-lift inline-flex items-center justify-center rounded-full bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Explore Recipes
          </Link>
          <Link
            href={newRecipeHref}
            className="fx-lift inline-flex items-center justify-center rounded-full border-2 border-orange-200 bg-white px-8 py-3 text-base font-semibold text-gray-800 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Share a Recipe
          </Link>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            className="fx-fade-up fx-stagger fx-lift rounded-2xl border border-orange-100 bg-orange-50/50 p-6 text-left shadow-sm"
            style={{ "--d": 1 } as CSSProperties}
          >
            <p className="mb-3 text-2xl">Discover</p>
            <h3 className="text-lg font-semibold text-gray-900">
              Find New Ideas Daily
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Browse a growing collection of recipes with fast search and easy
              navigation.
            </p>
          </div>
          <div
            className="fx-fade-up fx-stagger fx-lift rounded-2xl border border-orange-100 bg-white p-6 text-left shadow-sm"
            style={{ "--d": 2 } as CSSProperties}
          >
            <p className="mb-3 text-2xl">Create</p>
            <h3 className="text-lg font-semibold text-gray-900">
              Publish In Minutes
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Add your own recipe with title, details, and story in a clean
              writing flow.
            </p>
          </div>
          <div
            className="fx-fade-up fx-stagger fx-lift rounded-2xl border border-orange-100 bg-amber-50/60 p-6 text-left shadow-sm"
            style={{ "--d": 3 } as CSSProperties}
          >
            <p className="mb-3 text-2xl">Connect</p>
            <h3 className="text-lg font-semibold text-gray-900">
              Engage With Others
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Share, receive likes, and exchange feedback through comments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
