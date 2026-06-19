import { useEffect, useRef } from "react";
import type { MissionSnapshot, ThemeMode } from "../mission";

export function useCanvasChart(snapshot: MissionSnapshot, theme: ThemeMode) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);

    const labelColor = theme === "light" ? "#18181b" : "#cbd5e1";
    context.strokeStyle = theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = (height / 4) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const series = snapshot.chart.series;
    const allValues = series.flatMap((item) => item.values);
    if (allValues.length === 0) {
      context.fillStyle = labelColor;
      context.font = `${12 * window.devicePixelRatio}px monospace`;
      context.fillText("Waiting for live chart data", 24 * window.devicePixelRatio, height / 2);
      return;
    }

    const max = Math.max(...allValues, 1);
    series.forEach((item, seriesIndex) => {
      context.strokeStyle = item.color ?? (seriesIndex === 0 ? "#10b981" : "#6366f1");
      context.lineWidth = 3 * window.devicePixelRatio;
      context.beginPath();
      item.values.forEach((value, index) => {
        const x = (width / Math.max(item.values.length - 1, 1)) * index;
        const y = height - (value / max) * (height - 32 * window.devicePixelRatio) - 16 * window.devicePixelRatio;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    });
  }, [snapshot.chart, theme]);

  return canvasRef;
}
