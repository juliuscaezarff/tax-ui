import type { TaxReturn } from "./schema";

export function getTotalTax(data: TaxReturn): number {
  return data.federal.tax + data.states.reduce((sum, s) => sum + s.tax, 0);
}

export function getNetIncome(data: TaxReturn): number {
  return data.income.total - getTotalTax(data);
}

export function getEffectiveRate(data: TaxReturn): number {
  if (data.rates?.combined?.effective) {
    return data.rates.combined.effective / 100;
  }
  return getTotalTax(data) / data.income.total;
}
