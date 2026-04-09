"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteRecipeButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const startConfirmDelete = () => {
    setError("");
    setConfirming(true);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setConfirming(false);
    setError("");
  };

  const handleDelete = async () => {
    setError("");

    setDeleting(true);

    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete recipe.");
      }

      router.push("/recipes");
      router.refresh();
    } catch {
      setError("Unable to delete recipe right now.");
    } finally {
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={startConfirmDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete recipe"}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-red-200 bg-white p-3">
      <p className="text-sm text-red-700">
        Delete this recipe? This action cannot be undone.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={cancelDelete}
          disabled={deleting}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
