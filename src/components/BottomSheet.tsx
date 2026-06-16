"use client";

import { useMemo, useState } from "react";

import { KIND_BG, KIND_TEXT, STATUS_LABEL } from "@/lib/care-display";
import { isToday, taskTitle, type CareTask } from "@/lib/tasks";

type Tab = "today" | "upcoming";

function KindIcon({ kind }: { kind: CareTask["kind"] }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${KIND_BG[kind]}`}
      aria-hidden="true"
    >
      {kind === "water" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21v-6m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c0-3 2-5 5-5 0 3-2 5-5 5Z" />
        </svg>
      )}
    </span>
  );
}

function TaskRow({ task }: { task: CareTask }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
      <KindIcon kind={task.kind} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-ink">
          {taskTitle(task)}
        </span>
        <span className="truncate text-xs text-ink-soft">
          {task.note ?? task.room ?? ""}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium ${KIND_TEXT[task.kind]}`}
      >
        {STATUS_LABEL[task.status]}
      </span>
    </li>
  );
}

/**
 * The home bottom sheet: Today / Upcoming tabs + search over the household's
 * care timeline. (Drag-to-expand and the mark-done check-off animation come in
 * later steps; this renders the live, ordered task list.)
 */
export function BottomSheet({ tasks }: { tasks: CareTask[] }) {
  const [tab, setTab] = useState<Tab>("today");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const inTab = tab === "today" ? isToday(t) : t.status === "upcoming";
      if (!inTab) return false;
      if (!needle) return true;
      return t.plantName.toLowerCase().includes(needle);
    });
  }, [tasks, tab, query]);

  const todayCount = tasks.filter(isToday).length;
  const upcomingCount = tasks.filter((t) => t.status === "upcoming").length;

  return (
    <section className="flex min-h-0 flex-col rounded-t-3xl bg-surface text-ink shadow-2xl shadow-black/30">
      <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink/15" />

      <div className="flex items-center gap-2 px-4 pt-3">
        <TabButton active={tab === "today"} onClick={() => setTab("today")}>
          Today
          <Count n={todayCount} active={tab === "today"} />
        </TabButton>
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        >
          Upcoming
          <Count n={upcomingCount} active={tab === "upcoming"} />
        </TabButton>
      </div>

      <div className="px-4 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants…"
          className="w-full rounded-xl bg-surface-muted px-3 py-2 text-sm text-ink placeholder:text-ink-soft outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
        />
      </div>

      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {visible.length === 0 ? (
          <li className="px-2 py-10 text-center text-sm text-ink-soft">
            {tab === "today"
              ? "Nothing due today — everything's happy. 🌿"
              : "Nothing coming up in the next couple of days."}
          </li>
        ) : (
          visible.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </ul>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink text-surface" : "text-ink-soft hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  if (n === 0) return null;
  return (
    <span
      className={`rounded-full px-1.5 text-xs ${
        active ? "bg-surface/25 text-surface" : "bg-ink/10 text-ink-soft"
      }`}
    >
      {n}
    </span>
  );
}
