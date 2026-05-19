import { Suspense } from "react";
import { connection } from "next/server";
import type { AgencyStats } from "./lib/types";
import AgencyTable from "./components/AgencyTable";

const BASE = "https://data.sfgov.org/resource/vw6y-z8j6.json";

async function soql<T>(params: Record<string, string>): Promise<T[]> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  return res.json();
}

type OpenRow = { agency_responsible: string; open_count: string };
type ClosedRow = {
  agency_responsible: string;
  requested_datetime: string;
  closed_date: string;
};
type CategoryRow = {
  agency_responsible: string;
  service_name: string;
  cat_count: string;
};

async function getAgencyStats(): Promise<AgencyStats[]> {
  // connection() defers this function to request time, which is required
  // before calling new Date() under Cache Components.
  await connection();

  // Three parallel queries: open backlog per agency, closed cases with dates
  // for resolution time, and open cases broken down by agency+category.
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sinceDate = threeMonthsAgo.toISOString().slice(0, 10);

  const [openRows, closedRows, categoryRows] = await Promise.all([
    soql<OpenRow>({
      $select: "agency_responsible,count(*) as open_count",
      $where: "status_description='Open' AND agency_responsible IS NOT NULL",
      $group: "agency_responsible",
      $order: "open_count DESC",
      $limit: "30",
    }),
    soql<ClosedRow>({
      $select: "agency_responsible,requested_datetime,closed_date",
      $where: `status_description='Closed' AND closed_date IS NOT NULL AND requested_datetime >= '${sinceDate}T00:00:00' AND agency_responsible IS NOT NULL`,
      $limit: "5000",
    }),
    soql<CategoryRow>({
      $select: "agency_responsible,service_name,count(*) as cat_count",
      $where:
        "status_description='Open' AND agency_responsible IS NOT NULL AND service_name IS NOT NULL",
      $group: "agency_responsible,service_name",
      $order: "cat_count DESC",
      $limit: "300",
    }),
  ]);

  // Avg resolution days per agency from raw closed rows
  const daysAccum = new Map<string, { sum: number; count: number }>();
  for (const row of closedRows) {
    const ms =
      new Date(row.closed_date).getTime() -
      new Date(row.requested_datetime).getTime();
    if (isNaN(ms) || ms < 0) continue;
    const agency = row.agency_responsible;
    const prev = daysAccum.get(agency) ?? { sum: 0, count: 0 };
    daysAccum.set(agency, { sum: prev.sum + ms / 86_400_000, count: prev.count + 1 });
  }

  // Closed count per agency (from sampled rows)
  const closedCount = new Map<string, number>();
  for (const row of closedRows) {
    closedCount.set(
      row.agency_responsible,
      (closedCount.get(row.agency_responsible) ?? 0) + 1
    );
  }

  // Top open categories per agency (preserve sorted order from API)
  const catMap = new Map<string, Array<{ name: string; open_count: number }>>();
  for (const row of categoryRows) {
    const agency = row.agency_responsible;
    const arr = catMap.get(agency) ?? [];
    arr.push({ name: row.service_name, open_count: parseInt(row.cat_count) || 0 });
    catMap.set(agency, arr);
  }

  return openRows
    .filter((r) => r.agency_responsible?.trim())
    .map((r) => {
      const agency = r.agency_responsible;
      const openCount = parseInt(r.open_count) || 0;
      const dayStats = daysAccum.get(agency);
      return {
        agency,
        open_count: openCount,
        avg_days: dayStats ? dayStats.sum / dayStats.count : null,
        closed_count: closedCount.get(agency) ?? 0,
        top_categories: (catMap.get(agency) ?? []).slice(0, 4),
      };
    });
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

async function Dashboard() {
  const agencies = await getAgencyStats();

  const totalOpen = agencies.reduce((s, a) => s + a.open_count, 0);
  const withAvg = agencies.filter((a) => a.avg_days != null);
  const overallAvg =
    withAvg.length > 0
      ? withAvg.reduce((s, a) => s + a.avg_days!, 0) / withAvg.length
      : null;

  const mostBacklogged = agencies.reduce(
    (max, a) => (a.open_count > (max?.open_count ?? -1) ? a : max),
    null as AgencyStats | null
  );
  const slowest = withAvg.reduce(
    (max, a) => (a.avg_days! > (max?.avg_days ?? -1) ? a : max),
    null as AgencyStats | null
  );

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
            SF Agency Investment Prioritization
          </h1>
        </div>
        <p className="text-sm text-gray-500 pl-12">
          Which city agencies need more resources — and in what specific areas
        </p>
      </header>

      {/* Summary stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Open Cases"
          value={totalOpen.toLocaleString()}
          valueClass="text-amber-600"
          sub="across all agencies"
        />
        <StatCard
          label="Agencies Tracked"
          value={agencies.length}
          sub="with open backlog"
        />
        <StatCard
          label="Most Backlogged"
          value={mostBacklogged?.open_count.toLocaleString() ?? "—"}
          sub={mostBacklogged?.agency ?? ""}
        />
        <StatCard
          label="Slowest Avg Resolution"
          value={slowest?.avg_days != null ? `${slowest.avg_days.toFixed(1)}d` : "—"}
          valueClass="text-red-600"
          sub={slowest?.agency ?? ""}
        />
      </section>

      {/* Agency table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Agency Performance &amp; Investment Priority
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Sorted by focus score — a weighted combination of open backlog (60%)
            and average resolution time (40%)
          </p>
        </div>
        <AgencyTable agencies={agencies} />
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
          <div className="h-7 w-80 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse ml-12" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-7 w-14 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse hidden lg:block" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
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
