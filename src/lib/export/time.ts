/** Formats seconds as SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTime(totalSeconds: number): string {
  return formatTime(totalSeconds, ",");
}

/** Formats seconds as VTT timestamp: HH:MM:SS.mmm */
export function formatVttTime(totalSeconds: number): string {
  return formatTime(totalSeconds, ".");
}

function formatTime(totalSeconds: number, msSeparator: "," | "."): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);

  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${msSeparator}${pad(millis, 3)}`;
}
