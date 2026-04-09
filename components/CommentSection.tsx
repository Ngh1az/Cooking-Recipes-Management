"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: number;
  content: string;
  author_name: string;
};

export default function CommentSection({ recipeId }: { recipeId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`/api/recipes/${recipeId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.data ?? []))
      .catch(() => setError("Unable to load comments."))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleAdd = async () => {
    if (!text.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        throw new Error("Unable to add comment.");
      }

      const newComment = await res.json();
      setComments((prev) => [newComment.data, ...prev]);
      setText("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unexpected error while adding comment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/comments/${id}`, {
      method: "DELETE",
    });

    setComments((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
        <p className="text-sm text-gray-500">
          Share your thoughts about this recipe.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            placeholder="Write your comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          <button
            onClick={handleAdd}
            disabled={submitting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
          No comments yet. Be the first to leave one.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-orange-700">
                {c.author_name}
              </p>
              <p className="text-sm leading-6 text-gray-700">{c.content}</p>
              <div className="mt-3">
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs font-medium text-red-600 transition hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
