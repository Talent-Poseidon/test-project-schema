"use client";

import React, { useState } from "react";

interface RowError {
  rowNumber: number;
  field?: string;
  message: string;
}

interface PreviewSummary {
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  unchanged: number;
}

interface PreviewItem {
  code: string;
  name: string;
  type: string;
}

interface PreviewUpdate {
  existing: PreviewItem & {
    description: string;
    behavioralIndicators: string;
  };
  incoming: PreviewItem & {
    description: string;
    behavioralIndicators: string;
  };
}

interface PreviewResponse {
  summary: PreviewSummary;
  toCreate: PreviewItem[];
  toUpdate: PreviewUpdate[];
  toDelete: PreviewItem[];
}

export default function KamusUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewCsvContent, setPreviewCsvContent] = useState<string | null>(
    null,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setErrors([]);
    setSuccess(null);
    setPreview(null);
    setPreviewCsvContent(null);
  };

  const readFileWithProgress = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 50);
          setProgress(pct);
        }
      };
      reader.onload = () => {
        setProgress(60);
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setErrors([{ rowNumber: 0, message: "Please choose a file" }]);
      return;
    }
    setLoading(true);
    setErrors([]);
    setSuccess(null);
    setPreview(null);

    const isLargeFile = file.size > 100 * 1024;
    setShowProgress(isLargeFile);
    setProgress(0);

    try {
      const csvContent = await readFileWithProgress(file);

      if (mode === "update") {
        setProgress(70);
        const res = await fetch("/api/kamus/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: csvContent }),
        });
        setProgress(100);
        const data = await res.json();
        if (!res.ok) {
          setErrors(
            data.errors && Array.isArray(data.errors)
              ? data.errors
              : [{ rowNumber: 0, message: data.error || "Preview failed" }],
          );
          return;
        }
        setPreview(data);
        setPreviewCsvContent(csvContent);
      } else {
        setProgress(70);
        const res = await fetch("/api/kamus/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: csvContent }),
        });
        setProgress(100);
        const data = await res.json();
        if (!res.ok) {
          setErrors(
            data.errors && Array.isArray(data.errors)
              ? data.errors
              : [{ rowNumber: 0, message: data.error || "Upload failed" }],
          );
          return;
        }
        setSuccess(
          `Successfully uploaded ${data.count} kamus item(s). Event '${data.event}' generated.`,
        );
        setFile(null);
      }
    } catch (err) {
      setErrors([
        {
          rowNumber: 0,
          message: err instanceof Error ? err.message : "Upload failed",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!previewCsvContent) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/kamus/confirm-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: previewCsvContent, mode: "merge" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.blockedCodes) {
          setErrors([
            {
              rowNumber: 0,
              message: data.message || "Some kamus cannot be deleted",
            },
          ]);
        } else {
          setErrors(
            data.errors && Array.isArray(data.errors)
              ? data.errors
              : [{ rowNumber: 0, message: data.error || "Update failed" }],
          );
        }
        return;
      }
      setSuccess(
        `Update applied: ${data.summary.toCreate} created, ${data.summary.toUpdate} updated, ${data.summary.toDelete} deleted. Event '${data.event}' generated.`,
      );
      setPreview(null);
      setPreviewCsvContent(null);
      setFile(null);
    } catch (err) {
      setErrors([
        {
          rowNumber: 0,
          message: err instanceof Error ? err.message : "Update failed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setPreviewCsvContent(null);
  };

  return (
    <div data-testid="kamus-upload-container">
      <nav data-testid="kamus-upload-page-nav" className="mb-6">
        <h1 className="text-2xl font-bold">Upload Kamus Template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload Kamus Potensi &amp; Kompetensi via Excel/CSV template.
        </p>
      </nav>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">Need a template?</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Download the empty template to see the required format.
        </p>
        <a
          data-testid="kamus-template-download-btn"
          href="/api/kamus/template"
          download="kamus-template.csv"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Download Template
        </a>
      </div>

      <div className="mb-4 flex gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="create"
            checked={mode === "create"}
            onChange={() => setMode("create")}
            data-testid="kamus-mode-create"
          />
          New Upload
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="update"
            checked={mode === "update"}
            onChange={() => setMode("update")}
            data-testid="kamus-mode-update"
          />
          Update (Preview changes)
        </label>
      </div>

      <form
        data-testid="kamus-upload-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleUpload();
        }}
        className="space-y-4 rounded-lg border bg-card p-4"
      >
        <div>
          <label className="block text-sm font-medium" htmlFor="kamus-file">
            Kamus template file (.csv)
          </label>
          <input
            id="kamus-file"
            data-testid="kamus-file-input"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm"
          />
        </div>
        <button
          data-testid="submit-kamus-upload-btn"
          type="submit"
          disabled={loading || !file}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : mode === "update"
              ? "Preview Changes"
              : "Upload"}
        </button>
      </form>

      {showProgress && (
        <div
          data-testid="kamus-upload-progress"
          className="mt-4 rounded-lg border bg-card p-4"
        >
          <p className="mb-2 text-sm font-medium">
            Uploading large file... {progress}%
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              data-testid="kamus-upload-progress-bar"
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {success && (
        <div
          data-testid="kamus-created-alert"
          className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {errors.length > 0 && (
        <div
          data-testid="kamus-error-alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-semibold">Validation errors:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((err, idx) => (
              <li
                key={idx}
                data-testid={`kamus-error-row-${err.rowNumber}`}
              >
                {err.rowNumber > 0 ? `Row ${err.rowNumber}: ` : ""}
                {err.field ? `[${err.field}] ` : ""}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <div
          data-testid="kamus-preview-container"
          className="mt-6 rounded-lg border bg-card p-4"
        >
          <h2 className="mb-3 text-lg font-semibold">Preview Changes</h2>
          <div
            data-testid="kamus-preview-summary"
            className="mb-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4"
          >
            <div data-testid="kamus-preview-create-count">
              To create: {preview.summary.toCreate}
            </div>
            <div data-testid="kamus-preview-update-count">
              To update: {preview.summary.toUpdate}
            </div>
            <div data-testid="kamus-preview-delete-count">
              To delete: {preview.summary.toDelete}
            </div>
            <div data-testid="kamus-preview-unchanged-count">
              Unchanged: {preview.summary.unchanged}
            </div>
          </div>

          {preview.toCreate.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-green-700">
                New ({preview.toCreate.length})
              </h3>
              <ul
                data-testid="kamus-preview-create-list"
                className="mt-1 text-sm"
              >
                {preview.toCreate.map((c) => (
                  <li key={c.code}>
                    {c.code} — {c.name} ({c.type})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.toUpdate.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-blue-700">
                Changed ({preview.toUpdate.length})
              </h3>
              <ul
                data-testid="kamus-preview-update-list"
                className="mt-1 text-sm"
              >
                {preview.toUpdate.map((u) => (
                  <li key={u.existing.code}>
                    {u.existing.code}: &quot;{u.existing.name}&quot; →
                    &quot;{u.incoming.name}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.toDelete.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-red-700">
                To delete ({preview.toDelete.length})
              </h3>
              <ul
                data-testid="kamus-preview-delete-list"
                className="mt-1 text-sm"
              >
                {preview.toDelete.map((d) => (
                  <li key={d.code}>
                    {d.code} — {d.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              data-testid="kamus-confirm-update-btn"
              type="button"
              onClick={handleConfirmUpdate}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Applying..." : "Confirm Update"}
            </button>
            <button
              data-testid="kamus-cancel-update-btn"
              type="button"
              onClick={handleCancelPreview}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
