"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ParticipantInput {
  name: string;
  email: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("Batch 1");
  const [configuration, setConfiguration] = useState<string>("");
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const [pName, setPName] = useState<string>("");
  const [pEmail, setPEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [masterDataAvailable, setMasterDataAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // AC-17: Check master data availability before allowing project creation
    fetch("/api/kamus")
      .then((r) => r.json())
      .then((data: unknown[]) => {
        setMasterDataAvailable(Array.isArray(data) && data.length > 0);
      })
      .catch(() => setMasterDataAvailable(false));
  }, []);

  const handleAddParticipant = () => {
    setAlert(null);
    if (!pName || !pEmail) {
      setAlert({ type: "error", message: "Participant name and email are required" });
      return;
    }
    // AC-14: Frontend hint (backend is authoritative)
    if (participants.length >= 20) {
      setAlert({
        type: "error",
        message:
          "Batch cannot contain more than 20 participants. Please create a new batch for additional participants.",
      });
      return;
    }
    setParticipants((prev: ParticipantInput[]) => [...prev, { name: pName, email: pEmail }]);
    setPName("");
    setPEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!name || !description || !batchName) {
      setAlert({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          batchName,
          configuration: configuration || JSON.stringify({}),
          participants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }
      setAlert({ type: "success", message: "Project created successfully" });
      // Redirect to project list after short delay so success alert is visible.
      setTimeout(() => router.push("/admin/projects"), 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setAlert({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <nav data-testid="project-page-nav" className="text-sm font-medium">
        Projects / Create Project
      </nav>

      <div>
        <h1 className="text-2xl font-bold">Create Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat project baru beserta batch dan konfigurasi awal.
        </p>
      </div>

      {masterDataAvailable === false && (
        <div
          data-testid="master-data-error-alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          Master data (Kamus) is not available. Please set up Master Data Setup before creating a project.
        </div>
      )}

      {alert && (
        <div
          data-testid={alert.type === "success" ? "project-created-alert" : "project-error-alert"}
          className={`rounded-xl border p-4 text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {alert.message}
        </div>
      )}

      <form
        data-testid="project-form"
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <label className="text-sm font-medium" htmlFor="project-name-input">
            Project name
          </label>
          <input
            id="project-name-input"
            data-testid="project-name-input"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="project-description-input">
            Description
          </label>
          <textarea
            id="project-description-input"
            data-testid="project-description-input"
            name="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="project-batch-input">
            Batch name
          </label>
          <input
            id="project-batch-input"
            data-testid="project-batch-input"
            name="batchName"
            type="text"
            required
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="project-config-input">
            Configuration (JSON)
          </label>
          <textarea
            id="project-config-input"
            data-testid="project-config-input"
            name="configuration"
            value={configuration}
            onChange={(e) => setConfiguration(e.target.value)}
            placeholder='{"kamusId":"seed-kamus-1"}'
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
            rows={3}
          />
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Participants (max 20 per batch)</h2>
          <div className="mt-3 flex gap-2">
            <input
              data-testid="participant-name-input"
              name="participantName"
              type="text"
              value={pName}
              placeholder="Participant name"
              onChange={(e) => setPName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              data-testid="participant-email-input"
              name="participantEmail"
              type="email"
              value={pEmail}
              placeholder="participant@example.com"
              onChange={(e) => setPEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              data-testid="add-participant-btn"
              onClick={handleAddParticipant}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Add
            </button>
          </div>

          <ul data-testid="participant-list" className="mt-3 space-y-1 text-sm">
            {participants.map((p: ParticipantInput, i: number) => (
              <li
                key={`${p.email}-${i}`}
                data-testid={`participant-item-${i}`}
                className="rounded-md bg-muted/60 px-2 py-1"
              >
                {p.name} — {p.email}
              </li>
            ))}
          </ul>
          <p data-testid="participant-count" className="mt-2 text-xs text-muted-foreground">
            {participants.length} / 20
          </p>
        </div>

        <button
          type="submit"
          data-testid="submit-project-btn"
          disabled={submitting || masterDataAvailable === false}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
