import { useState, useRef, useEffect, useCallback } from "react";
import type { TaxReturn } from "../lib/schema";
import { BrailleSpinner } from "./BrailleSpinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  returns: Record<number, TaxReturn>;
  hasApiKey: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "tax-chat-history";

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return [];
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore errors
  }
}

export function Chat({ returns, hasApiKey, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages when they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    saveMessages([]);
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          history: messages,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || `HTTP ${res.status}`);
      }

      const { response } = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const hasReturns = Object.keys(returns).length > 0;

  return (
    <div className="w-80 flex flex-col h-full border-l border-[var(--color-border)] font-mono text-sm">
      <header className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-bold">Chat</h2>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              title="Start new chat"
            >
              New
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-muted)]">
            <div className="text-center">
              <p className="mb-4 text-xs">Ask questions about your tax returns.</p>
              {!hasApiKey && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Configure API key first.
                </p>
              )}
              {hasApiKey && !hasReturns && (
                <p className="text-xs">Upload tax returns to start.</p>
              )}
              {hasApiKey && hasReturns && (
                <div className="text-left text-xs space-y-1">
                  <p className="text-[var(--color-text)] font-medium mb-2">Try:</p>
                  <p>"Total income in 2023?"</p>
                  <p>"Compare my tax rates"</p>
                  <p>"Effective tax rate?"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] px-3 py-2 text-xs ${
                    message.role === "user"
                      ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                      : "border border-[var(--color-border)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 border border-[var(--color-border)] text-xs">
                  <BrailleSpinner />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? "Ask..." : "Need API key"}
            disabled={!hasApiKey || isLoading}
            rows={1}
            className="flex-1 px-2 py-1.5 border border-[var(--color-border)] bg-transparent text-[var(--color-text)] font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-text)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!hasApiKey || isLoading || !input.trim()}
            className="px-3 py-1.5 bg-[var(--color-text)] text-[var(--color-bg)] font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
}
