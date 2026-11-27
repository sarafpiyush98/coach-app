"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Edit3,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useToastStore } from "@/components/ui/system-toast";
import {
  computeReadingStreak,
  createEmptyDay,
  getDailyReadingPages,
  getTodayKey,
  useMonarchStore,
} from "@/lib/monarch-store";
import { playQuestComplete, playShadowArise, playSystemPing } from "@/lib/sounds";

export function ReadingSheet({
  open,
  onClose,
  initialMode = "update",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: "update" | "add";
}) {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const books = store.books ?? [];
  const activeBook =
    books.find((b) => b.id === store.activeBookId) ??
    books.find((b) => b.status === "reading") ??
    books[0] ??
    null;

  const todayKey = getTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);
  const readingLogs = today.readingLogs ?? [];
  const readingMin = store.readingMinPages || 5;
  const todayPages = getDailyReadingPages(today);
  const streak = useMemo(
    () => computeReadingStreak(store.days, readingMin),
    [store.days, readingMin]
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [draftPageInput, setDraftPageInput] = useState("0");
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaAuthor, setMetaAuthor] = useState("");
  const [metaTotalPages, setMetaTotalPages] = useState("");

  // Add book form state
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newStartPage, setNewStartPage] = useState("0");
  const [newTotalPages, setNewTotalPages] = useState("");

  useEffect(() => {
    if (!open) return;
    setShowAddForm(initialMode === "add" || !activeBook);
    setEditingMeta(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode]);

  useEffect(() => {
    if (!activeBook) return;
    setDraftPageInput(String(activeBook.currentPage));
    setMetaTitle(activeBook.title);
    setMetaAuthor(activeBook.author ?? "");
    setMetaTotalPages(activeBook.totalPages ? String(activeBook.totalPages) : "");
  }, [
    activeBook?.id,
    activeBook?.currentPage,
    activeBook?.title,
    activeBook?.author,
    activeBook?.totalPages,
  ]);

  if (!open) return null;

  const draftPageNum = Math.max(0, Math.round(Number(draftPageInput) || 0));
  const draftDelta = activeBook ? draftPageNum - activeBook.currentPage : 0;

  function stepDraftPage(delta: number) {
    const next = Math.max(0, draftPageNum + delta);
    setDraftPageInput(String(next));
  }

  function handleUpdatePage() {
    if (!activeBook || draftDelta === 0) return;
    const prevPage = activeBook.currentPage;
    const res = store.logBookPage(activeBook.id, draftPageNum);
    if (res.floorJustCleared) {
      playShadowArise();
      addToast({
        title: "DAILY READING FLOOR CLEARED (+25 XP)",
        message: `${activeBook.title} · p. ${prevPage} -> ${draftPageNum} (${res.todayPages}/${readingMin}p today)`,
        variant: "quest",
        duration: 2600,
      });
    } else if (res.finishedBook) {
      playShadowArise();
      addToast({
        title: `FINISHED: ${activeBook.title.toUpperCase()}`,
        message: `Reached p. ${draftPageNum} · ${res.todayPages}p logged today`,
        variant: "success",
        duration: 2800,
      });
    } else {
      playQuestComplete();
      const sign = res.pagesDelta > 0 ? `+${res.pagesDelta}` : `${res.pagesDelta}`;
      addToast({
        title: `PAGE UPDATED (${sign}P)`,
        message: `${activeBook.title} · now on p. ${draftPageNum} (${res.todayPages}/${readingMin}p today)`,
        variant: "success",
        duration: 2200,
      });
    }
  }

  function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = store.addBook({
      title: newTitle.trim(),
      author: newAuthor.trim() || undefined,
      currentPage: Math.max(0, Math.round(Number(newStartPage) || 0)),
      totalPages:
        Number(newTotalPages) > 0 ? Math.round(Number(newTotalPages)) : undefined,
    });
    playQuestComplete();
    addToast({
      title: "BOOK ADDED & SELECTED",
      message: `${created.title} · starting on p. ${created.currentPage}`,
      variant: "success",
      duration: 2200,
    });
    setNewTitle("");
    setNewAuthor("");
    setNewStartPage("0");
    setNewTotalPages("");
    setShowAddForm(false);
  }

  function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBook || !metaTitle.trim()) return;
    store.updateBookMeta(activeBook.id, {
      title: metaTitle.trim(),
      author: metaAuthor.trim(),
      totalPages: Number(metaTotalPages) > 0 ? Math.round(Number(metaTotalPages)) : 0,
    });
    playSystemPing();
    setEditingMeta(false);
    addToast({
      title: "BOOK DETAILS UPDATED",
      variant: "info",
      duration: 1800,
    });
  }

  function handleToggleFinished() {
    if (!activeBook) return;
    const nextStatus = activeBook.status === "finished" ? "reading" : "finished";
    store.updateBookMeta(activeBook.id, { status: nextStatus });
    playSystemPing();
    addToast({
      title: nextStatus === "finished" ? "BOOK MARKED FINISHED" : "BOOK REOPENED",
      message: activeBook.title,
      variant: "info",
      duration: 2000,
    });
  }

  const pct =
    activeBook?.totalPages && activeBook.totalPages > 0
      ? Math.min(100, Math.round((activeBook.currentPage / activeBook.totalPages) * 100))
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Book tracker
            </h3>
            <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
              Today: {todayPages}/{readingMin} pages
              {streak > 0 ? ` · ${streak}d streak` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                showAddForm
                  ? "bg-[#3b6cf6] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Plus size={13} />
              <span>Add book</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close book tracker"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Add New Book Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddBook}
              className="p-3.5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Add a book to track
                </span>
                {activeBook && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Book title (e.g. Atomic Habits)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
              />
              <input
                type="text"
                placeholder="Author (optional)"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Current page
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStartPage}
                    onChange={(e) => setNewStartPage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Total pages (opt.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="320"
                    value={newTotalPages}
                    onChange={(e) => setNewTotalPages(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="w-full h-10 rounded-xl bg-[#3b6cf6] hover:bg-[#2f5ee5] disabled:opacity-40 text-white text-xs font-semibold transition-colors"
              >
                Save &amp; start tracking
              </button>
            </form>
          )}

          {/* Active Book & Multi-Update Page Panel */}
          {activeBook ? (
            <div className="p-4 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#60a5fa] shrink-0" />
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {activeBook.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                    {activeBook.author ? `${activeBook.author} · ` : ""}
                    Currently at{" "}
                    <span className="font-mono text-[var(--text-primary)]">
                      p. {activeBook.currentPage}
                    </span>
                    {activeBook.totalPages ? ` / ${activeBook.totalPages}` : ""}
                    {pct !== null ? ` (${pct}%)` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingMeta((v) => !v)}
                    className="h-7 px-2 rounded-lg bg-[var(--surface-2)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleToggleFinished}
                    className={`h-7 px-2 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 ${
                      activeBook.status === "finished"
                        ? "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/35"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Check size={11} />
                    <span>{activeBook.status === "finished" ? "Finished" : "Finish"}</span>
                  </button>
                </div>
              </div>

              {pct !== null && (
                <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full progress-blue transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {editingMeta && (
                <form
                  onSubmit={handleSaveMeta}
                  className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] space-y-2"
                >
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={metaAuthor}
                      onChange={(e) => setMetaAuthor(e.target.value)}
                      placeholder="Author"
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      value={metaTotalPages}
                      onChange={(e) => setMetaTotalPages(e.target.value)}
                      placeholder="Total pages"
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-8 rounded-lg bg-[#3b6cf6] text-white text-xs font-semibold"
                  >
                    Save changes
                  </button>
                </form>
              )}

              {/* Set New Page Controls */}
              <div className="space-y-2.5 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Now on page</span>
                  <span
                    className={`font-mono text-[11px] ${
                      draftDelta > 0
                        ? "text-[#4ade80]"
                        : draftDelta < 0
                          ? "text-[#fbbf24]"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {draftDelta === 0
                      ? "No change yet"
                      : draftDelta > 0
                        ? `p. ${activeBook.currentPage} -> p. ${draftPageNum} (+${draftDelta}p)`
                        : `Correction: p. ${activeBook.currentPage} -> p. ${draftPageNum} (${draftDelta}p)`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepDraftPage(-5)}
                    className="h-9 px-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--text-secondary)] hover:text-white"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDraftPage(-1)}
                    className="h-9 px-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--text-secondary)] hover:text-white"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min={0}
                    aria-label="Current page number"
                    value={draftPageInput}
                    onChange={(e) => setDraftPageInput(e.target.value)}
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-center font-mono text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[#3b6cf6]"
                  />
                  <button
                    type="button"
                    onClick={() => stepDraftPage(1)}
                    className="h-9 px-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--text-secondary)] hover:text-white"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDraftPage(5)}
                    className="h-9 px-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--text-secondary)] hover:text-white"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDraftPage(10)}
                    className="h-9 px-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--text-secondary)] hover:text-white"
                  >
                    +10
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePage}
                  disabled={draftDelta === 0}
                  className="w-full h-10 rounded-xl bg-[#3b6cf6] hover:bg-[#2f5ee5] disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Update page
                </button>
              </div>
            </div>
          ) : !showAddForm ? (
            <div className="p-6 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-center space-y-2.5">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No active book yet
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Add your current read to track exact page progress and hit your 5-page daily minimum.
              </p>
            </div>
          ) : null}

          {/* Today's Reading Updates */}
          {readingLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Today&apos;s updates ({todayPages}p net)
              </p>
              <div className="space-y-1.5">
                {[...readingLogs].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-[var(--surface-2)] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-[var(--text-primary)] truncate block">
                        {entry.bookTitle}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        p. {entry.fromPage} -&gt; {entry.toPage} (
                        {entry.pagesDelta > 0 ? `+${entry.pagesDelta}` : entry.pagesDelta}p)
                      </span>
                    </div>
                    <button
                      onClick={() => store.removeReadingEntry(todayKey, entry.id)}
                      className="text-[var(--text-muted)] hover:text-[#ef4444] p-1 shrink-0"
                      aria-label={`Undo update p. ${entry.toPage}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Book Shelf / Switcher */}
          {books.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                My books ({books.length})
              </p>
              <div className="space-y-1.5">
                {books.map((book) => {
                  const isActive = activeBook?.id === book.id;
                  return (
                    <div
                      key={book.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-[#3b6cf6]/10 border-[#3b6cf6]/40"
                          : "bg-[var(--surface-2)] border-transparent"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {book.title}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                          p. {book.currentPage}
                          {book.totalPages ? ` / ${book.totalPages}` : ""} ·{" "}
                          {book.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => store.setActiveBook(book.id)}
                            className="h-7 px-2.5 rounded-lg bg-[var(--surface-0)] hover:bg-[#3b6cf6] text-[11px] font-medium text-[var(--text-primary)] transition-colors"
                          >
                            Switch
                          </button>
                        )}
                        <button
                          onClick={() => store.deleteBook(book.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[#ef4444]"
                          aria-label={`Delete ${book.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
