"use client";

import { useState } from "react";
import type { AgencyStats } from "../lib/types";

type SortKey = "focus" | "open_count" | "avg_days";

function focusScore(
  agency: AgencyStats,
  maxOpen: number,
  maxDays: number
): number {
  const openNorm = maxOpen > 0 ? agency.open_count / maxOpen : 0;
  const daysNorm = maxDays > 0 ? (agency.avg_days ?? 0) / maxDays : 0;
  return openNorm * 0.6 + daysNorm * 0.4;
}

function priorityLabel(score: number): {
  label: string;
  className: string;
} {
  if (score >= 0.5)
    return {
      label: "High Priority",
      className:
        "bg-red-50 text-red-700 border border-red-200",
    };
  if (score >= 0.25)
    return {
      label: "Review",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  return {
    label: "On Track",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
}

function avgDaysClass(days: number | null): string {
  if (days === null) return "text-gray-400";
  if (days >= 30) return "text-red-600 font-semibold";
  if (days >= 14) return "text-amber-600 font-medium";
  if (days >= 7) return "text-yellow-600";
  return "text-emerald-600";
}

export default function AgencyTable({
  agencies,
}: {
  agencies: AgencyStats[];
}) {
  const [sortBy, setSortBy] = useState<SortKey>("focus");

  const maxOpen = Math.max(...agencies.map((a) => a.open_count), 1);
  const maxDays = Math.max(...agencies.map((a) => a.avg_days ?? 0), 1);

  const sorted = [...agencies].sort((a, b) => {
    if (sortBy === "open_count") return b.open_count - a.open_count;
    if (sortBy === "avg_days") return (b.avg_days ?? 0) - (a.avg_days ?? 0);
    return focusScore(b, maxOpen, maxDays) - focusScore(a, maxOpen, maxDays);
  });

  const SORT_OPTIONS: [SortKey, string][] = [
    ["focus", "Focus Priority"],
    ["open_count", "Open Backlog"],
    ["avg_days", "Resolution Speed"],
  ];

  return (
    <div>
      {/* Sort tabs */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 mr-1">Sort by:</span>
        {SORT_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              sortBy === key
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          {agencies.length} agencies
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Agency
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">
                Open Cases
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">
                Avg Days to Close
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                Top Open Categories
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Investment Focus
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((agency) => {
              const score = focusScore(agency, maxOpen, maxDays);
              const priority = priorityLabel(score);
              const openPct = Math.round((agency.open_count / maxOpen) * 100);

              return (
                <tr
                  key={agency.agency}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  {/* Agency name */}
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 text-sm leading-tight">
                      {agency.agency}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {(agency.open_count + agency.closed_count).toLocaleString()} total requests sampled
                    </div>
                  </td>

                  {/* Open cases + bar */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-gray-900 font-bold tabular-nums text-sm">
                        {agency.open_count.toLocaleString()}
                      </span>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            openPct >= 70
                              ? "bg-red-400"
                              : openPct >= 40
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                          style={{ width: `${openPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Avg days */}
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`text-sm tabular-nums ${avgDaysClass(
                        agency.avg_days
                      )}`}
                    >
                      {agency.avg_days != null
                        ? `${agency.avg_days.toFixed(1)}d`
                        : "—"}
                    </span>
                    {agency.avg_days != null && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {agency.closed_count.toLocaleString()} closed sampled
                      </div>
                    )}
                  </td>

                  {/* Top categories */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {agency.top_categories.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {agency.top_categories.map((cat) => (
                          <div
                            key={cat.name}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="text-xs text-gray-700 truncate max-w-[180px]"
                              title={cat.name}
                            >
                              {cat.name}
                            </span>
                            <span className="text-xs text-gray-400 tabular-nums shrink-0">
                              {cat.open_count.toLocaleString()} open
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Priority badge */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${priority.className}`}
                    >
                      {priority.label}
                    </span>
                    <div className="text-xs text-gray-400 mt-1 tabular-nums">
                      score {(score * 100).toFixed(0)}/100
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-100 flex gap-4 flex-wrap text-xs text-gray-500">
        <span className="font-medium">Avg days color:</span>
        <span className="text-emerald-600">&lt;7d — fast</span>
        <span className="text-yellow-600">7–14d</span>
        <span className="text-amber-600">14–30d</span>
        <span className="text-red-600 font-semibold">&gt;30d — slow</span>
        <span className="ml-4 text-gray-400">
          Resolution time from last 3 months of closed cases
        </span>
      </div>
    </div>
  );
}
