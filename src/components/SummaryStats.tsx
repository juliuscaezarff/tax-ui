import { useMemo, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import type { TaxReturn } from "../lib/schema";
import { formatCompact } from "../lib/format";
import {
    getTotalTax,
    getNetIncome,
    getEffectiveRate,
} from "../lib/tax-calculations";
import {
    type TimeUnit,
    TIME_UNIT_LABELS,
    convertToTimeUnit,
    formatTimeUnitValueCompact,
} from "../lib/time-units";
import { Sparkline } from "./Sparkline";

interface Props {
    returns: Record<number, TaxReturn>;
}

export function SummaryStats({ returns }: Props) {
    const [timeUnit, setTimeUnit] = useState<TimeUnit>("daily");

    const years = useMemo(
        () =>
            Object.keys(returns)
                .map(Number)
                .sort((a, b) => a - b),
        [returns],
    );

    const stats = useMemo(() => {
        if (years.length === 0) return null;

        const allReturns = years
            .map((year) => returns[year])
            .filter((r): r is TaxReturn => r !== undefined);

        if (allReturns.length === 0) return null;

        // Sum across all years
        const totalIncome = allReturns.reduce(
            (sum, r) => sum + r.income.total,
            0,
        );
        const totalTaxes = allReturns.reduce(
            (sum, r) => sum + getTotalTax(r),
            0,
        );
        const netIncome = totalIncome - totalTaxes;
        const avgEffectiveRate =
            allReturns.reduce((sum, r) => sum + getEffectiveRate(r), 0) /
            allReturns.length;

        // Hourly rate (2,080 working hours per year: 40 hrs × 52 weeks)
        const hourlyRates = allReturns.map((r) => getNetIncome(r) / 2080);
        const avgHourlyRate =
            hourlyRates.reduce((sum, h) => sum + h, 0) / hourlyRates.length;

        // Per-year values for sparklines
        const incomePerYear = allReturns.map((r) => r.income.total);
        const taxesPerYear = allReturns.map((r) => getTotalTax(r));
        const effectivePerYear = allReturns.map((r) => getEffectiveRate(r));
        const netPerYear = allReturns.map((r) => getNetIncome(r));

        return {
            income: { value: totalIncome, sparkline: incomePerYear },
            taxes: { value: totalTaxes, sparkline: taxesPerYear },
            effective: { value: avgEffectiveRate, sparkline: effectivePerYear },
            net: { value: netIncome, sparkline: netPerYear },
            avgHourlyRate,
        };
    }, [returns, years]);

    if (!stats) {
        return null;
    }

    const timeUnitValue = convertToTimeUnit(stats.avgHourlyRate, timeUnit);

    return (
        <div className="px-6 py-6 shrink-0 border-b border-(--color-border)">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <div className="text-xs text-(--color-text-muted) mb-1">
                        Income
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-semibold tabular-nums tracking-tight">
                            {formatCompact(stats.income.value)}
                        </span>
                        <Sparkline
                            values={stats.income.sparkline}
                            width={48}
                            height={20}
                            className="text-(--color-chart)"
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs text-(--color-text-muted) mb-1">
                        Taxes
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-semibold tabular-nums tracking-tight">
                            {formatCompact(stats.taxes.value)}
                        </span>
                        <Sparkline
                            values={stats.taxes.sparkline}
                            width={48}
                            height={20}
                            className="text-(--color-chart)"
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs text-(--color-text-muted) mb-1">
                        Net
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-semibold tabular-nums tracking-tight">
                            {formatCompact(stats.net.value)}
                        </span>
                        <Sparkline
                            values={stats.net.sparkline}
                            width={48}
                            height={20}
                            className="text-(--color-chart)"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <Menu.Root>
                            <Menu.Trigger className="text-xs text-(--color-text-muted) flex items-center gap-1 hover:text-(--color-text) cursor-pointer">
                                {TIME_UNIT_LABELS[timeUnit]}
                                <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className="opacity-50"
                                >
                                    <path
                                        d="M4 6l4 4 4-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Menu.Trigger>
                            <Menu.Portal>
                                <Menu.Positioner
                                    sideOffset={6}
                                    className="z-50"
                                >
                                    <Menu.Popup className="menu-popup bg-(--color-bg) border border-(--color-border) rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 py-1.5 min-w-[130px] text-sm">
                                        {(
                                            [
                                                "daily",
                                                "hourly",
                                                "minute",
                                                "second",
                                            ] as TimeUnit[]
                                        ).map((unit) => (
                                            <Menu.Item
                                                key={unit}
                                                onClick={() =>
                                                    setTimeUnit(unit)
                                                }
                                                className={`menu-item mx-1.5 px-2.5 py-1.5 cursor-pointer rounded-lg outline-none select-none ${
                                                    timeUnit === unit
                                                        ? "text-(--color-text) font-medium"
                                                        : "text-(--color-text-muted)"
                                                }`}
                                            >
                                                {TIME_UNIT_LABELS[unit]}
                                            </Menu.Item>
                                        ))}
                                    </Menu.Popup>
                                </Menu.Positioner>
                            </Menu.Portal>
                        </Menu.Root>
                        <Tooltip.Root>
                            <Tooltip.Trigger className="text-(--color-text-muted) hover:text-(--color-text)">
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <circle cx="8" cy="8" r="6.5" />
                                    <path
                                        d="M8 7.5V11M8 5.5V5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Positioner sideOffset={6}>
                                    <Tooltip.Popup className="bg-white dark:bg-zinc-800 text-(--color-text) text-xs px-2.5 py-1.5 rounded-lg shadow-lg border border-(--color-border)">
                                        Based on 2080hrs of work per year
                                    </Tooltip.Popup>
                                </Tooltip.Positioner>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </div>
                    <div className="text-2xl font-semibold tabular-nums tracking-tight">
                        {formatTimeUnitValueCompact(timeUnitValue, timeUnit)}
                    </div>
                </div>
            </div>
        </div>
    );
}
