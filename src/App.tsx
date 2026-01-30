import { useState, useEffect, useCallback } from "react";
import type { TaxReturn, PendingUpload } from "./lib/schema";
import { demoReturn } from "./data/demo";
import { Sidebar } from "./components/Sidebar";
import { MainPanel } from "./components/MainPanel";
import { UploadModal } from "./components/UploadModal";
import { Chat } from "./components/Chat";
import { extractYearFromFilename } from "./lib/year-extractor";
import "./index.css";

type SelectedView = "summary" | "demo" | number | `pending:${string}`;

interface AppState {
  returns: Record<number, TaxReturn>;
  hasStoredKey: boolean;
  selectedYear: SelectedView;
  isLoading: boolean;
}

async function fetchInitialState(): Promise<Pick<AppState, "returns" | "hasStoredKey">> {
  const [configRes, returnsRes] = await Promise.all([
    fetch("/api/config"),
    fetch("/api/returns"),
  ]);
  const { hasKey } = await configRes.json();
  const returns = await returnsRes.json();
  return { hasStoredKey: hasKey, returns };
}

function getDefaultSelection(returns: Record<number, TaxReturn>): SelectedView {
  const years = Object.keys(returns).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return "demo";
  if (years.length === 1) return years[0];
  return "summary";
}

interface SidebarItem {
  id: string;
  label: string;
  isPending?: boolean;
  status?: "extracting-year" | "parsing";
}

function buildSidebarItems(
  returns: Record<number, TaxReturn>,
  pendingUploads: PendingUpload[]
): SidebarItem[] {
  const years = Object.keys(returns).map(Number).sort((a, b) => a - b);
  const items: SidebarItem[] = [];

  if (years.length === 0 && pendingUploads.length === 0) {
    return [{ id: "demo", label: "Demo" }];
  }

  if (years.length > 1 || (years.length >= 1 && pendingUploads.length > 0)) {
    items.push({ id: "summary", label: "Summary" });
  }

  items.push(...years.map((y) => ({ id: String(y), label: String(y) })));

  // Add pending uploads
  for (const pending of pendingUploads) {
    items.push({
      id: `pending:${pending.id}`,
      label: pending.year ? String(pending.year) : "...",
      isPending: true,
      status: pending.status,
    });
  }

  return items;
}

export function App() {
  const [state, setState] = useState<AppState>({
    returns: {},
    hasStoredKey: false,
    selectedYear: "demo",
    isLoading: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [configureKeyOnly, setConfigureKeyOnly] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const items = buildSidebarItems(state.returns, pendingUploads);

  useEffect(() => {
    fetchInitialState()
      .then(({ returns, hasStoredKey }) => {
        setState({
          returns,
          hasStoredKey,
          selectedYear: getDefaultSelection(returns),
          isLoading: false,
        });
      })
      .catch((err) => {
        console.error("Failed to load:", err);
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const selectedId =
        state.selectedYear === "demo"
          ? "demo"
          : state.selectedYear === "summary"
            ? "summary"
            : String(state.selectedYear);
      const selectedIndex = items.findIndex((item) => item.id === selectedId);

      if (e.key === "j" && selectedIndex < items.length - 1) {
        const nextItem = items[selectedIndex + 1];
        if (nextItem) {
          setState((s) => ({
            ...s,
            selectedYear: parseSelectedId(nextItem.id),
          }));
        }
      }
      if (e.key === "k" && selectedIndex > 0) {
        const prevItem = items[selectedIndex - 1];
        if (prevItem) {
          setState((s) => ({
            ...s,
            selectedYear: parseSelectedId(prevItem.id),
          }));
        }
      }
    },
    [state.selectedYear, items]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function parseSelectedId(id: string): SelectedView {
    if (id === "demo") return "demo";
    if (id === "summary") return "summary";
    if (id.startsWith("pending:")) return id as `pending:${string}`;
    return Number(id);
  }

  async function processUpload(file: File, apiKey: string) {
    const formData = new FormData();
    formData.append("pdf", file);
    if (apiKey) formData.append("apiKey", apiKey);

    const res = await fetch("/api/parse", { method: "POST", body: formData });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || `HTTP ${res.status}`);
    }

    const taxReturn: TaxReturn = await res.json();
    const returnsRes = await fetch("/api/returns");
    const returns = await returnsRes.json();

    setState((s) => ({
      ...s,
      returns,
      hasStoredKey: true,
      // Stay on summary if already there, otherwise navigate to new year
      selectedYear: s.selectedYear === "summary" ? "summary" : taxReturn.year,
    }));
  }

  async function handleUploadFromSidebar(files: File[]) {
    if (files.length === 0) return;

    // If no API key, open modal with all files
    if (!state.hasStoredKey) {
      setPendingFiles(files);
      setIsModalOpen(true);
      return;
    }

    // Create pending uploads immediately (optimistic) for all files
    const newPendingUploads: PendingUpload[] = files.map((file) => {
      const filenameYear = extractYearFromFilename(file.name);
      return {
        id: crypto.randomUUID(),
        filename: file.name,
        year: filenameYear,
        status: filenameYear ? "parsing" : "extracting-year",
        file,
      };
    });

    setPendingUploads((prev) => [...prev, ...newPendingUploads]);

    // Select the first pending upload
    const firstPending = newPendingUploads[0];
    if (firstPending) {
      setState((s) => ({ ...s, selectedYear: `pending:${firstPending.id}` }));
    }

    // Extract years in parallel for files that don't have one from filename
    await Promise.all(
      newPendingUploads
        .filter((p) => !p.year)
        .map(async (pending) => {
          try {
            const formData = new FormData();
            formData.append("pdf", pending.file);
            const yearRes = await fetch("/api/extract-year", { method: "POST", body: formData });
            const { year: extractedYear } = await yearRes.json();
            setPendingUploads((prev) =>
              prev.map((p) =>
                p.id === pending.id ? { ...p, year: extractedYear, status: "parsing" } : p
              )
            );
          } catch (err) {
            console.error("Year extraction failed:", err);
            setPendingUploads((prev) =>
              prev.map((p) =>
                p.id === pending.id ? { ...p, status: "parsing" } : p
              )
            );
          }
        })
    );

    // Process files sequentially (full parsing)
    setIsUploading(true);
    for (const pending of newPendingUploads) {
      try {
        await processUpload(pending.file, "");
        // Remove from pending uploads after success
        setPendingUploads((prev) => prev.filter((p) => p.id !== pending.id));
      } catch (err) {
        console.error("Upload failed:", err);
        // Remove from pending uploads on error, but continue processing others
        setPendingUploads((prev) => prev.filter((p) => p.id !== pending.id));
      }
    }
    setIsUploading(false);

    // Navigate to appropriate view after all uploads complete
    setState((s) => ({
      ...s,
      selectedYear: getDefaultSelection(s.returns),
    }));
  }

  async function handleUploadFromModal(files: File[], apiKey: string) {
    for (const file of files) {
      await processUpload(file, apiKey);
    }
    setPendingFiles([]);
  }

  async function handleSaveApiKey(apiKey: string) {
    const res = await fetch("/api/config/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || `HTTP ${res.status}`);
    }
    setState((s) => ({ ...s, hasStoredKey: true }));
  }

  function handleSelect(id: string) {
    setState((s) => ({
      ...s,
      selectedYear: parseSelectedId(id),
    }));
  }

  async function handleDelete(id: string) {
    const year = Number(id);
    if (isNaN(year)) return;

    await fetch(`/api/returns/${year}`, { method: "DELETE" });

    setState((s) => {
      const newReturns = { ...s.returns };
      delete newReturns[year];
      const newSelection = s.selectedYear === year ? getDefaultSelection(newReturns) : s.selectedYear;
      return {
        ...s,
        returns: newReturns,
        selectedYear: newSelection,
      };
    });
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm">
        Loading...
      </div>
    );
  }

  function getSelectedId(): string {
    if (typeof state.selectedYear === "string" && state.selectedYear.startsWith("pending:")) {
      return state.selectedYear;
    }
    if (state.selectedYear === "demo") return "demo";
    if (state.selectedYear === "summary") return "summary";
    return String(state.selectedYear);
  }
  const selectedId = getSelectedId();

  function getReceiptData(): TaxReturn {
    if (state.selectedYear === "demo") return demoReturn;
    if (typeof state.selectedYear === "number") {
      return state.returns[state.selectedYear] || demoReturn;
    }
    return demoReturn;
  }

  function renderMainPanel() {
    const chatProps = {
      isChatOpen,
      onToggleChat: () => setIsChatOpen(!isChatOpen),
    };

    if (selectedPendingUpload) {
      return <MainPanel view="loading" pendingUpload={selectedPendingUpload} {...chatProps} />;
    }
    if (state.selectedYear === "summary") {
      return <MainPanel view="summary" returns={state.returns} {...chatProps} />;
    }
    return (
      <MainPanel
        view="receipt"
        data={getReceiptData()}
        title={state.selectedYear === "demo" ? "Demo" : String(state.selectedYear)}
        {...chatProps}
      />
    );
  }

  // Find pending upload if selected
  const selectedPendingUpload =
    typeof state.selectedYear === "string" && state.selectedYear.startsWith("pending:")
      ? pendingUploads.find((p) => `pending:${p.id}` === state.selectedYear)
      : null;

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        selectedId={selectedId}
        onSelect={handleSelect}
        onUpload={handleUploadFromSidebar}
        onDelete={handleDelete}
        isUploading={isUploading}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onConfigureApiKey={() => {
          setConfigureKeyOnly(true);
          setIsModalOpen(true);
        }}
      />

      {renderMainPanel()}

      {isChatOpen && (
        <Chat
          returns={state.returns}
          hasApiKey={state.hasStoredKey}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPendingFiles([]);
          setConfigureKeyOnly(false);
        }}
        onUpload={handleUploadFromModal}
        onSaveApiKey={handleSaveApiKey}
        hasStoredKey={state.hasStoredKey}
        pendingFiles={pendingFiles}
        configureKeyOnly={configureKeyOnly}
      />
    </div>
  );
}

export default App;
