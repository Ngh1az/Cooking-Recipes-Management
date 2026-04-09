"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parseListFromText(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function Page() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      videoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews, videoPreviews]);

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

  const handleSubmit = async () => {
    if (!title || !description) {
      setError("Please provide both title and description.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const uploadedImages = await Promise.all(imageFiles.map(uploadMedia));
      const uploadedVideos = await Promise.all(videoFiles.map(uploadMedia));

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          ingredients: parseListFromText(ingredientsText),
          steps: parseListFromText(stepsText),
          image_url: uploadedImages[0] ?? null,
          image_urls: uploadedImages,
          video_urls: uploadedVideos,
        }),
      });

      if (res.status === 401) {
        router.push("/auth/login?next=%2Frecipes%2Fnew");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to create recipe.");
      }

      router.push("/recipes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 border-b border-orange-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Create New Recipe</h1>
        <p className="mt-1 text-sm text-gray-600">
          Share your favorite dish with the community.
        </p>
      </div>

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
            Ingredients (one per line)
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
            Steps (one per line)
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

        <div>
          <label
            htmlFor="image"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Recipe Images (optional, multiple)
          </label>
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${preview}-${index}`}
                  src={preview}
                  alt={`Recipe preview ${index + 1}`}
                  className="h-28 w-full rounded-xl border border-gray-200 object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="videoFiles"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Recipe Videos (optional, upload from device)
          </label>
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
                <video
                  key={`${preview}-${index}`}
                  controls
                  preload="metadata"
                  className="h-36 w-full rounded-xl border border-gray-200 bg-black object-contain"
                  src={preview}
                >
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => router.push("/recipes")}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
