"use client";

import { useState, useMemo } from "react";
import type { Case311 } from "../lib/types";

const PAGE_SIZE = 25;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CasesTable({ cases }: { cases: Case311[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const cats = new Set(
      cases.map((c) => c.service_name).filter((s): s is string => !!s)
    );
    return Array.from(cats).sort();
  }, [cases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter((c) => {
      if (q) {
        const haystack = [
          c.service_request_id,
          c.service_name,
          c.address,
          c.neighborhoods_sffind_boundaries,
          c.service_subtype,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== "all" && c.status_description !== statusFilter)
        return false;
      if (categoryFilter !== "all" && c.service_name !== categoryFilter)
        return false;
      return true;
    });
  }, [cases, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function onSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function onStatusFilter(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  function onCategoryFilter(val: string) {
    setCategoryFilter(val);
    setPage(1);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search by ID, category, address…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400 shrink-0">
          {filtered.length.toLocaleString()} result
          {filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Case ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Category
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                Address
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell whitespace-nowrap">
                Neighborhood
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                Source
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400 text-sm"
                >
                  No cases match your filters.
                </td>
              </tr>
            ) : (
              paginated.map((c) => (
                <tr
                  key={c.service_request_id}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                    {formatDate(c.requested_datetime)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    …{c.service_request_id.slice(-8)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium text-xs">
                      {c.service_name ?? "—"}
                    </div>
                    {c.service_subtype && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {c.service_subtype}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {c.address ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {c.neighborhoods_sffind_boundaries ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {c.source ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status_description === "Open"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {c.status_description}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
