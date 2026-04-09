"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function parseListFromText(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function listToMultilineText(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0)
    .join("\n");
}

function normalizeUrlList(value: unknown, fallback?: unknown): string[] {
  const fromArray = Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0)
    : [];

  if (fromArray.length > 0) {
    return fromArray;
  }

  const fallbackValue = String(fallback ?? "").trim();
  return fallbackValue ? [fallbackValue] : [];
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const recipeId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");

  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toastState, setToastState] = useState<"hidden" | "enter" | "exit">(
    "hidden",
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      videoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews, videoPreviews]);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!recipeId) {
        setError("Recipe id is invalid.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/recipes/${recipeId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Unable to load recipe.");
        }

        const payload = await res.json();

        if (!payload?.viewer_can_edit) {
          setError("You do not have permission to edit this recipe.");
          return;
        }

        const recipe = payload.data;
        setTitle(String(recipe?.title ?? ""));
        setDescription(String(recipe?.description ?? ""));
        setIngredientsText(listToMultilineText(recipe?.ingredients));
        setStepsText(listToMultilineText(recipe?.steps));
        setExistingImageUrls(
          normalizeUrlList(recipe?.image_urls, recipe?.image_url),
        );
        setExistingVideoUrls(normalizeUrlList(recipe?.video_urls));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error.");
      } finally {
        setLoading(false);
      }
    };

    void loadRecipe();
  }, [recipeId]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);

    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

    if (selectedFiles.length === 0) {
      setImageFiles([]);
      setImagePreviews([]);
      return;
    }

    setImageFiles(selectedFiles);
    setImagePreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);

    videoPreviews.forEach((preview) => URL.revokeObjectURL(preview));

    if (selectedFiles.length === 0) {
      setVideoFiles([]);
      setVideoPreviews([]);
      return;
    }

    setVideoFiles(selectedFiles);
    setVideoPreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const uploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload file: ${file.name}`);
    }

    const uploadData = await uploadRes.json();
    const uploadedUrl = uploadData?.url;

    if (typeof uploadedUrl !== "string" || !uploadedUrl.trim()) {
      throw new Error(`Invalid upload response for file: ${file.name}`);
    }

    return uploadedUrl.trim();
  };

  const removeSelectedImage = (index: number) => {
    setImagePreviews((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target);
      }
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });

    setImageFiles((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const removeSelectedVideo = (index: number) => {
    setVideoPreviews((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target);
      }
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });

    setVideoFiles((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleSubmit = async () => {
    if (!recipeId) {
      setError("Recipe id is invalid.");
      return;
    }

    if (!title || !description) {
      setError("Please provide both title and description.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const uploadedImages =
        imageFiles.length > 0
          ? await Promise.all(imageFiles.map(uploadMedia))
          : [];
      const uploadedVideos =
        videoFiles.length > 0
          ? await Promise.all(videoFiles.map(uploadMedia))
          : [];

      const finalImageUrls = [...existingImageUrls, ...uploadedImages];
      const finalVideoUrls = [...existingVideoUrls, ...uploadedVideos];

      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          ingredients: parseListFromText(ingredientsText),
          steps: parseListFromText(stepsText),
          image_url: finalImageUrls[0] ?? null,
          image_urls: finalImageUrls,
          video_urls: finalVideoUrls,
        }),
      });

      if (res.status === 401) {
        router.push(
          `/auth/login?next=${encodeURIComponent(`/recipes/${recipeId}/edit`)}`,
        );
        return;
      }

      if (res.status === 403) {
        setError("You do not have permission to edit this recipe.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to update recipe.");
      }

      setToastState("enter");
      setTimeout(() => {
        setToastState("exit");
      }, 850);
      setTimeout(() => {
        router.push(`/recipes/${recipeId}`);
        router.refresh();
      }, 1250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      {toastState !== "hidden" ? (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg transition-all duration-300 ${toastState === "enter" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        >
          Recipe saved successfully.
        </div>
      ) : null}

      <div className="mb-6 border-b border-orange-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Recipe</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading recipe...</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Recipe Title
            </label>
            <input
              id="title"
              placeholder="Ex: Creamy Garlic Pasta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              placeholder="Tell people what makes this recipe special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="ingredients"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Ingredients
            </label>
            <textarea
              id="ingredients"
              placeholder={"Ex:\n200g pasta\n2 cloves garlic\n1 tbsp olive oil"}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="steps"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Steps
            </label>
            <textarea
              id="steps"
              placeholder={
                "Ex:\nBoil pasta for 8-10 minutes.\nSaute garlic in olive oil.\nMix pasta with sauce and serve."
              }
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700">
                Current Images
              </label>
              <span className="text-xs text-gray-500">Remove or add.</span>
            </div>

            {existingImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {existingImageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Recipe image ${index + 1}`}
                      className="h-24 w-full rounded-xl border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExistingImageUrls((prev) =>
                          prev.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Remove image
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No existing images.</p>
            )}

            <div>
              <input
                id="image"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              {imagePreviews.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={`${preview}-${index}`} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`New image preview ${index + 1}`}
                        className="h-24 w-full rounded-xl border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove selected image ${index + 1}`}
                        onClick={() => removeSelectedImage(index)}
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-black/60 text-sm font-bold text-white transition hover:bg-black/75"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Add new images.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700">
                Current Videos
              </label>
              <span className="text-xs text-gray-500">Remove or add.</span>
            </div>

            {existingVideoUrls.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {existingVideoUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="space-y-2">
                    <video
                      controls
                      preload="metadata"
                      className="h-36 w-full rounded-xl border border-gray-200 bg-black object-contain"
                      src={url}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <button
                      type="button"
                      onClick={() =>
                        setExistingVideoUrls((prev) =>
                          prev.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Remove video
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No existing videos.</p>
            )}

            <div>
              <input
                id="videoFiles"
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                multiple
                onChange={handleVideoChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              {videoPreviews.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {videoPreviews.map((preview, index) => (
                    <div key={`${preview}-${index}`} className="relative">
                      <video
                        controls
                        preload="metadata"
                        className="h-36 w-full rounded-xl border border-gray-200 bg-black object-contain"
                        src={preview}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <button
                        type="button"
                        aria-label={`Remove selected video ${index + 1}`}
                        onClick={() => removeSelectedVideo(index)}
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-black/60 text-sm font-bold text-white transition hover:bg-black/75"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Add new videos.</p>
              )}
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() =>
                router.push(recipeId ? `/recipes/${recipeId}` : "/recipes")
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || loading}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
