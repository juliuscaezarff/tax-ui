import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { TaxReturn } from "../lib/schema";
import { formatCurrency, formatPercent, formatPercentChange } from "../lib/format";
import { Table, type ColumnMeta } from "./Table";

interface Props {
  returns: Record<number, TaxReturn>;
}

interface SummaryRow {
  id: string;
  category: string;
  label: string;
  isHeader?: boolean;
  values: Record<number, number | undefined>;
  invertPolarity?: boolean;
}

function getTotalTax(data: TaxReturn): number {
  return data.federal.tax + data.states.reduce((sum, s) => sum + s.tax, 0);
}

function collectRows(returns: Record<number, TaxReturn>): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const allReturns = Object.values(returns);
  const years = Object.keys(returns).map(Number);

  const addRow = (
    category: string,
    label: string,
    getValue: (data: TaxReturn) => number | undefined,
    invertPolarity?: boolean
  ) => {
    const values: Record<number, number | undefined> = {};
    for (const year of years) {
      values[year] = getValue(returns[year]);
    }
    rows.push({
      id: `${category}-${label}-${rows.length}`,
      category,
      label,
      values,
      invertPolarity,
    });
  };

  const addHeader = (category: string) => {
    rows.push({
      id: `header-${category}`,
      category,
      label: category,
      isHeader: true,
      values: {},
    });
  };

  // Monthly Breakdown
  addHeader("Monthly Breakdown");
  addRow("Monthly Breakdown", "Gross monthly", (data) =>
    Math.round(data.income.total / 12)
  );
  addRow("Monthly Breakdown", "Net monthly (after tax)", (data) =>
    Math.round((data.income.total - getTotalTax(data)) / 12)
  );
  addRow("Monthly Breakdown", "Daily take-home", (data) =>
    Math.round((data.income.total - getTotalTax(data)) / 12 / 30)
  );

  // Income items
  addHeader("Income");
  const incomeLabels = new Set<string>();
  for (const r of allReturns) {
    for (const item of r.income.items) {
      incomeLabels.add(item.label);
    }
  }
  for (const label of incomeLabels) {
    addRow("Income", label, (data) =>
      data.income.items.find((i) => i.label === label)?.amount
    );
  }
  addRow("Income", "Total income", (data) => data.income.total);

  // Federal
  addHeader("Federal");
  addRow("Federal", "Adjusted gross income", (data) => data.federal.agi);

  const federalDeductionLabels = new Set<string>();
  for (const r of allReturns) {
    for (const item of r.federal.deductions) {
      federalDeductionLabels.add(item.label);
    }
  }
  for (const label of federalDeductionLabels) {
    addRow("Federal", label, (data) =>
      data.federal.deductions.find((i) => i.label === label)?.amount
    );
  }

  addRow("Federal", "Taxable income", (data) => data.federal.taxableIncome);
  addRow("Federal", "Tax", (data) => data.federal.tax, true);

  const federalCreditLabels = new Set<string>();
  for (const r of allReturns) {
    for (const item of r.federal.credits) {
      federalCreditLabels.add(item.label);
    }
  }
  for (const label of federalCreditLabels) {
    addRow("Federal", label, (data) =>
      data.federal.credits.find((i) => i.label === label)?.amount
    );
  }

  const federalPaymentLabels = new Set<string>();
  for (const r of allReturns) {
    for (const item of r.federal.payments) {
      federalPaymentLabels.add(item.label);
    }
  }
  for (const label of federalPaymentLabels) {
    addRow("Federal", label, (data) =>
      data.federal.payments.find((i) => i.label === label)?.amount
    );
  }

  addRow("Federal", "Refund/Owed", (data) => data.federal.refundOrOwed);

  // States
  const allStates = new Set<string>();
  for (const r of allReturns) {
    for (const s of r.states) {
      allStates.add(s.name);
    }
  }

  for (const stateName of allStates) {
    const getState = (data: TaxReturn) =>
      data.states.find((s) => s.name === stateName);

    addHeader(stateName);
    addRow(stateName, "Adjusted gross income", (data) => getState(data)?.agi);

    const stateDeductionLabels = new Set<string>();
    for (const r of allReturns) {
      const state = r.states.find((s) => s.name === stateName);
      if (state) {
        for (const item of state.deductions) {
          stateDeductionLabels.add(item.label);
        }
      }
    }
    for (const label of stateDeductionLabels) {
      addRow(stateName, label, (data) =>
        getState(data)?.deductions.find((i) => i.label === label)?.amount
      );
    }

    addRow(stateName, "Taxable income", (data) => getState(data)?.taxableIncome);
    addRow(stateName, "Tax", (data) => getState(data)?.tax, true);

    const stateAdjustmentLabels = new Set<string>();
    for (const r of allReturns) {
      const state = r.states.find((s) => s.name === stateName);
      if (state) {
        for (const item of state.adjustments) {
          stateAdjustmentLabels.add(item.label);
        }
      }
    }
    for (const label of stateAdjustmentLabels) {
      addRow(stateName, label, (data) =>
        getState(data)?.adjustments.find((i) => i.label === label)?.amount
      );
    }

    const statePaymentLabels = new Set<string>();
    for (const r of allReturns) {
      const state = r.states.find((s) => s.name === stateName);
      if (state) {
        for (const item of state.payments) {
          statePaymentLabels.add(item.label);
        }
      }
    }
    for (const label of statePaymentLabels) {
      addRow(stateName, label, (data) =>
        getState(data)?.payments.find((i) => i.label === label)?.amount
      );
    }

    addRow(stateName, "Refund/Owed", (data) => getState(data)?.refundOrOwed);
  }

  // Net Position
  addHeader("Net Position");
  addRow("Net Position", "Federal", (data) => data.summary.federalAmount);
  for (const stateName of allStates) {
    addRow("Net Position", stateName, (data) =>
      data.summary.stateAmounts.find((s) => s.state === stateName)?.amount
    );
  }
  addRow("Net Position", "Net total", (data) => data.summary.netPosition);

  // Rates
  addHeader("Rates");
  addRow("Rates", "Federal marginal", (data) => data.rates?.federal.marginal, true);
  addRow("Rates", "Federal effective", (data) => data.rates?.federal.effective, true);
  addRow("Rates", "State marginal", (data) => data.rates?.state?.marginal, true);
  addRow("Rates", "State effective", (data) => data.rates?.state?.effective, true);
  addRow("Rates", "Combined marginal", (data) => data.rates?.combined?.marginal, true);
  addRow("Rates", "Combined effective", (data) => data.rates?.combined?.effective, true);

  return rows;
}

function formatValue(value: number | undefined, isRate: boolean): string {
  if (value === undefined) return "—";
  if (isRate) return formatPercent(value);
  return formatCurrency(value);
}

function ChangeCell({
  current,
  previous,
  invertPolarity,
}: {
  current: number | undefined;
  previous: number | undefined;
  invertPolarity?: boolean;
}) {
  if (current === undefined || previous === undefined || previous === 0) {
    return null;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = change >= 0;
  const isGood = invertPolarity ? !isPositive : isPositive;

  const colorClass = isGood
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  return (
    <span className={`text-xs ${colorClass}`}>
      {formatPercentChange(current, previous)}
    </span>
  );
}

const columnHelper = createColumnHelper<SummaryRow>();

export function SummaryTable({ returns }: Props) {
  const years = Object.keys(returns)
    .map(Number)
    .sort((a, b) => a - b);

  const rows = useMemo(() => collectRows(returns), [returns]);

  const columns = useMemo(() => {
    const cols: ColumnDef<SummaryRow, unknown>[] = [
      columnHelper.accessor("label", {
        header: "Line Item",
        cell: (info) => {
          const row = info.row.original;
          if (row.isHeader) {
            return (
              <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide">
                {row.label}
              </span>
            );
          }
          return info.getValue();
        },
        meta: {
          sticky: true,
        } satisfies ColumnMeta,
        size: 200,
      }),
    ];

    years.forEach((year, i) => {
      const prevYear = i > 0 ? years[i - 1] : undefined;

      cols.push(
        columnHelper.accessor((row) => row.values[year], {
          id: `year-${year}`,
          header: () => year,
          cell: (info) => {
            const row = info.row.original;
            if (row.isHeader) return null;

            const value = info.getValue() as number | undefined;
            const isRate = row.category === "Rates";
            const prevValue = prevYear !== undefined ? row.values[prevYear] : undefined;

            return (
              <div className="text-right tabular-nums">
                <span>{formatValue(value, isRate)}</span>
                {prevYear !== undefined && (
                  <span className="pl-2">
                    <ChangeCell
                      current={value}
                      previous={prevValue}
                      invertPolarity={row.invertPolarity}
                    />
                  </span>
                )}
              </div>
            );
          },
          meta: {
            align: "right",
            borderLeft: i > 0,
          } satisfies ColumnMeta,
          size: 180,
        })
      );
    });

    return cols;
  }, [years]);

  return (
    <div className="p-6 font-mono text-sm">
      <Table data={rows} columns={columns} storageKey="summary-table" />
    </div>
  );
}
