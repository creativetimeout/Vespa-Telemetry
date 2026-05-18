import { useMemo, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	ReferenceArea,
} from "recharts";

const TARGET_POINTS = 500;

function decimate(rows, target = TARGET_POINTS) {
	if (rows.length <= target) return rows;
	const step = Math.ceil(rows.length / target);
	const out = [];
	for (let i = 0; i < rows.length; i += step) out.push(rows[i]);
	if (out[out.length - 1] !== rows[rows.length - 1])
		out.push(rows[rows.length - 1]);
	return out;
}

// Build chart series. When two consecutive samples are further apart than
// `gapMs`, insert a null point so Recharts breaks the line instead of
// interpolating across the inter-trip gap.
function buildSeries(rows, key, gapMs = 60_000) {
	const out = [];
	let lastT = null;
	for (const r of rows) {
		if (!Number.isFinite(r[key]) || !Number.isFinite(r.ts_ms)) continue;
		if (lastT != null && r.ts_ms - lastT > gapMs) {
			out.push({ t: lastT + 1, v: null });
		}
		out.push({ t: r.ts_ms, v: r[key] });
		lastT = r.ts_ms;
	}
	return out;
}

function fmtTimeOfDay(ms, locale) {
	return new Date(ms).toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function fmtDateHour(ms, locale) {
	const d = new Date(ms);
	const date = d.toLocaleDateString(locale, { month: "short", day: "2-digit" });
	const hour = d.toLocaleTimeString(locale, { hour: "2-digit" });
	return `${date} ${hour}`;
}

function fmtDateTime(ms, locale) {
	const d = new Date(ms);
	const date = d.toLocaleDateString(locale, { month: "short", day: "2-digit" });
	const time = d.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${date} ${time}`;
}

const MULTI_DAY_MS = 24 * 60 * 60 * 1000;

function Chart({
	title,
	unit,
	data,
	color,
	yDomain,
	locale,
	multiDay,
	range,
	onMouseMove,
	onMouseLeave,
	onMouseDown,
}) {
	const tickFmt = multiDay ? fmtDateHour : fmtTimeOfDay;
	const tooltipFmt = multiDay ? fmtDateTime : fmtTimeOfDay;
	return (
		<div
			className="select-none rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
			style={{ cursor: "crosshair", touchAction: "none" }}
		>
			<div className="mb-2 flex items-baseline justify-between">
				<h3 className="text-sm font-semibold">{title}</h3>
				<span className="text-xs text-slate-500">{unit}</span>
			</div>
			<div
				style={{ width: "100%", height: 160 }}
				className="[&_*:focus]:outline-none"
			>
				<ResponsiveContainer>
					<LineChart
						data={data}
						margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
						syncId="route-charts"
						onMouseMove={onMouseMove}
						onMouseLeave={onMouseLeave}
						onMouseDown={onMouseDown}
						onTouchStart={onMouseDown}
						onTouchMove={onMouseMove}
					>
						<CartesianGrid strokeDasharray="3 3" opacity={0.2} />
						<XAxis
							dataKey="t"
							type="number"
							domain={["dataMin", "dataMax"]}
							tickFormatter={(t) => tickFmt(t, locale)}
							minTickGap={multiDay ? 40 : 20}
							tick={{ fontSize: 11 }}
							stroke="currentColor"
						/>
						<YAxis
							domain={yDomain ?? ["auto", "auto"]}
							tick={{ fontSize: 11 }}
							stroke="currentColor"
							width={36}
						/>
						<Tooltip
							formatter={(v) => [v?.toFixed?.(1) ?? v, unit]}
							labelFormatter={(t) => tooltipFmt(t, locale)}
							contentStyle={{
								fontSize: 11,
								padding: "4px 6px",
								lineHeight: 1.2,
								opacity: 0.9,
								border: "none",
								borderRadius: 4,
							}}
							labelStyle={{ marginBottom: 0 }}
							itemStyle={{ padding: 0 }}
						/>
						<Line
							type="monotone"
							dataKey="v"
							stroke={color}
							dot={false}
							strokeWidth={1.5}
							isAnimationActive={false}
							connectNulls={false}
						/>
						{range && (
							<ReferenceArea
								x1={range[0]}
								x2={range[1]}
								fill="currentColor"
								fillOpacity={0.12}
								strokeOpacity={0}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export default function TelemetryCharts({
	telemetry,
	points,
	range,
	zoomRange,
	onCursorChange,
	onRangeChange,
	onZoomChange,
}) {
	const { t, i18n } = useTranslation();
	const locale = i18n.resolvedLanguage;

	// Local drag state — keeps the chart visually reactive without forcing
	// parent re-renders (which would re-render all 6 charts mid-drag).
	const [dragRange, setDragRange] = useState(null);
	const dragStart = useRef(null);
	const dragEnd = useRef(null);
	const rafId = useRef(null);

	// Effective range shown on charts (local drag overrides committed range)
	const effectiveRange = dragRange ?? range;

	// Throttle map updates via rAF — call onRangeChange at most once per frame
	function pushRangeToParent(r) {
		if (rafId.current != null) return;
		rafId.current = requestAnimationFrame(() => {
			rafId.current = null;
			onRangeChange?.(r);
		});
	}

	// Global mouseup so dragging ends even when the cursor leaves the chart
	useEffect(() => {
		function onGlobalMouseUp() {
			if (dragStart.current == null) return;
			const start = dragStart.current;
			const end = dragEnd.current ?? start;
			dragStart.current = null;
			dragEnd.current = null;
			const a = Math.min(start, end);
			const b = Math.max(start, end);
			setDragRange(null);
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
				rafId.current = null;
			}
			if (b - a >= 1000) onRangeChange?.([a, b]);
			else onRangeChange?.(null);
		}
		window.addEventListener("mouseup", onGlobalMouseUp);
		window.addEventListener("touchend", onGlobalMouseUp);
		window.addEventListener("touchcancel", onGlobalMouseUp);
		return () => {
			window.removeEventListener("mouseup", onGlobalMouseUp);
			window.removeEventListener("touchend", onGlobalMouseUp);
			window.removeEventListener("touchcancel", onGlobalMouseUp);
		};
	}, [onRangeChange]);

	const visibleTelemetry = useMemo(() => {
		if (!zoomRange) return telemetry;
		return telemetry.filter(
			(r) => r.ts_ms >= zoomRange[0] && r.ts_ms <= zoomRange[1],
		);
	}, [telemetry, zoomRange]);

	const visiblePoints = useMemo(() => {
		if (!zoomRange) return points;
		return points.filter(
			(p) => p.ts_ms >= zoomRange[0] && p.ts_ms <= zoomRange[1],
		);
	}, [points, zoomRange]);

	const charts = useMemo(() => {
		const tel = decimate(visibleTelemetry);
		const p = decimate(visiblePoints);
		return {
			speed: buildSeries(tel, "speed_kmh"),
			rpm: buildSeries(tel, "rpm"),
			throttle: buildSeries(tel, "throttle_pct"),
			elevation: buildSeries(p, "alt"),
			engineTemp: buildSeries(tel, "engine_temp_c"),
			battery: buildSeries(tel, "battery_v"),
		};
	}, [visibleTelemetry, visiblePoints]);

	const multiDay = useMemo(() => {
		const stamps = [];
		if (visibleTelemetry.length) {
			stamps.push(
				visibleTelemetry[0].ts_ms,
				visibleTelemetry[visibleTelemetry.length - 1].ts_ms,
			);
		}
		if (visiblePoints.length) {
			stamps.push(
				visiblePoints[0].ts_ms,
				visiblePoints[visiblePoints.length - 1].ts_ms,
			);
		}
		const finite = stamps.filter(Number.isFinite);
		if (finite.length < 2) return false;
		return Math.max(...finite) - Math.min(...finite) > MULTI_DAY_MS;
	}, [visibleTelemetry, visiblePoints]);

	function handleMouseMove(e) {
		if (!e || e.activeLabel == null) return;
		const ms = Number(e.activeLabel);
		if (!Number.isFinite(ms)) return;
		onCursorChange?.(ms);
		if (dragStart.current != null) {
			dragEnd.current = ms;
			const a = Math.min(dragStart.current, ms);
			const b = Math.max(dragStart.current, ms);
			setDragRange([a, b]);
			pushRangeToParent([a, b]);
		}
	}

	function handleMouseLeave() {
		if (dragStart.current == null) onCursorChange?.(null);
	}

	function handleMouseDown(e) {
		if (!e || e.activeLabel == null) return;
		const ms = Number(e.activeLabel);
		if (!Number.isFinite(ms)) return;
		dragStart.current = ms;
		dragEnd.current = ms;
		setDragRange([ms, ms]);
		onRangeChange?.(null);
	}

	const chartProps = {
		range: effectiveRange,
		locale,
		multiDay,
		onMouseMove: handleMouseMove,
		onMouseLeave: handleMouseLeave,
		onMouseDown: handleMouseDown,
	};

	const rangeEqualsZoom =
		range &&
		zoomRange &&
		range[0] === zoomRange[0] &&
		range[1] === zoomRange[1];
	const canZoom = !!(range && !rangeEqualsZoom && onZoomChange);
	const canReset = !!(zoomRange && onZoomChange);

	function handleZoomIn() {
		if (!range) return;
		onZoomChange?.([range[0], range[1]]);
	}

	function handleResetZoom() {
		onZoomChange?.(null);
	}

	return (
		<div className="space-y-3">
			{(canZoom || canReset) && (
				<div className="flex items-center justify-end gap-2">
					{canZoom && (
						<button
							type="button"
							onClick={handleZoomIn}
							className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
						>
							{t("charts.zoomIn")}
						</button>
					)}
					{canReset && (
						<button
							type="button"
							onClick={handleResetZoom}
							className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
						>
							{t("charts.resetZoom")}
						</button>
					)}
				</div>
			)}
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
			<Chart
				title={t("charts.speed")}
				unit="km/h"
				data={charts.speed}
				color="#0ea5e9"
				yDomain={[0, "auto"]}
				{...chartProps}
			/>
			<Chart
				title={t("charts.elevation")}
				unit="m"
				data={charts.elevation}
				color="#10b981"
				{...chartProps}
			/>
			<Chart
				title={t("charts.rpm")}
				unit="rpm"
				data={charts.rpm}
				color="#a855f7"
				yDomain={[0, "auto"]}
				{...chartProps}
			/>
			<Chart
				title={t("charts.throttle")}
				unit="%"
				data={charts.throttle}
				color="#f59e0b"
				yDomain={[0, 100]}
				{...chartProps}
			/>
			<Chart
				title={t("charts.engineTemp")}
				unit="°C"
				data={charts.engineTemp}
				color="#ef4444"
				{...chartProps}
			/>
			<Chart
				title={t("charts.battery")}
				unit="V"
				data={charts.battery}
				color="#6366f1"
				{...chartProps}
			/>
			</div>
		</div>
	);
}
