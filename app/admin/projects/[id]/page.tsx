"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Assessor {
  id: string;
  name: string;
  email: string;
  expertise: string | null;
}

interface InvitationRow {
  participantId: string;
  participantName: string;
  participantEmail: string;
  latestStatus: string;
  sentAt: string | null;
  expiresAt: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  batches: Array<{
    id: string;
    name: string;
    participants: Array<{
      id: string;
      name: string;
      email: string;
      invitations: Array<{ id: string; status: string }>;
    }>;
  }>;
  assessors: Array<{ assessor: Assessor }>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [selectedAssessor, setSelectedAssessor] = useState<string>("");
  const [newBatchName, setNewBatchName] = useState<string>("");
  const [newBatchSize, setNewBatchSize] = useState<string>("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; testId: string; message: string } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectRes, invRes, assessorsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/invitations`),
        fetch(`/api/assessors`),
      ]);
      const projectData: Project = await projectRes.json();
      const invData: { invitations: InvitationRow[] } = await invRes.json();
      const assessorData: Assessor[] = await assessorsRes.json();
      setProject(projectData);
      setInvitations(Array.isArray(invData.invitations) ? invData.invitations : []);
      setAssessors(Array.isArray(assessorData) ? assessorData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSendInvitations = async () => {
    if (!projectId) return;
    setAlert(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitations");
      setAlert({
        type: "success",
        testId: "invitation-sent-alert",
        message: `Invitations sent to ${data.count} participant(s)`,
      });
      fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invitations";
      setAlert({ type: "error", testId: "invitation-error-alert", message });
    }
  };

  const handleResendInvitation = async (participantId: string) => {
    if (!projectId) return;
    setAlert(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [participantId], resend: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invitation");
      setAlert({
        type: "success",
        testId: "invitation-resent-alert",
        message: "Invitation resent successfully",
      });
      fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend invitation";
      setAlert({ type: "error", testId: "invitation-error-alert", message });
    }
  };

  const handleAssignAssessor = async () => {
    if (!projectId) return;
    if (!selectedAssessor) {
      setAlert({
        type: "error",
        testId: "assessor-error-alert",
        message: "Please select an assessor first",
      });
      return;
    }
    setAlert(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assessors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessorIds: [selectedAssessor] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign assessor");
      setAlert({
        type: "success",
        testId: "assessor-assigned-alert",
        message: "Assessor assigned successfully",
      });
      setSelectedAssessor("");
      fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assign assessor";
      setAlert({ type: "error", testId: "assessor-error-alert", message });
    }
  };

  const handleCreateBatch = async () => {
    if (!projectId) return;
    setAlert(null);
    if (!newBatchName) {
      setAlert({
        type: "error",
        testId: "batch-error-alert",
        message: "Batch name is required",
      });
      return;
    }
    const sizeRaw = newBatchSize.trim();
    const requestedSize = sizeRaw === "" ? 0 : parseInt(sizeRaw, 10);
    if (Number.isNaN(requestedSize) || requestedSize < 0) {
      setAlert({
        type: "error",
        testId: "batch-error-alert",
        message: "Batch size must be a non-negative number",
      });
      return;
    }
    const participants = Array.from({ length: requestedSize }, (_, i: number) => ({
      name: `Participant ${i + 1}`,
      email: `participant-${Date.now()}-${i}@example.com`,
    }));
    try {
      const res = await fetch(`/api/projects/${projectId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBatchName, participants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create batch");
      setAlert({
        type: "success",
        testId: "batch-created-alert",
        message: "Batch created successfully",
      });
      setNewBatchName("");
      setNewBatchSize("");
      fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create batch";
      setAlert({ type: "error", testId: "batch-error-alert", message });
    }
  };

  if (loading) {
    return (
      <p data-testid="project-detail-loading" className="p-6 text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (!project) {
    return (
      <p data-testid="project-detail-not-found" className="p-6 text-sm text-muted-foreground">
        Project not found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <nav data-testid="project-detail-nav" className="text-sm font-medium">
        Projects / {project.name}
      </nav>

      <div data-testid="project-detail-container" className="space-y-1">
        <h1 data-testid="project-detail-name" className="text-2xl font-bold">
          {project.name}
        </h1>
        <p className="text-sm text-muted-foreground">{project.description}</p>
        <p data-testid="project-detail-status" className="text-xs text-muted-foreground">
          Status: {project.status}
        </p>
      </div>

      {alert && (
        <div
          data-testid={alert.testId}
          className={`rounded-xl border p-4 text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* Batches Section */}
      <section
        data-testid="project-batches-container"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="text-lg font-semibold">Batches</h2>
        <ul data-testid="batches-list" className="space-y-2 text-sm">
          {project.batches.map((b) => (
            <li
              key={b.id}
              data-testid={`batch-item-${b.id}`}
              className="rounded-md bg-muted/60 px-3 py-2"
            >
              {b.name} — {b.participants.length} / 20 participants
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            data-testid="new-batch-name-input"
            name="newBatchName"
            type="text"
            placeholder="New batch name"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            data-testid="new-batch-size-input"
            name="newBatchSize"
            type="number"
            min="0"
            max="50"
            placeholder="Participant count (max 20)"
            value={newBatchSize}
            onChange={(e) => setNewBatchSize(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:w-48"
          />
          <button
            type="button"
            data-testid="create-batch-btn"
            onClick={handleCreateBatch}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
          >
            Add Batch
          </button>
        </div>
      </section>

      {/* Invitations Section */}
      <section
        data-testid="project-invitations-container"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invitations</h2>
          <button
            type="button"
            data-testid="send-invitations-btn"
            onClick={handleSendInvitations}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Send Invitations
          </button>
        </div>
        <ul data-testid="invitations-list" className="divide-y divide-border text-sm">
          {invitations.map((inv: InvitationRow) => (
            <li
              key={inv.participantId}
              data-testid={`invitation-row-${inv.participantId}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div>
                <p className="font-medium">{inv.participantName}</p>
                <p className="text-xs text-muted-foreground">{inv.participantEmail}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  data-testid={`invitation-status-${inv.participantId}`}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    inv.latestStatus === "expired"
                      ? "bg-red-100 text-red-800"
                      : inv.latestStatus === "sent"
                      ? "bg-blue-100 text-blue-800"
                      : inv.latestStatus === "accepted"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {inv.latestStatus}
                </span>
                {inv.latestStatus === "expired" && (
                  <button
                    type="button"
                    data-testid={`resend-invitation-${inv.participantId}-btn`}
                    onClick={() => handleResendInvitation(inv.participantId)}
                    className="rounded-md border border-border px-2 py-1 text-xs"
                  >
                    Resend
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Assessors Section */}
      <section
        data-testid="project-assessors-container"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="text-lg font-semibold">Assessors</h2>
        <ul data-testid="assigned-assessors-list" className="space-y-1 text-sm">
          {project.assessors.map((row) => (
            <li
              key={row.assessor.id}
              data-testid={`assigned-assessor-${row.assessor.id}`}
              className="rounded-md bg-muted/60 px-3 py-2"
            >
              {row.assessor.name} — {row.assessor.email}
            </li>
          ))}
          {project.assessors.length === 0 && (
            <li data-testid="assigned-assessors-empty" className="text-xs text-muted-foreground">
              No assessors assigned yet.
            </li>
          )}
        </ul>
        <div className="flex flex-col gap-2 md:flex-row">
          <select
            data-testid="assessor-select"
            name="assessorId"
            value={selectedAssessor}
            onChange={(e) => setSelectedAssessor(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">-- Select assessor --</option>
            {assessors.map((a: Assessor) => (
              <option key={a.id} value={a.id} data-testid={`assessor-option-${a.id}`}>
                {a.name} ({a.email})
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid="assign-assessor-btn"
            onClick={handleAssignAssessor}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
          >
            Assign Assessor
          </button>
        </div>
      </section>
    </div>
  );
}
