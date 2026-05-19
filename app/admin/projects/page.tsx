"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function ProjectsListPage() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: ProjectItem[]) =>
        setItems(Array.isArray(data) ? data : []),
      )
      .catch((err: Error) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="project-list-page-container">
      <nav
        data-testid="project-page-nav"
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage assessment projects: invitations, batches, and assessors.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          data-testid="new-project-btn"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New Project
        </Link>
      </nav>

      <div data-testid="project-list-container">
        {loading ? (
          <p data-testid="project-list-loading">Loading...</p>
        ) : items.length === 0 ? (
          <p data-testid="project-list-empty">No projects yet.</p>
        ) : (
          <table className="w-full text-sm" data-testid="project-list">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Description</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ProjectItem) => (
                <tr
                  key={item.id}
                  data-testid={`project-item-${item.id}`}
                  data-project-name={item.name}
                  className="border-b"
                >
                  <td className="p-2 font-medium">{item.name}</td>
                  <td className="p-2 text-muted-foreground">
                    {item.description?.length > 80
                      ? `${item.description.slice(0, 80)}...`
                      : item.description}
                  </td>
                  <td className="p-2 capitalize">{item.status}</td>
                  <td className="p-2">
                    <Link
                      href={`/admin/projects/${item.id}`}
                      data-testid={`project-detail-link-${item.id}`}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Manage
                    </Link>
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
