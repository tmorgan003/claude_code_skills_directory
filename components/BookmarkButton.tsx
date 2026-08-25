"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

export function BookmarkButton({ githubId }: { githubId: number }) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(githubId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(githubId);
      }}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      aria-pressed={bookmarked}
      className="rounded-full p-1.5 text-gray-500 hover:bg-black/5 hover:text-accent dark:hover:bg-white/10"
    >
      {bookmarked ? <BookmarkCheck size={18} className="text-accent" /> : <Bookmark size={18} />}
    </button>
  );
}
