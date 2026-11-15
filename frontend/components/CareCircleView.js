"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Trash2,
  Copy,
  Check,
  KeyRound,
  AlertCircle,
  X,
  Mail,
  HeartHandshake,
} from "lucide-react";
import {
  getCareCircleMembers,
  createCareCircleInvitation,
  revokeCareCircleMember,
} from "@/lib/api";

export default function CareCircleView({ patient }) {
  const [data, setData] = useState({ members: [], pending_invitations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Invite modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [relation, setRelation] = useState("Daughter");
  const [role, setRole] = useState("CARE_MANAGER");
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  async function loadMembers() {
    try {
      setLoading(true);
      setError(null);
      const res = await getCareCircleMembers();
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load Care Circle members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleSendInvite(e) {
    e.preventDefault();
    if (!recipientEmail) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await createCareCircleInvitation({
        recipient_email: recipientEmail,
        relation,
        role,
      });
      setInviteResult(res);
      loadMembers();
    } catch (err) {
      setError(err.message || "Failed to create invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(linkId, memberName) {
    if (!window.confirm(`Revoke Care Circle access for ${memberName || "this member"} immediately?`)) {
      return;
    }
    try {
      await revokeCareCircleMember(linkId);
      loadMembers();
    } catch (err) {
      alert("Error revoking access: " + err.message);
    }
  }

  function copyPasscode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-ui-surface border border-ui-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Zero-Trust Family Sharing</span>
          </div>
          <h2 className="text-xl font-bold text-ui-text-main">Care Circle & Family Access</h2>
          <p className="text-sm text-ui-text-muted mt-1 max-w-xl">
            Grant secure, passcode-protected access to trusted family members and caregivers.
            Control viewing permissions and revoke access at any time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setInviteResult(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ui-accent text-white font-medium hover:bg-ui-accent/90 transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Family Member</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Members Roster */}
      <div className="bg-ui-surface border border-ui-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-ui-text-main flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-ui-accent" />
          <span>Active Care Circle Members ({data.members?.length || 0})</span>
        </h3>

        {loading ? (
          <p className="text-sm text-ui-text-muted py-6 text-center">Loading care circle roster…</p>
        ) : data.members?.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-ui-border bg-ui-canvas/50">
            <Users className="w-8 h-8 mx-auto text-ui-text-muted mb-2 opacity-50" />
            <p className="text-sm font-medium text-ui-text-main">No family members linked yet</p>
            <p className="text-xs text-ui-text-muted mt-1 max-w-md mx-auto">
              Click &quot;Invite Family Member&quot; above to generate an 8-digit passcode for your family member or caretaker.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.members.map((m) => (
              <div
                key={m.link_id}
                className="p-4 rounded-xl border border-ui-border bg-ui-card hover:border-ui-border-dark transition flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ui-text-main">{m.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-ui-canvas border border-ui-border text-ui-text-muted font-medium">
                      {m.relation}
                    </span>
                  </div>
                  <p className="text-xs text-ui-text-muted">{m.email || m.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        m.role === "CARE_MANAGER"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {m.role === "CARE_MANAGER" ? "Care Manager (Full)" : "Viewer (Read-Only)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(m.link_id, m.name)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  title="Revoke access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {data.pending_invitations?.length > 0 && (
        <div className="bg-ui-surface border border-ui-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-ui-text-main flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Pending Passcode Invitations ({data.pending_invitations.length})</span>
          </h3>
          <p className="text-xs text-ui-text-muted mb-4">
            These single-use 8-digit codes have been created and are awaiting redemption.
          </p>

          <div className="space-y-2">
            {data.pending_invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-semibold text-ui-text-main">{inv.recipient_email}</span>
                  <span className="text-ui-text-muted ml-2">({inv.relation} · {inv.role})</span>
                </div>
                <span className="text-amber-700 font-medium">Pending 10m Expiry</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-ui-surface border border-ui-border rounded-2xl shadow-xl p-6 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-ui-text-muted hover:text-ui-text-main p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {!inviteResult ? (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ui-text-main flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-ui-accent" />
                    <span>Invite Family Member</span>
                  </h3>
                  <p className="text-xs text-ui-text-muted mt-1">
                    An 8-digit single-use passcode will be generated for secure access.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ui-text-main mb-1.5">
                    Family Member Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ui-text-muted absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. anita.daughter@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-ui-border bg-ui-canvas text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ui-text-main mb-1.5">
                      Relationship
                    </label>
                    <select
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-ui-border bg-ui-canvas text-sm"
                    >
                      <option value="Daughter">Daughter</option>
                      <option value="Son">Son</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Caregiver">Primary Caregiver</option>
                      <option value="Nurse">Home Nurse</option>
                      <option value="Relative">Relative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ui-text-main mb-1.5">
                      Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-ui-border bg-ui-canvas text-sm"
                    >
                      <option value="CARE_MANAGER">Care Manager (Read & Write)</option>
                      <option value="VIEWER">Family Viewer (Read-Only)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Zero-Trust Protection:</strong> The code will expire in 10 minutes and can only be used once. You can revoke their access at any time.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-ui-border text-sm font-medium hover:bg-ui-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-ui-accent text-white text-sm font-medium hover:bg-ui-accent/90 disabled:opacity-50"
                  >
                    {submitting ? "Generating Code…" : "Generate Passcode"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ui-text-main">Passcode Generated!</h3>
                  <p className="text-xs text-ui-text-muted mt-1">
                    Share this 8-digit passcode with <strong>{inviteResult.recipient_email}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-ui-canvas border-2 border-dashed border-emerald-300 flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-extrabold tracking-widest text-ui-text-main">
                    {inviteResult.passcode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyPasscode(inviteResult.passcode)}
                    className="p-2 rounded-lg bg-ui-surface border border-ui-border text-ui-text-muted hover:text-ui-text-main"
                    title="Copy passcode"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="text-xs text-ui-text-muted space-y-1">
                  <p>⏳ <strong>Expires in 10 minutes.</strong> Valid for 1 single use.</p>
                  <p>Role granted: <strong>{inviteResult.role === "CARE_MANAGER" ? "Care Manager (Full)" : "Viewer (Read-Only)"}</strong></p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-ui-accent text-white text-sm font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

