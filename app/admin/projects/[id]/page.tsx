"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Assessee {
  id: string;
  name: string;
  email: string;
}

interface Batch {
  id: string;
  name: string;
  assessees: Assessee[];
}

interface AssessorMaster {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

interface ProjectAssessor {
  id: string;
  assessor: AssessorMaster;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  sentAt: string;
  expiresAt: string;
  assessee: Assessee;
}

interface ProjectEventRow {
  id: string;
  eventType: string;
  createdAt: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  configuration: string;
  batches: Batch[];
  assessors: ProjectAssessor[];
  invitations: Invitation[];
  events: ProjectEventRow[];
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [masterAssessors, setMasterAssessors] = useState<AssessorMaster[]>([]);

  const [assesseeName, setAssesseeName] = useState<string>("");
  const [assesseeEmail, setAssesseeEmail] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  const [newBatchName, setNewBatchName] = useState<string>("");

  const [selectedAssessorId, setSelectedAssessorId] = useState<string>("");
  const [assessorError, setAssessorError] = useState<string | null>(null);
  const [assessorSuccess, setAssessorSuccess] = useState<string | null>(null);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        setProject(null);
        return;
      }
      const data: ProjectDetail = await res.json();
      setProject(data);
      if (!selectedBatchId && data.batches.length > 0) {
        setSelectedBatchId(data.batches[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedBatchId]);

  const fetchMasterAssessors = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessors`);
      const data: AssessorMaster[] = await res.json();
      setMasterAssessors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void fetchProject();
    void fetchMasterAssessors();
  }, [fetchProject, fetchMasterAssessors]);

  const handleAddAssessee = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchSuccess(null);
    if (!selectedBatchId) {
      setBatchError("Please select a batch first");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/assessees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          name: assesseeName,
          email: assesseeEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add assessee");
      }
      setBatchSuccess(`Assessee '${data.name}' added to batch`);
      setAssesseeName("");
      setAssesseeEmail("");
      void fetchProject();
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Failed to add assessee");
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchSuccess(null);
    if (!newBatchName.trim()) {
      setBatchError("Batch name is required");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBatchName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create batch");
      }
      setBatchSuccess(`Batch '${data.name}' created`);
      setNewBatchName("");
      setSelectedBatchId(data.id);
      void fetchProject();
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Failed to create batch");
    }
  };

  const handleAssignAssessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssessorError(null);
    setAssessorSuccess(null);
    if (!selectedAssessorId) {
      setAssessorError("Please select an assessor");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/assessors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessorId: selectedAssessorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign assessor");
      }
      setAssessorSuccess(
        `Assessor '${data.assessor?.name ?? data.assessorId}' assigned to project`,
      );
      setSelectedAssessorId("");
      void fetchProject();
    } catch (err) {
      setAssessorError(
        err instanceof Error ? err.message : "Failed to assign assessor",
      );
    }
  };

  const handleSendInvitations = async () => {
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitations");
      }
      setInviteSuccess(`Sent ${data.count} invitation(s) via external system`);
      void fetchProject();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitations",
      );
    }
  };

  const handleResend = async (invitationId: string) => {
    setResendError(null);
    setResendSuccess(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invitations/${invitationId}/resend`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend invitation");
      }
      setResendSuccess(`Invitation resent to ${data.email}`);
      void fetchProject();
    } catch (err) {
      setResendError(
        err instanceof Error ? err.message : "Failed to resend invitation",
      );
    }
  };

  if (loading) {
    return (
      <div data-testid="project-detail-loading">Loading project...</div>
    );
  }

  if (!project) {
    return (
      <div data-testid="project-detail-not-found">Project not found.</div>
    );
  }

  return (
    <div data-testid="project-detail-page-container">
      <nav
        data-testid="project-detail-page-nav"
        className="mb-6"
        data-project-id={project.id}
      >
        <h1 className="text-2xl font-bold" data-testid="project-detail-name">
          {project.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description}
        </p>
        <p className="mt-1 text-xs">
          Status:{" "}
          <span data-testid="project-detail-status" className="font-mono">
            {project.status}
          </span>
        </p>
      </nav>

      {/* Batches & Assessees */}
      <section
        data-testid="project-batches-section"
        className="mb-8 rounded-lg border bg-card p-6"
      >
        <h2 className="mb-3 text-lg font-semibold">Batches &amp; Assessees</h2>

        <div
          data-testid="project-batches-list-container"
          className="mb-4 space-y-3"
        >
          {project.batches.map((batch: Batch) => (
            <div
              key={batch.id}
              data-testid={`project-batch-${batch.id}`}
              data-batch-name={batch.name}
              className="rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{batch.name}</p>
                  <p
                    data-testid={`project-batch-count-${batch.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {batch.assessees.length} / 20 assessees
                  </p>
                </div>
              </div>
              {batch.assessees.length > 0 && (
                <ul
                  data-testid={`project-batch-assessees-${batch.id}`}
                  className="mt-2 text-xs"
                >
                  {batch.assessees.map((a: Assessee) => (
                    <li
                      key={a.id}
                      data-testid={`project-assessee-${a.id}`}
                      className="text-muted-foreground"
                    >
                      {a.name} ({a.email})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <form
          data-testid="project-add-assessee-form"
          onSubmit={handleAddAssessee}
          className="grid gap-2 md:grid-cols-4"
        >
          <select
            data-testid="project-assessee-batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">Select batch</option>
            {project.batches.map((batch: Batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
          <input
            data-testid="project-assessee-name-input"
            name="name"
            placeholder="Assessee name"
            value={assesseeName}
            onChange={(e) => setAssesseeName(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            data-testid="project-assessee-email-input"
            name="email"
            placeholder="Assessee email"
            value={assesseeEmail}
            onChange={(e) => setAssesseeEmail(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <button
            type="submit"
            data-testid="project-add-assessee-btn"
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
          >
            Add Assessee
          </button>
        </form>

        <form
          data-testid="project-add-batch-form"
          onSubmit={handleAddBatch}
          className="mt-3 flex gap-2"
        >
          <input
            data-testid="project-new-batch-input"
            name="newBatch"
            placeholder="New batch name"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <button
            type="submit"
            data-testid="project-add-batch-btn"
            className="rounded-md border px-3 py-1 text-sm"
          >
            Create Batch
          </button>
        </form>

        {batchError && (
          <div
            data-testid="project-batch-error-alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {batchError}
          </div>
        )}
        {batchSuccess && (
          <div
            data-testid="project-batch-success-alert"
            className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {batchSuccess}
          </div>
        )}
      </section>

      {/* Assessors */}
      <section
        data-testid="project-assessors-section"
        className="mb-8 rounded-lg border bg-card p-6"
      >
        <h2 className="mb-3 text-lg font-semibold">Assigned Assessors</h2>

        <ul
          data-testid="project-assessors-list"
          className="mb-3 space-y-1 text-sm"
        >
          {project.assessors.length === 0 ? (
            <li data-testid="project-assessors-empty" className="text-muted-foreground">
              No assessors assigned yet.
            </li>
          ) : (
            project.assessors.map((pa: ProjectAssessor) => (
              <li
                key={pa.id}
                data-testid={`project-assessor-${pa.assessor.id}`}
                data-assessor-email={pa.assessor.email}
              >
                {pa.assessor.name} ({pa.assessor.email})
              </li>
            ))
          )}
        </ul>

        <form
          data-testid="project-assign-assessor-form"
          onSubmit={handleAssignAssessor}
          className="flex gap-2"
        >
          <select
            data-testid="project-assessor-select"
            value={selectedAssessorId}
            onChange={(e) => setSelectedAssessorId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">Select assessor from master</option>
            {masterAssessors.map((m: AssessorMaster) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          <button
            type="submit"
            data-testid="project-assign-assessor-btn"
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
          >
            Assign
          </button>
        </form>

        {assessorError && (
          <div
            data-testid="project-assessor-error-alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {assessorError}
          </div>
        )}
        {assessorSuccess && (
          <div
            data-testid="project-assessor-success-alert"
            className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {assessorSuccess}
          </div>
        )}
      </section>

      {/* Invitations */}
      <section
        data-testid="project-invitations-section"
        className="mb-8 rounded-lg border bg-card p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invitations</h2>
          <button
            type="button"
            data-testid="project-send-invitations-btn"
            onClick={handleSendInvitations}
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
          >
            Send Invitations
          </button>
        </div>

        <table
          className="w-full text-sm"
          data-testid="project-invitations-list"
        >
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Status</th>
              <th className="p-2">Sent At</th>
              <th className="p-2">Expires At</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {project.invitations.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <p
                    data-testid="project-invitations-empty"
                    className="p-3 text-muted-foreground"
                  >
                    No invitations sent yet.
                  </p>
                </td>
              </tr>
            ) : (
              project.invitations.map((inv: Invitation) => (
                <tr
                  key={inv.id}
                  data-testid={`project-invitation-${inv.id}`}
                  data-invitation-status={inv.status}
                  className="border-b"
                >
                  <td className="p-2">{inv.email}</td>
                  <td className="p-2">
                    <span
                      data-testid={`project-invitation-status-${inv.id}`}
                      className="font-mono uppercase"
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(inv.sentAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(inv.expiresAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="p-2">
                    {inv.status === "expired" ? (
                      <button
                        type="button"
                        data-testid={`project-invitation-resend-btn-${inv.id}`}
                        onClick={() => handleResend(inv.id)}
                        className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Resend
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {inviteError && (
          <div
            data-testid="project-invitation-error-alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div
            data-testid="project-invitation-success-alert"
            className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {inviteSuccess}
          </div>
        )}
        {resendError && (
          <div
            data-testid="project-resend-error-alert"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {resendError}
          </div>
        )}
        {resendSuccess && (
          <div
            data-testid="project-resend-success-alert"
            className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {resendSuccess}
          </div>
        )}
      </section>

      {/* Events */}
      <section
        data-testid="project-events-section"
        className="rounded-lg border bg-card p-6"
      >
        <h2 className="mb-3 text-lg font-semibold">Domain Events</h2>
        <ul data-testid="project-events-list" className="space-y-1 text-xs font-mono">
          {project.events.map((ev: ProjectEventRow) => (
            <li
              key={ev.id}
              data-testid={`project-event-${ev.id}`}
              data-event-type={ev.eventType}
            >
              [{new Date(ev.createdAt).toISOString().slice(0, 19)}]{" "}
              {ev.eventType}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
