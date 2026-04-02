"use client";

import Link from "next/link";
import { tools, categoryLabels, type Tool } from "@/data/tools";

const categoryOrder: Tool["category"][] = ["law", "kids", "other"];

export default function PortalHome() {
  // Group tools by category, only show categories that have tools
  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      items: tools.filter((t) => t.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              PP 学习工具箱
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              用 Vibe Coding 快速搭建的交互式学习工具合集
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {grouped.map((group) => (
          <section key={group.category} className="mb-10 sm:mb-14">
            <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-4 sm:mb-6 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-indigo-500 inline-block" />
              {group.label}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {group.items.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        {tools.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-5xl mb-4">🚧</p>
            <p className="text-lg font-medium">工具箱建设中…</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/60 py-6 text-center text-xs text-slate-400">
        Built with Next.js & Vibe Coding
      </footer>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="group block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0">{tool.icon}</span>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
            {tool.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
            {tool.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
