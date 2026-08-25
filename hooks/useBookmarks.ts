"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ccsd-bookmarks";

function readBookmarks(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  useEffect(() => {
    setBookmarks(readBookmarks());
  }, []);

  const toggle = useCallback((githubId: number) => {
    setBookmarks((prev) => {
      const next = prev.includes(githubId) ? prev.filter((id) => id !== githubId) : [...prev, githubId];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback((githubId: number) => bookmarks.includes(githubId), [bookmarks]);

  return { bookmarks, toggle, isBookmarked };
}
