"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface KamusItem {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

export default function KamusListPage() {
  const [items, setItems] = useState<KamusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/kamus?${params.toString()}`);
      const data: KamusItem[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleDelete = async (item: KamusItem) => {
    setDeleteMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/kamus/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || data.error || "Delete failed");
        return;
      }
      setDeleteMsg(`Kamus '${item.code}' deleted.`);
      void fetchItems();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div data-testid="kamus-list-page-container">
      <nav data-testid="kamus-page-nav" className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kamus Potensi &amp; Kompetensi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Master data for all assessment potensi and kompetensi items.
          </p>
        </div>
        <Link
          href="/admin/kamus/upload"
          data-testid="kamus-upload-link"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Upload Template
        </Link>
      </nav>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <label htmlFor="kamus-type-filter" className="text-sm">
            Type:
          </label>
          <select
            id="kamus-type-filter"
            data-testid="kamus-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="potensi">Potensi</option>
            <option value="kompetensi">Kompetensi</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="kamus-search-input" className="text-sm">
            Search:
          </label>
          <input
            id="kamus-search-input"
            data-testid="kamus-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      {deleteMsg && (
        <div
          data-testid="kamus-deleted-alert"
          className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {deleteMsg}
        </div>
      )}

      {errorMsg && (
        <div
          data-testid="kamus-delete-error-alert"
          className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      <div data-testid="kamus-list-container">
        {loading ? (
          <p data-testid="kamus-list-loading">Loading...</p>
        ) : items.length === 0 ? (
          <p data-testid="kamus-list-empty">No kamus items found.</p>
        ) : (
          <table className="w-full text-sm" data-testid="kamus-list">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Code</th>
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Description</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: KamusItem) => (
                <tr
                  key={item.id}
                  data-testid={`kamus-item-${item.id}`}
                  data-kamus-code={item.code}
                  className="border-b"
                >
                  <td className="p-2 font-mono">{item.code}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 capitalize">{item.type}</td>
                  <td className="p-2 text-muted-foreground">
                    {item.description.length > 80
                      ? `${item.description.slice(0, 80)}...`
                      : item.description}
                  </td>
                  <td className="p-2">
                    <button
                      data-testid={`kamus-delete-btn-${item.id}`}
                      data-kamus-code-delete={item.code}
                      onClick={() => handleDelete(item)}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
