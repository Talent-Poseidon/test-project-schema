"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("Batch 1");
  const [configuration, setConfiguration] = useState<string>(
    '{"template":"default"}',
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!description.trim()) {
      setError("Project description is required");
      return;
    }
    if (!batchName.trim()) {
      setError("Batch name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          batchName: batchName.trim(),
          configuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }
      setSuccess(`Project '${data.name}' created successfully`);
      setTimeout(() => {
        router.push("/admin/projects");
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="project-new-page-container">
      <nav data-testid="project-new-page-nav" className="mb-6">
        <h1 className="text-2xl font-bold">Create Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details to create a new assessment project.
        </p>
      </nav>

      <form
        data-testid="project-form"
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border bg-card p-6"
      >
        <div>
          <label
            htmlFor="project-name-input"
            className="mb-1 block text-sm font-medium"
          >
            Project Name
          </label>
          <input
            id="project-name-input"
            data-testid="project-name-input"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Annual Leadership Assessment"
          />
        </div>

        <div>
          <label
            htmlFor="project-description-input"
            className="mb-1 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="project-description-input"
            data-testid="project-description-input"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="What this project is about"
          />
        </div>

        <div>
          <label
            htmlFor="project-batch-input"
            className="mb-1 block text-sm font-medium"
          >
            Initial Batch Name
          </label>
          <input
            id="project-batch-input"
            data-testid="project-batch-input"
            name="batchName"
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="project-configuration-input"
            className="mb-1 block text-sm font-medium"
          >
            Configuration (JSON)
          </label>
          <textarea
            id="project-configuration-input"
            data-testid="project-configuration-input"
            name="configuration"
            value={configuration}
            onChange={(e) => setConfiguration(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
          />
        </div>

        {error && (
          <div
            data-testid="project-error-alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            data-testid="project-created-alert"
            className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          data-testid="submit-project-btn"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
