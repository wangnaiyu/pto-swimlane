// Occupied-time union over the entire trace window. Source times are not changed.
export function intervalUtilization(events: any[], minTime: number, maxTime: number): number | null {
  const range = maxTime - minTime;
  if (!Number.isFinite(range) || range <= 0) return null;
  const intervals = events.filter(e => Number.isFinite(e.startTime) && Number.isFinite(e.endTime) && e.endTime >= e.startTime)
    .map(e => [Math.max(minTime, e.startTime), Math.min(maxTime, e.endTime)])
    .filter(([start,end]) => end >= start).sort((a,b) => a[0]-b[0]);
  if (!intervals.length) return events.length ? null : 0;
  let total = 0, start = intervals[0][0], end = intervals[0][1];
  for (const [a,b] of intervals.slice(1)) { if (a <= end) end = Math.max(end,b); else {total += end-start;start=a;end=b;} }
  return Math.max(0,Math.min(100,(total+end-start)/range*100));
}
export function formatUtilization(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '\u6682\u65e0\u6570\u636e' : `${Number(value.toFixed(2))}%`;
}
