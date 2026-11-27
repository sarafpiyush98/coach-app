"use client";

import { useState } from "react";
import { Copy, Download, ExternalLink, RefreshCw, Smartphone, Upload } from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { RadarChart } from "@/components/ui/radar-chart";
import { XPRing } from "@/components/ui/xp-ring";
import { useToastStore } from "@/components/ui/system-toast";
import { SHADOW_PASSIVES } from "@/lib/monarch-catalog";
import {
  computeMonarchStats,
  DEFAULT_LEDGER_SHEET_ID,
  levelFromMonarchXp,
  useMonarchStore,
} from "@/lib/monarch-store";
import { STAT_COLORS } from "@/lib/stats";

const S25_INTENTS = [
  { label: "5m No-Skip Floor", url: "/?quick=noskip" },
  { label: "Hebe's Salsa + Chicken", url: "/?quick=salsa-stack" },
  { label: "5 PM Whey+Skyr & Seal", url: "/?quick=seal-fast" },
  { label: "AB's Proteinmaxx Raid", url: "/?quick=abs-raid" },
  { label: "Open CG Combat HUD", url: "/?sheet=gate" },
];

export default function HunterStatusPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${
    store.ledgerSheetId || DEFAULT_LEDGER_SHEET_ID
  }/edit`;

  async function handleSyncNow() {
    setSyncing(true);
    const res = await store.syncWithLedger();
    setSyncing(false);
    addToast({
      title: res.ok ? "2-WAY LEDGER SYNCED" : "SYNC STATUS",
      message: res.message,
      variant: res.ok ? "success" : "warning",
    });
  }

  const totalXp = store.legacyXp + store.earnedXp;
  const lvl = levelFromMonarchXp(totalXp);
  const stats = computeMonarchStats(store);
  const maxStat = Math.max(
    50,
    stats.STR,
    stats.AGI,
    stats.VIT,
    stats.INT,
    stats.DSC
  );

  const radarData = [
    { label: "STR", value: stats.STR, max: maxStat },
    { label: "AGI", value: stats.AGI, max: maxStat },
    { label: "VIT", value: stats.VIT, max: maxStat },
    { label: "INT", value: stats.INT, max: maxStat },
    { label: "DSC", value: stats.DSC, max: maxStat },
  ];

  function handleDownloadBackup() {
    const raw = store.exportJson();
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monarch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ title: "BACKUP DOWNLOADED", variant: "success" });
  }

  async function handleCopyBackup() {
    try {
      await navigator.clipboard.writeText(store.exportJson());
      addToast({ title: "JSON COPIED TO CLIPBOARD", variant: "info" });
    } catch {
      addToast({ title: "CLIPBOARD BLOCKED", variant: "danger" });
    }
  }

  function handleImport() {
    const res = store.importJson(importText);
    if (res.ok) {
      setImportOpen(false);
      setImportText("");
      addToast({ title: "STATE RESTORED CLEANLY", variant: "success" });
    } else {
      addToast({
        title: "IMPORT FAILED",
        message: res.error,
        variant: "danger",
      });
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-4">
      <div className="text-center">
        <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.2em] text-[#3b6cf6]">
          STATUS WINDOW · OFFLINE INDEXEDDB
        </p>
        <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-wider mt-0.5">
          HUNTER PIYUSH ({lvl.rank.title})
        </h1>
      </div>

      {/* XP RING + RADAR */}
      <SystemPanel variant="hero" className="p-4" animate={false}>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          <XPRing
            level={lvl.level}
            xpProgress={lvl.xpIntoLevel / Math.max(lvl.currentLevelXp, 1)}
            rank={lvl.rank.title}
            size={128}
          />
          <RadarChart stats={radarData} size={200} />
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
          {(Object.keys(stats) as Array<keyof typeof stats>).map((k) => (
            <div
              key={k}
              className="p-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)]"
            >
              <div
                className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold"
                style={{ color: STAT_COLORS[k] }}
              >
                {k}
              </div>
              <div className="font-[family-name:var(--font-geist-mono)] text-xs font-bold">
                {stats[k]}
              </div>
            </div>
          ))}
        </div>
      </SystemPanel>

      {/* 8 AMBIENT SHADOW PASSIVES */}
      <SystemPanel className="p-4" animate={false}>
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2.5">
          SHADOW SOLDIER PASSIVES (AUTO-TRIGGERED)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHADOW_PASSIVES.map((sh) => {
            const bellionUnlocked =
              lvl.level >= 40 || store.weightEma < 100;
            const unlocked = sh.id !== "bellion" || bellionUnlocked;
            return (
              <div
                key={sh.id}
                className={`p-2.5 rounded-lg border text-xs ${
                  unlocked
                    ? "bg-[var(--surface-2)]/60 border-[var(--border-accent)]"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] opacity-55"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase text-[#c4b5fd]">
                    {sh.name}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[9px] text-[var(--text-muted)]">
                    {sh.role}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                  {sh.trigger}
                </p>
              </div>
            );
          })}
        </div>
      </SystemPanel>

      {/* S25 ULTRA WEBAPK SHORTCUTS & MODES */}
      <SystemPanel className="p-4" animate={false}>
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#22c55e] flex items-center gap-1.5 mb-2">
          <Smartphone size={14} /> S25 ULTRA LONG-PRESS SHORTCUTS &amp; ROUTINES
        </h2>
        <p className="text-[11px] text-[var(--text-secondary)] mb-2">
          Install as Chrome WebAPK (&quot;Add to Home Screen&quot;) -&gt; long-press icon or launch via Samsung Modes &amp; Routines:
        </p>
        <div className="space-y-1">
          {S25_INTENTS.map((item) => (
            <div
              key={item.url}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[11px]"
            >
              <span>{item.label}</span>
              <code className="font-[family-name:var(--font-geist-mono)] text-[#3b6cf6]">
                {item.url}
              </code>
            </div>
          ))}
        </div>
      </SystemPanel>

      {/* 2-WAY GOOGLE SHEET SPINE + BACKUP */}
      <SystemPanel className="p-4 space-y-3" animate={false}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#f59e0b]">
            MONARCH_LEDGER (ANTIGRAVITY + S25 SYNC)
          </h2>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#3b6cf6]/20 border border-[#3b6cf6]/50 font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase text-[#93c5fd]"
          >
            OPEN SHEET <ExternalLink size={11} />
          </a>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[11px] space-y-1 text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)]">1.</strong> Open{" "}
            <code className="text-[#3b6cf6]">MONARCH_LEDGER</code> -&gt; Extensions -&gt; Apps Script, paste{" "}
            <code className="text-[#3b6cf6]">MONARCH_APPS_SCRIPT.gs</code> &amp; Deploy Web App (Anyone).
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">2.</strong> On S25 Ultra: OKOK -&gt; Google Fit ON, and Samsung Health -&gt; Settings -&gt; Health Connect ON.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">3.</strong> Paste the same Web App URL in <strong className="text-[var(--text-primary)]">HC Webhook</strong> &amp; below (0 double-counted steps).
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Apps Script Web App / HC Webhook URL
            </label>
            <span className="font-[family-name:var(--font-geist-mono)] text-[9px] text-[var(--text-muted)]">
              {store.pendingSyncDates.length > 0
                ? `${store.pendingSyncDates.length} day(s) queued`
                : store.lastSyncedAt
                  ? `Synced ${store.lastSyncedAt.slice(11, 16)}`
                  : "Offline-first ready"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={store.webhookUrl}
              onChange={(e) => store.setWebhookUrl(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-xs"
            />
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-3 rounded bg-[#22c55e] hover:bg-[#16a34a] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase text-[#051b0e] inline-flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> SYNC
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase flex items-center justify-center gap-1.5"
          >
            <Download size={13} /> Download JSON
          </button>
          <button
            onClick={handleCopyBackup}
            className="flex-1 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase flex items-center justify-center gap-1.5"
          >
            <Copy size={13} /> Copy JSON
          </button>
          <button
            onClick={() => setImportOpen((v) => !v)}
            className="px-3 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase flex items-center justify-center gap-1"
          >
            <Upload size={13} /> Import
          </button>
        </div>

        {importOpen && (
          <div className="space-y-2">
            <textarea
              rows={3}
              placeholder="Paste exported Monarch JSON here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full p-2 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-[11px]"
            />
            <button
              onClick={handleImport}
              className="w-full h-9 rounded-lg bg-[#3b6cf6] text-white font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase"
            >
              RESTORE STATE
            </button>
          </div>
        )}
      </SystemPanel>
    </div>
  );
}
