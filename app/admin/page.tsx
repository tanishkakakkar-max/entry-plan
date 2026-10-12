"use client";

import { useEffect, useState } from "react";
import { BRAND } from "../components/brand";

type Code = { code: string; name: string; total: number; used: number; disabled: boolean; created: string };

// Private page for managing access codes. The password lives only in this browser tab's session.
export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState<Code[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("5");
  const [topUps, setTopUps] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Code | null>(null);
  const [copied, setCopied] = useState("");

  async function api(path: string, init: RequestInit = {}, pw = password) {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", "x-admin-password": pw, ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error((await res.text()) || "Something went wrong.");
    return res.json();
  }

  async function load(pw = password) {
    const data = await api("/api/admin/codes", {}, pw);
    setCodes(data.codes);
  }

  useEffect(() => {
    let saved = "";
    try {
      saved = sessionStorage.getItem("fp-admin") ?? "";
    } catch {}
    if (!saved) return;
    setPassword(saved);
    load(saved)
      .then(() => setAuthed(true))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await load();
      setAuthed(true);
      try {
        sessionStorage.setItem("fp-admin", password);
      } catch {}
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const data = await api("/api/admin/codes", { method: "POST", body: JSON.stringify({ name, credits: Number(credits) }) });
      setCreated(data.code);
      setName("");
    });
  };
  const patch = (code: string, body: object) =>
    run(async () => {
      await api(`/api/admin/codes/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(body) });
    });

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  }

  function signOut() {
    try {
      sessionStorage.removeItem("fp-admin");
    } catch {}
    setAuthed(false);
    setPassword("");
    setCodes([]);
  }

  const totalUsed = codes.reduce((n, c) => n + c.used, 0);
  const active = codes.filter((c) => !c.disabled && c.used < c.total).length;

  if (!authed) {
    return (
      <main className="admin wrap">
        <p className="label">{BRAND.name}</p>
        <h1 className="section-title">Admin</h1>
        <form onSubmit={signIn} className="admin-card admin-signin">
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="btn btn-orange" disabled={busy}>
            {busy ? "Checking..." : "Sign in"}
          </button>
          {message && <p className="error" role="alert">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin wrap">
      <div className="admin-head">
        <div>
          <p className="label">{BRAND.name}</p>
          <h1 className="section-title">Access codes</h1>
        </div>
        <button className="btn btn-quiet" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="admin-stats">
        <div className="admin-card">
          <p className="label">Codes</p>
          <p className="admin-stat">{codes.length}</p>
        </div>
        <div className="admin-card">
          <p className="label">Active with credits</p>
          <p className="admin-stat">{active}</p>
        </div>
        <div className="admin-card">
          <p className="label">Plans generated</p>
          <p className="admin-stat">{totalUsed}</p>
        </div>
      </div>

      <form onSubmit={create} className="admin-card admin-create">
        <h2>New code</h2>
        <div className="admin-create-row">
          <label className="field">
            <span>Name or note</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya, CAVA recruiter" maxLength={120} required />
          </label>
          <label className="field admin-credits">
            <span>Credits</span>
            <input type="number" min={1} max={1000} value={credits} onChange={(e) => setCredits(e.target.value)} required />
          </label>
          <button className="btn btn-orange" disabled={busy}>
            Create code
          </button>
        </div>
        {created && (
          <p className="notice admin-created" role="status">
            Created <strong className="admin-code">{created.code}</strong> for {created.name} with {created.total} credits.{" "}
            <button type="button" className="btn btn-quiet admin-small" onClick={() => copy(created.code)}>
              {copied === created.code ? "Copied" : "Copy code"}
            </button>
          </p>
        )}
      </form>

      {message && <p className="error" role="alert">{message}</p>}

      <div className="table-wrap admin-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Used</th>
              <th>Left</th>
              <th>Status</th>
              <th>Top up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr>
                <td colSpan={7}>No codes yet. Create one above.</td>
              </tr>
            )}
            {codes.map((c) => {
              const left = Math.max(0, c.total - c.used);
              const status = c.disabled ? "Disabled" : left === 0 ? "Used up" : "Active";
              return (
                <tr key={c.code} className={c.disabled ? "is-disabled" : ""}>
                  <td>
                    {c.name}
                    <small className="admin-date">{c.created ? new Date(c.created).toLocaleDateString() : ""}</small>
                  </td>
                  <td>
                    <button type="button" className="admin-code-btn" onClick={() => copy(c.code)} title="Copy code">
                      {copied === c.code ? "Copied" : c.code}
                    </button>
                  </td>
                  <td>
                    {c.used} / {c.total}
                  </td>
                  <td>{left}</td>
                  <td>
                    <span className={`admin-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                  </td>
                  <td>
                    <form
                      className="admin-topup"
                      onSubmit={(e) => {
                        e.preventDefault();
                        patch(c.code, { topUp: Number(topUps[c.code] || "5") });
                      }}
                    >
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={topUps[c.code] ?? "5"}
                        onChange={(e) => setTopUps({ ...topUps, [c.code]: e.target.value })}
                        aria-label={`Credits to add to ${c.code}`}
                      />
                      <button className="btn btn-quiet admin-small" disabled={busy}>
                        Add
                      </button>
                    </form>
                  </td>
                  <td>
                    <button className="btn btn-quiet admin-small" disabled={busy} onClick={() => patch(c.code, { disabled: !c.disabled })}>
                      {c.disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
