"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";

interface ParseErrorDetail {
  rowNumber: number;
  message: string;
}

interface DiffRow {
  code: string;
  name?: string;
  type?: string;
}

interface DiffPayload {
  added: DiffRow[];
  updated: { code: string; after: { name: string; type: string } }[];
  removed: { code: string; name: string }[];
  unchanged: number;
}

export default function KamusUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [preview, setPreview] = useState<DiffPayload | null>(null);
  const [errorDetails, setErrorDetails] = useState<ParseErrorDetail[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 50));
        }
      };
      reader.onload = () => {
        setProgress(50);
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAlert(null);
    setPreview(null);
    setErrorDetails([]);
    setFileName(file.name);
    setIsUploading(true);
    setProgress(5);
    try {
      const content = await readFile(file);
      setFileContent(content);
      setProgress(60);
      await submitPreview(content);
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to read file",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const submitPreview = async (content: string) => {
    const res = await fetch("/api/kamus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, mode: "preview" }),
    });
    setProgress(90);
    if (!res.ok) {
      const data = await res.json();
      setErrorDetails(data.details || []);
      setAlert({
        type: "error",
        message: data.error || "Validation failed",
      });
      setProgress(100);
      return;
    }
    const data = await res.json();
    setPreview(data.diff);
    setProgress(100);
  };

  const handleConfirm = async () => {
    if (!fileContent) return;
    setIsUploading(true);
    setProgress(10);
    setAlert(null);
    try {
      const res = await fetch("/api/kamus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent, mode: "commit" }),
      });
      setProgress(80);
      const data = await res.json();
      if (!res.ok) {
        setErrorDetails(data.details || []);
        setAlert({ type: "error", message: data.error || "Submit failed" });
        return;
      }
      setAlert({
        type: "success",
        message: `Kamus submitted successfully. ${data.totalRows} rows processed. Event: ${data.event}`,
      });
      setPreview(null);
      setFileContent("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Submit failed",
      });
    } finally {
      setIsUploading(false);
      setProgress(100);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setFileContent("");
    setFileName("");
    setErrorDetails([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <nav data-testid="kamus-page-nav" className="flex items-center gap-3 text-sm">
        <Link href="/admin/kamus" className="text-muted-foreground hover:underline">
          Kamus
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>Upload</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">Upload Kamus Template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload CSV template untuk menambah atau memperbarui kamus potensi & kompetensi.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Blank Template</h2>
            <p className="text-sm text-muted-foreground">
              Download template kosong sebagai panduan format.
            </p>
          </div>
          <a
            data-testid="download-template-btn"
            href="/api/kamus/template"
            download="kamus-template.csv"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download Template
          </a>
        </div>
      </div>

      <div data-testid="kamus-form" className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Upload File</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          File harus berformat CSV dengan kolom: code, name, type, description, behavioralIndicators.
        </p>
        <div className="mt-4">
          <input
            ref={fileInputRef}
            data-testid="kamus-file-input"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
          {fileName && (
            <p className="mt-2 text-xs text-muted-foreground">Selected: {fileName}</p>
          )}
        </div>

        {isUploading && (
          <div data-testid="kamus-upload-progress" className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span data-testid="kamus-upload-progress-value">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {errorDetails.length > 0 && (
        <div
          data-testid="kamus-error-alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-semibold">File format is invalid:</p>
          <ul data-testid="kamus-error-list" className="mt-2 list-disc space-y-1 pl-5">
            {errorDetails.map((e: ParseErrorDetail, idx: number) => (
              <li key={idx} data-testid={`kamus-error-row-${e.rowNumber}`}>
                Row {e.rowNumber}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {alert && alert.type === "error" && errorDetails.length === 0 && (
        <div
          data-testid="kamus-error-alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {alert.message}
        </div>
      )}

      {preview && (
        <div
          data-testid="kamus-preview-container"
          className="rounded-xl border border-border bg-card p-6"
        >
          <h2 className="text-base font-semibold">Preview Changes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tinjau perubahan di bawah sebelum mengonfirmasi.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Added</div>
              <div data-testid="preview-added-count" className="mt-1 text-xl font-bold">
                {preview.added.length}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Updated</div>
              <div data-testid="preview-updated-count" className="mt-1 text-xl font-bold">
                {preview.updated.length}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Removed</div>
              <div data-testid="preview-removed-count" className="mt-1 text-xl font-bold">
                {preview.removed.length}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Unchanged</div>
              <div data-testid="preview-unchanged-count" className="mt-1 text-xl font-bold">
                {preview.unchanged}
              </div>
            </div>
          </div>

          {preview.added.length > 0 && (
            <details className="mt-4" open>
              <summary className="cursor-pointer text-sm font-medium">Added rows</summary>
              <ul data-testid="preview-added-list" className="mt-2 space-y-1 text-sm">
                {preview.added.map((r: DiffRow) => (
                  <li key={r.code} data-testid={`preview-added-${r.code}`}>
                    <span className="font-mono">{r.code}</span> — {r.name} ({r.type})
                  </li>
                ))}
              </ul>
            </details>
          )}
          {preview.updated.length > 0 && (
            <details className="mt-4" open>
              <summary className="cursor-pointer text-sm font-medium">Updated rows</summary>
              <ul data-testid="preview-updated-list" className="mt-2 space-y-1 text-sm">
                {preview.updated.map((r) => (
                  <li key={r.code} data-testid={`preview-updated-${r.code}`}>
                    <span className="font-mono">{r.code}</span> — {r.after.name} ({r.after.type})
                  </li>
                ))}
              </ul>
            </details>
          )}
          {preview.removed.length > 0 && (
            <details className="mt-4" open>
              <summary className="cursor-pointer text-sm font-medium">Removed rows</summary>
              <ul data-testid="preview-removed-list" className="mt-2 space-y-1 text-sm">
                {preview.removed.map((r) => (
                  <li key={r.code} data-testid={`preview-removed-${r.code}`}>
                    <span className="font-mono">{r.code}</span> — {r.name}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              data-testid="confirm-kamus-btn"
              onClick={handleConfirm}
              disabled={isUploading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Confirm & Submit
            </button>
            <button
              type="button"
              data-testid="cancel-kamus-btn"
              onClick={handleCancel}
              disabled={isUploading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {alert && alert.type === "success" && (
        <div
          data-testid="kamus-submitted-alert"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {alert.message}
        </div>
      )}
    </div>
  );
}
