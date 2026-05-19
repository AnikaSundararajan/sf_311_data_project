import { Suspense } from "react";
import type { Case311, CategoryCount } from "./lib/types";
import CasesTable from "./components/CasesTable";

const API_BASE = "https://data.sfgov.org/resource/vw6y-z8j6.json";

async function getRecentCases(): Promise<Case311[]> {
  const res = await fetch(
    `${API_BASE}?$limit=200&$order=requested_datetime+DESC`
  );
  if (!res.ok) return [];
  return res.json();
}

async function getCategoryBreakdown(): Promise<CategoryCount[]> {
  const res = await fetch(
    `${API_BASE}?$select=service_name,count(*)+as+count&$group=service_name&$order=count+DESC&$limit=10`
  );
  if (!res.ok) return [];
  return res.json();
}

function StatCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${valueClass ?? "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-purple-500",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-violet-400",
];

async function Dashboard() {
  const [cases, categories] = await Promise.all([
    getRecentCases(),
    getCategoryBreakdown(),
  ]);

  const open = cases.filter((c) => c.status_description === "Open").length;
  const closed = cases.filter((c) => c.status_description !== "Open").length;
  const total = cases.length;

  const closedWithDates = cases.filter(
    (c) => c.status_description !== "Open" && c.closed_date
  );
  let avgDays: string | null = null;
  if (closedWithDates.length > 0) {
    const totalMs = closedWithDates.reduce((sum, c) => {
      return (
        sum +
        (new Date(c.closed_date!).getTime() -
          new Date(c.requested_datetime).getTime())
      );
    }, 0);
    avgDays = (totalMs / closedWithDates.length / 86_400_000).toFixed(1);
  }

  const maxCategoryCount =
    categories.length > 0 ? parseInt(categories[0].count) || 1 : 1;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs tracking-tight">
              311
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            SF 311 Dashboard
          </h1>
        </div>
        <p className="text-sm text-gray-500 pl-12">
          San Francisco service request data &middot; {total.toLocaleString()}{" "}
          most recent requests
        </p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Requests"
          value={total.toLocaleString()}
          sub="in current view"
        />
        <StatCard
          label="Open"
          value={open.toLocaleString()}
          valueClass="text-amber-600"
          sub={
            total > 0 ? `${Math.round((open / total) * 100)}% of total` : "—"
          }
        />
        <StatCard
          label="Closed"
          value={closed.toLocaleString()}
          valueClass="text-emerald-600"
          sub={
            total > 0
              ? `${Math.round((closed / total) * 100)}% of total`
              : "—"
          }
        />
        <StatCard
          label="Avg Resolution"
          value={avgDays ? `${avgDays}d` : "—"}
          sub="days to close"
        />
      </section>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Top Request Categories
          </h2>
          <div className="space-y-3">
            {categories.map((cat, i) => {
              const count = parseInt(cat.count) || 0;
              const pct = Math.round((count / maxCategoryCount) * 100);
              return (
                <div key={cat.service_name} className="flex items-center gap-3">
                  <div className="w-52 text-sm text-gray-700 truncate shrink-0">
                    {cat.service_name || "Unknown"}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        BAR_COLORS[i % BAR_COLORS.length]
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-500 text-right tabular-nums shrink-0">
                    {count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cases table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Recent Service Requests
          </h2>
        </div>
        <CasesTable cases={cases} />
      </section>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-200 rounded-lg animate-pulse" />
          <div className="h-7 w-44 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse ml-12" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-7 w-14 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-8">
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-52 bg-gray-100 rounded animate-pulse" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-96 animate-pulse" />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
