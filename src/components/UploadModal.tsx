import { useState, useRef, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], apiKey: string) => Promise<void>;
  onSaveApiKey?: (apiKey: string) => Promise<void>;
  hasStoredKey: boolean;
  pendingFiles: File[];
  configureKeyOnly?: boolean;
}

export function UploadModal({ isOpen, onClose, onUpload, onSaveApiKey, hasStoredKey, pendingFiles, configureKeyOnly }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFiles = pendingFiles.length > 0 ? pendingFiles : files;
  const needsApiKey = !hasStoredKey && !apiKey.trim();
  const showFileUpload = pendingFiles.length === 0 && !configureKeyOnly;

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setApiKey("");
      setError(null);
    }
  }, [isOpen]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    } else {
      setError("Please upload PDF files");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selectedFiles = Array.from(e.target.files || []).filter(f => f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    } else if (e.target.files?.length) {
      setError("Please upload PDF files");
    }
  }

  async function handleSubmit() {
    // API key only mode
    if (configureKeyOnly) {
      if (!apiKey.trim()) {
        setError("Please enter your API key");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await onSaveApiKey?.(apiKey.trim());
        setApiKey("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save API key");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (needsApiKey) {
      setError("Please enter your API key");
      return;
    }
    if (activeFiles.length === 0) {
      setError("Please select at least one PDF file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onUpload(activeFiles, apiKey.trim());
      setFiles([]);
      setApiKey("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process PDF");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] max-w-md w-full p-6 font-mono">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">
            {configureKeyOnly ? "Configure API Key" : pendingFiles.length > 0 ? "Enter API Key" : "Upload Tax Return"}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-50 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {pendingFiles.length > 0 && (
          <div className="mb-6 p-3 border border-[var(--color-border)]">
            <p className="text-sm font-medium">
              {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} selected
            </p>
            <div className="text-xs text-[var(--color-muted)] mt-1 max-h-20 overflow-y-auto">
              {pendingFiles.map((f, i) => (
                <div key={i}>{f.name}</div>
              ))}
            </div>
          </div>
        )}

        {(!hasStoredKey || configureKeyOnly) && (
          <div className="mb-6">
            <label className="block text-sm mb-2">Anthropic API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              disabled={isLoading}
              className="w-full px-3 py-2 border border-[var(--color-border)] bg-transparent text-[var(--color-text)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-text)] disabled:opacity-50"
            />
            <p className="text-xs text-[var(--color-muted)] mt-2">
              {configureKeyOnly && hasStoredKey ? "Update your API key. " : ""}Saved to .env in this project directory.
            </p>
          </div>
        )}

        {showFileUpload && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={[
              "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              isDragging ? "border-[var(--color-text)] bg-[var(--color-text)]/5" : "border-[var(--color-border)]",
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--color-text)]",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              disabled={isLoading}
              className="hidden"
            />
            {files.length > 0 ? (
              <>
                <p className="text-sm font-medium">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <div className="text-xs text-[var(--color-muted)] mt-1 max-h-20 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i}>{f.name}</div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">Drop your tax return PDFs here</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">or click to browse</p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 border border-red-500 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!configureKeyOnly && (
          <div className="mt-6 p-3 bg-[var(--color-text)]/5 text-xs text-[var(--color-muted)]">
            <strong>Privacy:</strong> Your tax return is sent directly to Anthropic's API.
            Data is stored locally in .tax-returns.json (gitignored).{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-text)]"
            >
              Anthropic's privacy policy
            </a>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || (configureKeyOnly ? !apiKey.trim() : (needsApiKey || activeFiles.length === 0))}
          className="mt-6 w-full py-3 bg-[var(--color-text)] text-[var(--color-bg)] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isLoading ? (configureKeyOnly ? "Saving..." : "Processing...") : (configureKeyOnly ? "Save API Key" : `Parse ${activeFiles.length > 1 ? `${activeFiles.length} Returns` : "Tax Return"}`)}
        </button>
      </div>
    </div>
  );
}
