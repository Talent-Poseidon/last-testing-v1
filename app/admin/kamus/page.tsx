"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/kamus")
      .then((r) => r.json())
      .then((data: KamusItem[]) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err: Error) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item: KamusItem) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filterType, search]);

  const handleDelete = async (item: KamusItem) => {
    setAlert(null);
    const res = await fetch(`/api/kamus/${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setAlert({ type: "error", message: data.error || "Delete failed" });
      return;
    }
    setAlert({ type: "success", message: `Deleted ${item.code}` });
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <nav data-testid="kamus-page-nav" className="text-sm font-medium">
        Kamus Potensi & Kompetensi
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kamus Potensi & Kompetensi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar seluruh item kamus yang sudah di-submit.
          </p>
        </div>
        <Link
          data-testid="upload-kamus-btn"
          href="/admin/kamus/upload"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Upload Template
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          data-testid="kamus-search-input"
          name="search"
          type="text"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          data-testid="kamus-type-filter"
          name="type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="potensi">Potensi</option>
          <option value="kompetensi">Kompetensi</option>
        </select>
      </div>

      {alert && (
        <div
          data-testid={
            alert.type === "success" ? "kamus-deleted-alert" : "kamus-delete-error-alert"
          }
          className={`rounded-xl border p-4 text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {alert.message}
        </div>
      )}

      <div data-testid="kamus-list-container" className="rounded-xl border border-border bg-card">
        {loading ? (
          <p data-testid="kamus-list-loading" className="p-6 text-sm text-muted-foreground">
            Loading…
          </p>
        ) : filtered.length > 0 ? (
          <ul data-testid="kamus-list" className="divide-y divide-border">
            {filtered.map((item: KamusItem) => (
              <li
                key={item.id}
                data-testid={`kamus-item-${item.code}`}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                    <span
                      data-testid={`kamus-item-${item.code}-type`}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        item.type === "potensi"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <button
                  type="button"
                  data-testid={`delete-kamus-${item.code}-btn`}
                  onClick={() => handleDelete(item)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="kamus-list-empty" className="p-6 text-sm text-muted-foreground">
            No kamus items found.
          </p>
        )}
      </div>
    </div>
  );
}
