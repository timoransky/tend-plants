import type { PlantWithStatus } from "@/lib/plants";
import { CARE_STATUS_RANK, type CareStatus } from "@/lib/status";

export type CareKind = "water" | "feed";

/** A single actionable care item shown on the home timeline. Fully plain/
 * serializable so it can be passed from the server page into the client
 * bottom-sheet component. */
export type CareTask = {
  id: string;
  plantId: string;
  plantName: string;
  room: string | null;
  avatar: string | null;
  kind: CareKind;
  status: CareStatus;
  dueAt: string | null;
  note: string | null;
};

const VERB: Record<CareKind, string> = { water: "Water", feed: "Feed" };

export function taskTitle(task: CareTask): string {
  return `${VERB[task.kind]} ${task.plantName}`;
}

/**
 * Flatten plants into care tasks. "Fine" and unscheduled care produce no task —
 * the timeline only lists things that actually need doing soon. Sorted by
 * urgency, then by due date.
 */
export function buildTasks(plants: PlantWithStatus[]): CareTask[] {
  const tasks: CareTask[] = [];

  for (const p of plants) {
    for (const kind of ["water", "feed"] as const) {
      const care = p[kind];
      if (care.status == null || care.status === "fine") continue;
      tasks.push({
        id: `${p.id}:${kind}`,
        plantId: p.id,
        plantName: p.name,
        room: p.room,
        avatar: p.avatar,
        kind,
        status: care.status,
        dueAt: care.dueAt,
        note: kind === "water" ? p.waterNote : p.feedNote,
      });
    }
  }

  return tasks.sort((a, b) => {
    const rank = CARE_STATUS_RANK[a.status] - CARE_STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    // Earlier due date first; nulls (never done) sort first.
    const at = a.dueAt ? Date.parse(a.dueAt) : -Infinity;
    const bt = b.dueAt ? Date.parse(b.dueAt) : -Infinity;
    return at - bt;
  });
}

/** Tasks that need attention now (overdue or due today). */
export function isToday(task: CareTask): boolean {
  return task.status === "overdue" || task.status === "due_today";
}
