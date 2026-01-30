import { BrailleSpinner } from "./BrailleSpinner";

interface Props {
  filename: string;
  year: number | null;
  status: "extracting-year" | "parsing";
}

export function LoadingView({ filename, year, status }: Props) {
  const statusText = status === "extracting-year"
    ? "Extracting year..."
    : "Parsing tax return...";

  return (
    <div className="flex-1 flex flex-col items-center justify-center font-mono text-sm">
      <div className="text-center">
        <div className="text-4xl mb-4">
          <BrailleSpinner />
        </div>
        <h2 className="text-lg font-bold mb-2">
          {year ? `${year} Tax Return` : "Processing"}
        </h2>
        <p className="text-[var(--color-muted)] mb-1">{filename}</p>
        <p className="text-xs text-[var(--color-muted)]">{statusText}</p>
      </div>
    </div>
  );
}
