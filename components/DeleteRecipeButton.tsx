"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteRecipeButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this recipe? This action cannot be undone.",
    );
    if (!confirmed) return;

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
      window.alert("Unable to delete recipe right now.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "Deleting..." : "Delete recipe"}
    </button>
  );
}
