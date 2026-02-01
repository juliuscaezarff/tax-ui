import { formatCurrency } from "../lib/format";

interface RowProps {
  label: string;
  amount: number;
  showSign?: boolean;
  isTotal?: boolean;
  isMuted?: boolean;
}

export function Row({ label, amount, showSign, isTotal, isMuted }: RowProps) {
  return (
    <div
      className={`flex justify-between items-center py-1.5 text-sm ${
        isTotal ? "font-medium" : ""
      } ${isMuted ? "text-(--color-text-muted)" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount, showSign)}</span>
    </div>
  );
}

interface RateRowProps {
  label: string;
  marginal: string;
  effective: string;
}

export function RateRow({ label, marginal, effective }: RateRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="flex-1">{label}</span>
      <span className="w-20 text-right tabular-nums">{marginal}</span>
      <span className="w-20 text-right tabular-nums">{effective}</span>
    </div>
  );
}
