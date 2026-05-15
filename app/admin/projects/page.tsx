"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  batches: Array<{ id: string; name: string; participants: Array<{ id: string }> }>;
  assessors: Array<{ assessor: { id: string; name: string } }>;
}

export default function ProjectsListPage() {
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectListItem[]) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err: Error) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <nav data-testid="project-list-page-nav" className="text-sm font-medium">
        Projects
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar seluruh project yang sudah dibuat.
          </p>
        </div>
        <Link
          data-testid="new-project-btn"
          href="/admin/projects/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New Project
        </Link>
      </div>

      <div data-testid="project-list-container" className="rounded-xl border border-border bg-card">
        {loading ? (
          <p data-testid="project-list-loading" className="p-6 text-sm text-muted-foreground">
            Loading…
          </p>
        ) : items.length > 0 ? (
          <ul data-testid="project-list" className="divide-y divide-border">
            {items.map((p: ProjectListItem) => {
              const participantCount = p.batches.reduce(
                (acc: number, b) => acc + b.participants.length,
                0
              );
              return (
                <li
                  key={p.id}
                  data-testid={`project-item-${p.id}`}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.batches.length} batch • {participantCount} participants •{" "}
                      {p.assessors.length} assessors
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      data-testid={`project-status-${p.id}`}
                      className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
                    >
                      {p.status}
                    </span>
                    <Link
                      data-testid={`view-project-${p.id}-btn`}
                      href={`/admin/projects/${p.id}`}
                      className="text-xs font-medium text-primary"
                    >
                      Manage →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p data-testid="project-list-empty" className="p-6 text-sm text-muted-foreground">
            No projects yet.
          </p>
        )}
      </div>
    </div>
  );
}
