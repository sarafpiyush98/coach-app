"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Sliders,
  Smartphone,
  Upload,
} from "lucide-react";
import { RadarChart } from "@/components/ui/radar-chart";
import { XPRing } from "@/components/ui/xp-ring";
import { useToastStore } from "@/components/ui/system-toast";
import { SHADOW_PASSIVES } from "@/lib/monarch-catalog";
import {
  computeMonarchStats,
  computeStreakAndCombo,
  isBellionUnlocked,
  levelFromMonarchXp,
  useMonarchStore,
} from "@/lib/monarch-store";
import { STAT_COLORS } from "@/lib/stats";

const S25_INTENTS = [
  { label: "5m No-Skip Floor", url: "/?quick=noskip" },
  { label: "Hebe's Salsa + Chicken", url: "/?quick=salsa-stack" },
  { label: "5 PM Whey+Skyr & Seal OMAD", url: "/?quick=seal-fast" },
  { label: "AB's Proteinmaxx Raid", url: "/?quick=abs-raid" },
  { label: "Open CG Combat HUD", url: "/?sheet=gate" },
];

export default function HunterStatusPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);

  const [targetKcal, setTargetKcal] = useState(String(store.kcalTarget || 1800));
  const [targetProtein, setTargetProtein] = useState(String(store.proteinTargetG || 165));
  const [targetSteps, setTargetSteps] = useState(String(store.stepTarget || 12000));
  const [targetPages, setTargetPages] = useState(String(store.readingMinPages || 5));

  const sheetUrl = store.ledgerSheetId.trim()
    ? `https://docs.google.com/spreadsheets/d/${store.ledgerSheetId.trim()}/edit`
    : "";

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

  async function handleCloudBackup() {
    setCloudBusy(true);
    const res = await store.backupSnapshotToLedger();
    setCloudBusy(false);
    addToast({
      title: res.ok ? "CLOUD SNAPSHOT SAVED" : "BACKUP FAILED",
      message: res.message,
      variant: res.ok ? "success" : "warning",
    });
  }

  async function handleCloudRestore() {
    setCloudBusy(true);
    const res = await store.restoreSnapshotFromLedger();
    setCloudBusy(false);
    addToast({
      title: res.ok ? "CLOUD STATE RESTORED" : "RESTORE FAILED",
      message: res.message,
      variant: res.ok ? "success" : "warning",
    });
  }

  function handleSaveTargets(e: React.FormEvent) {
    e.preventDefault();
    store.setTargets({
      kcalTarget: Number(targetKcal) || 1800,
      proteinTargetG: Number(targetProtein) || 165,
      stepTarget: Number(targetSteps) || 12000,
      readingMinPages: Number(targetPages) || 5,
    });
    addToast({
      title: "TARGETS UPDATED",
      message: `${Math.max(1450, Number(targetKcal) || 1800)} kcal · ${Math.max(100, Number(targetProtein) || 165)}g P`,
      variant: "success",
    });
  }

  const totalXp = store.legacyXp + store.earnedXp;
  const lvl = levelFromMonarchXp(totalXp);
  const stats = computeMonarchStats(store);
  const streak = computeStreakAndCombo(store.days);
  const bellionActive = isBellionUnlocked(store);
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
    <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-5">
      <header className="flex flex-col items-center text-center gap-2">
        <Image
          src="/icon-192.png"
          alt="Shadow Monarch Crest"
          width={52}
          height={52}
          className="w-13 h-13 rounded-2xl border border-[#3b6cf6]/45 shadow-[0_0_24px_rgba(59,108,246,0.3)]"
          priority
        />
        <div>
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.2em] text-[#60a5fa]">
            STATUS WINDOW · OFFLINE INDEXEDDB
          </p>
          <h1 className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold uppercase tracking-wider mt-0.5 text-[var(--text-primary)]">
            Hunter Piyush ({lvl.rank.title})
          </h1>
        </div>
      </header>

      {/* XP RING + RADAR */}
      <section className="rounded-2xl monarch-hero p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          <XPRing
            level={lvl.level}
            xpProgress={lvl.xpIntoLevel / Math.max(lvl.currentLevelXp, 1)}
            rank={lvl.rank.title}
            size={128}
          />
          <RadarChart stats={radarData} size={200} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
          <div className="p-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-[10px] text-[var(--text-muted)]">XP MULTIPLIER</div>
            <div className="text-sm font-bold text-[#60a5fa] mt-0.5">
              {streak.comboMultiplier}x
            </div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-[10px] text-[var(--text-muted)]">BEST STREAK</div>
            <div className="text-sm font-bold text-[#4ade80] mt-0.5">
              {Math.max(store.bestActiveStreak || 14, streak.activeStreak)}d
            </div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-[10px] text-[var(--text-muted)]">BEST TREND</div>
            <div className="text-sm font-bold text-[#c4b5fd] mt-0.5">
              {store.bestWeightEma} kg
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center">
          {(Object.keys(stats) as Array<keyof typeof stats>).map((k) => (
            <div
              key={k}
              className="p-1.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]"
            >
              <div
                className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold"
                style={{ color: STAT_COLORS[k] }}
              >
                {k}
              </div>
              <div className="font-mono text-xs font-bold">{stats[k]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8 AMBIENT SHADOW PASSIVES (WIRED RUNTIME STATE) */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          Shadow Army Passives (Live)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHADOW_PASSIVES.map((sh) => {
            const unlocked = sh.id !== "bellion" || bellionActive;
            const liveBadge =
              sh.id === "igris"
                ? streak.igrisShieldedThisWeek
                  ? "SHIELD USED"
                  : "READY"
                : sh.id === "bellion"
                  ? bellionActive
                    ? "2x CRIT ON"
                    : "LV.40 / <100KG"
                  : sh.id === "beru" && store.lowMana
                    ? "ACTIVE"
                    : sh.id === "tusk" && store.debloatMode
                      ? "ACTIVE"
                      : "PASSIVE";
            return (
              <div
                key={sh.id}
                className={`p-3 rounded-xl border text-xs ${
                  unlocked
                    ? "bg-[var(--surface-0)] border-[var(--border-accent)]"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase text-[#c4b5fd]">
                    {sh.name}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)]">
                    {liveBadge}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                  {sh.trigger}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* EDITABLE DAILY TARGETS */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sliders size={14} className="text-[#60a5fa]" />
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            Daily Targets &amp; Floors
          </h2>
        </div>
        <form onSubmit={handleSaveTargets} className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">
              Calories (min 1450)
            </label>
            <input
              type="number"
              min={1450}
              max={3500}
              value={targetKcal}
              onChange={(e) => setTargetKcal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">
              Protein floor (g)
            </label>
            <input
              type="number"
              min={100}
              max={260}
              value={targetProtein}
              onChange={(e) => setTargetProtein(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">
              Step goal
            </label>
            <input
              type="number"
              min={4000}
              max={30000}
              step={500}
              value={targetSteps}
              onChange={(e) => setTargetSteps(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">
              Reading min (pages)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={targetPages}
              onChange={(e) => setTargetPages(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 h-9 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--text-primary)] transition-colors"
          >
            Save daily targets
          </button>
        </form>
      </section>

      {/* S25 ULTRA WEBAPK SHORTCUTS & MODES */}
      <section className="rounded-2xl monarch-card p-5 space-y-2.5">
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#4ade80] flex items-center gap-1.5">
          <Smartphone size={14} /> S25 Ultra Long-Press Shortcuts
        </h2>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Install as Chrome WebAPK -&gt; long-press icon or launch via Samsung Modes &amp; Routines:
        </p>
        <div className="space-y-1.5">
          {S25_INTENTS.map((item) => (
            <div
              key={item.url}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[11px]"
            >
              <span>{item.label}</span>
              <code className="font-mono text-[#60a5fa]">{item.url}</code>
            </div>
          ))}
        </div>
      </section>

      {/* 2-WAY GOOGLE SHEET SPINE + CLOUD BACKUP */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#f59e0b]">
            MONARCH_LEDGER (2-WAY SYNC &amp; BACKUP)
          </h2>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3b6cf6]/15 border border-[#3b6cf6]/40 font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase text-[#93c5fd]"
            >
              OPEN SHEET <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[11px] space-y-1 text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)]">1.</strong> Paste{" "}
            <code className="text-[#60a5fa]">MONARCH_APPS_SCRIPT.gs</code> (v5) into{" "}
            <code className="text-[#60a5fa]">MONARCH_LEDGER</code> -&gt; Deploy Web App.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">2.</strong> Set Script Property{" "}
            <code className="text-[#60a5fa]">MONARCH_SYNC_SECRET</code> and enter the same token below (plus{" "}
            <code className="text-[#60a5fa]">?token=...</code> on HC Webhook).
          </p>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Apps Script Web App URL
              </label>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
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
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
              />
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase text-[#051b0e] inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> SYNC
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Sync Secret Token
              </label>
              <input
                type="password"
                placeholder="MONARCH_SYNC_SECRET"
                value={store.syncToken ?? ""}
                onChange={(e) => store.setSyncToken(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Sheet ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Google Sheet ID"
                value={store.ledgerSheetId}
                onChange={(e) => store.setLedgerSheetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Full State Cloud Backup & Restore (lifts, books, saved foods, meal plan) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCloudBackup}
            disabled={cloudBusy}
            className="h-9 rounded-xl bg-[#3b6cf6]/15 border border-[#3b6cf6]/35 text-[#93c5fd] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CloudUpload size={14} />
            <span>Cloud Backup</span>
          </button>
          <button
            onClick={handleCloudRestore}
            disabled={cloudBusy}
            className="h-9 rounded-xl bg-[#8b5cf6]/15 border border-[#8b5cf6]/35 text-[#c4b5fd] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CloudDownload size={14} />
            <span>Cloud Restore</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Download size={13} /> Download JSON
          </button>
          <button
            onClick={handleCopyBackup}
            className="flex-1 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Copy size={13} /> Copy JSON
          </button>
          <button
            onClick={() => setImportOpen((v) => !v)}
            className="px-3 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-medium flex items-center justify-center gap-1"
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
              className="w-full p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-[11px]"
            />
            <button
              onClick={handleImport}
              className="w-full h-9 rounded-xl bg-[#3b6cf6] text-white text-xs font-semibold"
            >
              RESTORE STATE
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
