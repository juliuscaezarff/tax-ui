import { useState, useRef, useCallback } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Accordion } from "@base-ui/react/accordion";
import { Input } from "@base-ui/react/input";
import { Button } from "./Button";

const AI_PRIVACY_PROMPT = `I want you to perform a security and privacy audit of TaxUI, an open source tax return parser.

Repository: https://github.com/brianlovin/tax-ui

Please analyze the source code and verify:

1. DATA HANDLING
   - Tax return PDFs are sent directly to Anthropic's API for parsing
   - No data is sent to any other third-party servers
   - Parsed data is stored locally only

2. NETWORK ACTIVITY
   - Identify all network requests in the codebase
   - Verify the only external calls are to Anthropic's API
   - Check for any hidden data collection or tracking

3. API KEY SECURITY
   - Verify API keys are stored locally and not transmitted elsewhere
   - Check that keys are not logged or exposed

4. CODE INTEGRITY
   - Look for obfuscated or suspicious code
   - Review dependencies for anything concerning

Key files to review:
- src/index.ts (Bun server and API routes)
- src/lib/parser.ts (Claude API integration)
- src/lib/storage.ts (Local file storage)
- src/App.tsx (React frontend)

Report any privacy or security concerns. I'm considering using this app with sensitive tax data.`;

interface Props {
  isOpen: boolean;
  isDemo: boolean;
  onUpload: (files: File[], apiKey: string) => Promise<void>;
  onClose: () => void;
}

export function OnboardingDialog({ isOpen, isDemo, onUpload, onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasScrollOverflow, setHasScrollOverflow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const checkOverflow = () => {
      setHasScrollOverflow(node.scrollHeight > node.clientHeight && node.scrollTop < node.scrollHeight - node.clientHeight - 1);
    };
    checkOverflow();
    node.addEventListener("scroll", checkOverflow);
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(node);
  }, []);

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PRIVACY_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = AI_PRIVACY_PROMPT;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    } else {
      setError("Please upload PDF files");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selectedFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf"
    );
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    } else if (e.target.files?.length) {
      setError("Please upload PDF files");
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one tax return PDF");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onUpload(files, apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process PDFs");
    } finally {
      setIsLoading(false);
    }
  }

  // Demo mode: show instructions for running locally
  if (isDemo) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-[2px] z-40" />
          <Dialog.Popup className="dialog-popup fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col focus:outline-none">
            {/* Scrollable content area */}
            <div ref={handleScrollRef} className="flex-1 overflow-y-auto min-h-0 px-8 pt-8 pb-6 relative">
              {/* Header with close button */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <Dialog.Title className="text-xl font-semibold">TaxUI</Dialog.Title>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    Parse and analyze your tax returns with AI
                  </p>
                </div>
                <Dialog.Close autoFocus className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-bg-muted)] focus:outline-none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </Dialog.Close>
              </div>

              {/* Demo notice */}
              <div className="mb-6 p-4 bg-[var(--color-bg-muted)] rounded-xl">
                <p className="text-sm text-[var(--color-text-muted)]">
                  This is a demo with sample data. To use TaxUI with your own tax returns, run it locally on your computer.
                </p>
              </div>

              {/* Instructions */}
              <div className="mb-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Run locally</h3>
                  <div className="bg-[var(--color-bg-muted)] rounded-lg p-3 font-mono text-sm">
                    <div className="text-[var(--color-text-muted)]"># Clone and run</div>
                    <div>git clone https://github.com/brianlovin/tax-ui</div>
                    <div>cd tax-ui</div>
                    <div>bun install</div>
                    <div>bun run dev</div>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Requires{" "}
                  <a
                    href="https://bun.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--color-text)]"
                  >
                    Bun
                  </a>{" "}
                  and an{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--color-text)]"
                  >
                    Anthropic API key
                  </a>
                </p>
              </div>

              {/* Browse demo button */}
              <Button onClick={onClose} className="w-full">
                Browse Demo
              </Button>
            </div>

            {/* FAQ Section - always visible */}
            <div className={`flex-shrink-0 border-t border-[var(--color-border)] px-6 pt-4 pb-6 relative ${hasScrollOverflow ? "shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.3)]" : ""}`}>
              <Accordion.Root>
                <Accordion.Item value="data-safe">
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full text-sm font-medium cursor-pointer flex items-center justify-between py-2 group focus:outline-none">
                      <span>Is my data safe?</span>
                      <svg
                        className="w-4 h-4 text-[var(--color-text-muted)] group-data-[panel-open]:rotate-180 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="text-sm text-[var(--color-text-muted)] space-y-2 pb-4">
                    <p>
                      When running locally, your tax data is processed on your computer and sent directly to
                      Anthropic's API using your own API key. No data is stored on any third-party servers.
                    </p>
                    <p>
                      Anthropic's commercial terms prohibit training models on API
                      customer data.{" "}
                      <a
                        href="https://www.anthropic.com/legal/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-[var(--color-text)]"
                      >
                        Privacy policy
                      </a>
                    </p>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="how-sure">
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full text-sm font-medium cursor-pointer flex items-center justify-between py-2 group focus:outline-none">
                      <span>How can I be sure?</span>
                      <svg
                        className="w-4 h-4 text-[var(--color-text-muted)] group-data-[panel-open]:rotate-180 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="text-sm text-[var(--color-text-muted)] space-y-3 pb-2">
                    <p>
                      TaxUI is open source. You can review the code yourself, or ask
                      an AI to audit it for you.
                    </p>
                    <Button
                      onClick={handleCopyPrompt}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      {copied ? "Copied!" : "Copy prompt"}
                    </Button>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion.Root>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Local mode: show API key input and upload
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-[2px] z-40" />
        <Dialog.Popup className="dialog-popup fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col focus:outline-none">
          {/* Scrollable content area */}
          <div ref={handleScrollRef} className="flex-1 overflow-y-auto min-h-0 px-8 pt-8 pb-6">
            {/* Header with close button */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <Dialog.Title className="text-xl font-semibold">TaxUI</Dialog.Title>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  Parse and analyze your tax returns with AI
                </p>
              </div>
              <Dialog.Close className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-bg-muted)] focus:outline-none">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </Dialog.Close>
            </div>

            {/* API Key Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Anthropic API Key
              </label>
              <Input
                autoFocus
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                disabled={isLoading}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-[var(--color-bg-muted)] rounded-lg text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-text-muted)] disabled:opacity-50"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[var(--color-text)]"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            {/* Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Tax Return PDFs
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={[
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-[var(--color-text-muted)] bg-[var(--color-bg-muted)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]",
                  isLoading ? "opacity-50 cursor-not-allowed" : "",
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
                <div className="text-[var(--color-text-muted)]">
                  <svg
                    className="w-10 h-10 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm">Drop PDF files here or click to browse</p>
                  <p className="text-xs mt-1 opacity-70">
                    Supports multiple files
                  </p>
                </div>
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <div className="mt-3 space-y-1">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm bg-[var(--color-bg-muted)] rounded-lg px-3 py-2"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(i);
                        }}
                        disabled={isLoading}
                        className="ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 text-sm text-[var(--color-negative)]">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !apiKey.trim() || files.length === 0}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Start"}
            </Button>
          </div>

          {/* FAQ Section - always visible */}
          <div className={`flex-shrink-0 border-t border-[var(--color-border)] px-6 pt-4 pb-6 ${hasScrollOverflow ? "shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.3)]" : ""}`}>
            <Accordion.Root>
              <Accordion.Item value="data-safe">
                <Accordion.Header>
                  <Accordion.Trigger className="w-full text-sm font-medium cursor-pointer flex items-center justify-between py-2 group focus:outline-none">
                    <span>Is my data safe?</span>
                    <svg
                      className="w-4 h-4 text-[var(--color-text-muted)] group-data-[panel-open]:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className="text-sm text-[var(--color-text-muted)] space-y-2 pb-4">
                  <p>
                    Your tax data is processed locally and sent directly to
                    Anthropic's API using your own API key. No data is stored on
                    any third-party servers.
                  </p>
                  <p>
                    Anthropic's commercial terms prohibit training models on API
                    customer data.{" "}
                    <a
                      href="https://www.anthropic.com/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[var(--color-text)]"
                    >
                      Privacy policy
                    </a>
                  </p>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="how-sure">
                <Accordion.Header>
                  <Accordion.Trigger className="w-full text-sm font-medium cursor-pointer flex items-center justify-between py-2 group focus:outline-none">
                    <span>How can I be sure?</span>
                    <svg
                      className="w-4 h-4 text-[var(--color-text-muted)] group-data-[panel-open]:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className="text-sm text-[var(--color-text-muted)] space-y-3 pb-2">
                  <p>
                    TaxUI is open source. You can review the code yourself, or ask
                    an AI to audit it for you.
                  </p>
                  <Button
                    onClick={handleCopyPrompt}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    {copied ? "Copied!" : "Copy prompt"}
                  </Button>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
