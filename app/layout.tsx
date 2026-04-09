import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthMenu from "@/components/AuthMenu";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recipe Manager",
  description: "Discover and share amazing recipes",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const createRecipeHref = currentUser
    ? "/recipes/new"
    : "/auth/login?next=%2Frecipes%2Fnew";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b border-orange-100/80 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm">
                🍳
              </span>
              <span className="font-semibold text-lg tracking-tight text-orange-700">
                RecipeHub
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium sm:gap-3">
              <AuthMenu
                user={
                  currentUser
                    ? {
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        avatarUrl: currentUser.avatarUrl,
                      }
                    : null
                }
              />
            </nav>
          </div>
        </header>
        <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mt-10 border-t border-orange-100 bg-white/95">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:py-10 lg:px-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-base">
                  🍳
                </span>
                <span className="text-lg font-semibold tracking-tight text-orange-700">
                  RecipeHub
                </span>
              </Link>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Discover, save, and share recipes with a fast, modern cooking
                community.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-600">
                  IG
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-600">
                  FB
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-600">
                  X
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                Explore
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    href="/recipes"
                    className="transition hover:text-orange-700"
                  >
                    Browse Recipes
                  </Link>
                </li>
                <li>
                  <Link
                    href={createRecipeHref}
                    className="transition hover:text-orange-700"
                  >
                    Create Recipe
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    className="transition hover:text-orange-700"
                  >
                    My Profile
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                Account
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    href="/auth/login"
                    className="transition hover:text-orange-700"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/register"
                    className="transition hover:text-orange-700"
                  >
                    Register
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="transition hover:text-orange-700"
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                Newsletter
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Get new cooking ideas in your inbox every week.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                />
                <button
                  type="button"
                  className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-100">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row sm:px-6 lg:px-8">
              <p>
                &copy; {new Date().getFullYear()} RecipeHub. All rights
                reserved.
              </p>
              <div className="flex items-center gap-4">
                <span>Privacy</span>
                <span>Terms</span>
                <span>Contact</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
