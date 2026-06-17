import type { PlantWithStatus } from "@/lib/plants";

export type RoomGroup = {
  key: string;
  room: string | null;
  plants: PlantWithStatus[];
};

const NULL_KEY = "__no_room__";

/**
 * Group urgency-sorted plants by room, preserving first-seen room order — so the
 * room holding the most-urgent plant floats to the top (a free stand-in for the
 * old "what needs care" drawer). Plants with no room form a single trailing
 * group (`room: null`, shown as "Everywhere else").
 */
export function groupByRoom(plants: PlantWithStatus[]): RoomGroup[] {
  const byRoom = new Map<string, PlantWithStatus[]>();
  for (const plant of plants) {
    const key = plant.room ?? NULL_KEY;
    const existing = byRoom.get(key);
    if (existing) existing.push(plant);
    else byRoom.set(key, [plant]);
  }

  const groups: RoomGroup[] = [];
  for (const [key, ps] of byRoom) {
    if (key !== NULL_KEY) groups.push({ key, room: key, plants: ps });
  }
  const noRoom = byRoom.get(NULL_KEY);
  if (noRoom) groups.push({ key: NULL_KEY, room: null, plants: noRoom });
  return groups;
}
