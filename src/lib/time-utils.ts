export function getCurrentTime(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function isTimeInRange(
  currentTime: string,
  startTime: string,
  _endTime: string
): boolean {
  return currentTime >= startTime;
}

export type ChecklistWithItems = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  items: {
    id: string;
    title: string;
    description: string | null;
    requiresPhoto: boolean;
    sortOrder: number;
    completed?: boolean;
    photoUrl?: string | null;
  }[];
};

export function getActiveChecklists(
  checklists: ChecklistWithItems[],
  currentTime: string
): ChecklistWithItems[] {
  return checklists
    .filter((c) => currentTime >= c.startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function calculateProgress(
  checklists: ChecklistWithItems[],
  completedCount: number
): number {
  const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
  if (totalItems === 0) return 0;
  return Math.round((completedCount / totalItems) * 100);
}
