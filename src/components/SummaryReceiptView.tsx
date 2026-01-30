import { useMemo, useState } from "react";
import type { TaxReturn } from "../lib/schema";
import { formatPercent } from "../lib/format";
import { getEffectiveRate } from "../lib/tax-calculations";
import { type TimeUnit, TIME_UNIT_LABELS, convertToTimeUnit, formatTimeUnitValue } from "../lib/time-units";
import { Row, RateRow } from "./Row";
import { Separator, DoubleSeparator, SectionHeader } from "./Section";
import { SleepingEarnings } from "./SleepingEarnings";
import { TaxFreedomDay } from "./TaxFreedomDay";

interface Props {
  returns: Record<number, TaxReturn>;
}

export function SummaryReceiptView({ returns }: Props) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("daily");

  const data = useMemo(() => {
    const years = Object.keys(returns).map(Number).sort((a, b) => a - b);
    const allReturns = years.map((year) => returns[year]).filter((r): r is TaxReturn => r !== undefined);

    if (allReturns.length === 0) return null;

    // Aggregate income items across years
    const incomeItemsMap = new Map<string, number>();
    for (const r of allReturns) {
      for (const item of r.income.items) {
        incomeItemsMap.set(item.label, (incomeItemsMap.get(item.label) || 0) + item.amount);
      }
    }
    const incomeItems = Array.from(incomeItemsMap.entries()).map(([label, amount]) => ({ label, amount }));

    // Totals
    const totalIncome = allReturns.reduce((sum, r) => sum + r.income.total, 0);
    const totalFederalTax = allReturns.reduce((sum, r) => sum + r.federal.tax, 0);
    const totalStateTax = allReturns.reduce((sum, r) => sum + r.states.reduce((s, st) => s + st.tax, 0), 0);
    const totalTax = totalFederalTax + totalStateTax;
    const netIncome = totalIncome - totalTax;

    // Aggregate federal deductions
    const federalDeductionsMap = new Map<string, number>();
    for (const r of allReturns) {
      for (const item of r.federal.deductions) {
        federalDeductionsMap.set(item.label, (federalDeductionsMap.get(item.label) || 0) + item.amount);
      }
    }
    const federalDeductions = Array.from(federalDeductionsMap.entries()).map(([label, amount]) => ({ label, amount }));

    // Aggregate state info
    const stateMap = new Map<string, { tax: number; count: number }>();
    for (const r of allReturns) {
      for (const s of r.states) {
        const existing = stateMap.get(s.name) || { tax: 0, count: 0 };
        stateMap.set(s.name, { tax: existing.tax + s.tax, count: existing.count + 1 });
      }
    }
    const states = Array.from(stateMap.entries()).map(([name, { tax }]) => ({ name, tax }));

    // Average AGI
    const avgAgi = allReturns.reduce((sum, r) => sum + r.federal.agi, 0) / allReturns.length;
    const avgTaxableIncome = allReturns.reduce((sum, r) => sum + r.federal.taxableIncome, 0) / allReturns.length;

    // Net position totals
    const totalFederalRefund = allReturns.reduce((sum, r) => sum + r.summary.federalAmount, 0);
    const stateRefundsMap = new Map<string, number>();
    for (const r of allReturns) {
      for (const s of r.summary.stateAmounts) {
        stateRefundsMap.set(s.state, (stateRefundsMap.get(s.state) || 0) + s.amount);
      }
    }
    const stateRefunds = Array.from(stateRefundsMap.entries()).map(([state, amount]) => ({ state, amount }));
    const totalNetPosition = allReturns.reduce((sum, r) => sum + r.summary.netPosition, 0);

    // Average rates
    const returnsWithRates = allReturns.filter((r) => r.rates);
    const avgFederalMarginal = returnsWithRates.length > 0
      ? returnsWithRates.reduce((sum, r) => sum + (r.rates?.federal.marginal || 0), 0) / returnsWithRates.length
      : null;
    const avgFederalEffective = returnsWithRates.length > 0
      ? returnsWithRates.reduce((sum, r) => sum + (r.rates?.federal.effective || 0), 0) / returnsWithRates.length
      : null;
    const returnsWithStateRates = allReturns.filter((r) => r.rates?.state);
    const avgStateMarginal = returnsWithStateRates.length > 0
      ? returnsWithStateRates.reduce((sum, r) => sum + (r.rates?.state?.marginal || 0), 0) / returnsWithStateRates.length
      : null;
    const avgStateEffective = returnsWithStateRates.length > 0
      ? returnsWithStateRates.reduce((sum, r) => sum + (r.rates?.state?.effective || 0), 0) / returnsWithStateRates.length
      : null;
    const returnsWithCombinedRates = allReturns.filter((r) => r.rates?.combined);
    const avgCombinedMarginal = returnsWithCombinedRates.length > 0
      ? returnsWithCombinedRates.reduce((sum, r) => sum + (r.rates?.combined?.marginal || 0), 0) / returnsWithCombinedRates.length
      : null;
    const avgCombinedEffective = returnsWithCombinedRates.length > 0
      ? returnsWithCombinedRates.reduce((sum, r) => sum + (r.rates?.combined?.effective || 0), 0) / returnsWithCombinedRates.length
      : null;

    // Monthly and hourly
    const grossMonthly = Math.round(totalIncome / 12 / allReturns.length);
    const netMonthly = Math.round(netIncome / 12 / allReturns.length);
    const avgHourlyRate = (netIncome / allReturns.length) / 2080;

    // Tax freedom day data
    const taxFreedomYears = years.map((year) => {
      const r = returns[year];
      if (!r) return null;
      return { year, effectiveRate: getEffectiveRate(r) };
    }).filter((x): x is { year: number; effectiveRate: number } => x !== null);

    return {
      years,
      yearCount: allReturns.length,
      incomeItems,
      totalIncome,
      avgAgi,
      avgTaxableIncome,
      federalDeductions,
      totalFederalTax,
      states,
      totalStateTax,
      totalTax,
      netIncome,
      totalFederalRefund,
      stateRefunds,
      totalNetPosition,
      rates: avgFederalMarginal !== null ? {
        federal: { marginal: avgFederalMarginal, effective: avgFederalEffective! },
        state: avgStateMarginal !== null ? { marginal: avgStateMarginal, effective: avgStateEffective! } : null,
        combined: avgCombinedMarginal !== null ? { marginal: avgCombinedMarginal, effective: avgCombinedEffective! } : null,
      } : null,
      grossMonthly,
      netMonthly,
      avgHourlyRate,
      taxFreedomYears,
    };
  }, [returns]);

  if (!data) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 font-mono text-sm text-[var(--color-muted)]">
        No tax returns available.
      </div>
    );
  }

  const timeUnitValue = convertToTimeUnit(data.avgHourlyRate, timeUnit);
  const yearRange = data.years.length > 1
    ? `${data.years[0]}–${data.years[data.years.length - 1]}`
    : String(data.years[0]);

  return (
    <div className="max-w-md mx-auto px-6 py-12 font-mono text-sm">
      <header className="mb-2">
        <h1 className="text-lg font-bold tracking-tight">TAX SUMMARY</h1>
        <p className="text-[var(--color-muted)] text-xs">
          {data.yearCount} year{data.yearCount > 1 ? "s" : ""}: {yearRange}
        </p>
      </header>

      <SectionHeader>TOTAL INCOME</SectionHeader>
      <Separator />
      {data.incomeItems.map((item, i) => (
        <Row key={i} label={item.label} amount={item.amount} />
      ))}
      <Separator />
      <Row label="Total income" amount={data.totalIncome} isTotal />

      <SectionHeader>FEDERAL TOTALS</SectionHeader>
      <Separator />
      <Row label={`Avg. adjusted gross income`} amount={Math.round(data.avgAgi)} />
      {data.federalDeductions.map((item, i) => (
        <Row key={i} label={`Total ${item.label.toLowerCase()}`} amount={item.amount} isMuted />
      ))}
      <Separator />
      <Row label={`Avg. taxable income`} amount={Math.round(data.avgTaxableIncome)} />
      <Row label="Total federal tax" amount={data.totalFederalTax} />

      {data.states.length > 0 && (
        <>
          <SectionHeader>STATE TOTALS</SectionHeader>
          <Separator />
          {data.states.map((state, i) => (
            <Row key={i} label={`${state.name} tax`} amount={state.tax} />
          ))}
          <Separator />
          <Row label="Total state tax" amount={data.totalStateTax} isTotal />
        </>
      )}

      <SectionHeader>NET POSITION</SectionHeader>
      <Separator />
      <Row
        label={`Federal ${data.totalFederalRefund >= 0 ? "refund" : "owed"}`}
        amount={data.totalFederalRefund}
        showSign
      />
      {data.stateRefunds.map((item, i) => (
        <Row
          key={i}
          label={`${item.state} ${item.amount >= 0 ? "refund" : "owed"}`}
          amount={item.amount}
          showSign
        />
      ))}
      <DoubleSeparator />
      <Row label="Total net" amount={data.totalNetPosition} isTotal showSign />

      {data.rates && (
        <>
          <SectionHeader>AVERAGE TAX RATES</SectionHeader>
          <Separator />
          <div className="flex justify-between py-0.5 text-[var(--color-muted)] text-xs">
            <span className="w-32" />
            <span className="w-20 text-right">Marginal</span>
            <span className="w-20 text-right">Effective</span>
          </div>
          <RateRow
            label="Federal"
            marginal={formatPercent(data.rates.federal.marginal)}
            effective={formatPercent(data.rates.federal.effective)}
          />
          {data.rates.state && (
            <RateRow
              label="State"
              marginal={formatPercent(data.rates.state.marginal)}
              effective={formatPercent(data.rates.state.effective)}
            />
          )}
          {data.rates.combined && (
            <>
              <Separator />
              <RateRow
                label="Combined"
                marginal={formatPercent(data.rates.combined.marginal)}
                effective={formatPercent(data.rates.combined.effective)}
              />
            </>
          )}
        </>
      )}

      <SectionHeader>AVERAGE MONTHLY</SectionHeader>
      <Separator />
      <Row label="Avg. gross monthly" amount={data.grossMonthly} />
      <Row label="Avg. net monthly (after tax)" amount={data.netMonthly} />

      <div className="flex justify-between py-1">
        <span className="flex items-center gap-1">
          Avg. {TIME_UNIT_LABELS[timeUnit].toLowerCase()} take-home
          {timeUnit === "hourly" && (
            <span
              className="text-[10px] text-[var(--color-muted)] cursor-help"
              title="Based on 2,080 working hours per year (40 hrs x 52 weeks)"
            >
              ?
            </span>
          )}
        </span>
        <span className="tabular-nums">
          {formatTimeUnitValue(timeUnitValue, timeUnit)}
        </span>
      </div>

      <div className="flex gap-1 mt-1 mb-4">
        {(["daily", "hourly", "minute", "second"] as TimeUnit[]).map((unit) => (
          <button
            key={unit}
            onClick={() => setTimeUnit(unit)}
            className={`px-2 py-0.5 text-xs border transition-colors ${
              timeUnit === unit
                ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]"
            }`}
          >
            {unit.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>

      <SleepingEarnings netIncome={data.netIncome / data.yearCount} />

      <TaxFreedomDay years={data.taxFreedomYears} />

      <footer className="mt-12 pt-4 border-t border-[var(--color-border)] text-[var(--color-muted)] text-xs text-center">
        Summary for {yearRange}
      </footer>
    </div>
  );
}
