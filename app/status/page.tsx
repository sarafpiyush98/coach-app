"use client";

import { useState } from "react";
import { Copy, Download, Smartphone, Upload } from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { RadarChart } from "@/components/ui/radar-chart";
import { XPRing } from "@/components/ui/xp-ring";
import { useToastStore } from "@/components/ui/system-toast";
import { SHADOW_PASSIVES } from "@/lib/monarch-catalog";
import {
  computeMonarchStats,
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

      {/* ZERO-BACKEND BACKUP & OPTIONAL WEBHOOK */}
      <SystemPanel className="p-4 space-y-2.5" animate={false}>
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          PORTABLE JSON BACKUP &amp; OPTIONAL SYNC URL
        </h2>

        <div className="flex gap-2">
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

        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Optional Google Apps Script / HC Webhook Sync URL
          </label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={store.webhookUrl}
            onChange={(e) => store.setWebhookUrl(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-xs"
          />
        </div>
      </SystemPanel>
    </div>
  );
}
