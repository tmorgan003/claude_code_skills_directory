export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { getLatestSuccessfulRun } from "@/lib/query";

export const metadata: Metadata = {
  title: "Claude Code Skills Directory",
  description: "The most popular Claude Code skills and MCP servers on GitHub, refreshed automatically.",
};

const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lastRun = getLatestSuccessfulRun();

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Header lastUpdated={lastRun?.finishedAt ?? null} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-gray-500">
          Community-sourced directory. Not an official Anthropic product.
        </footer>
      </body>
    </html>
  );
}
