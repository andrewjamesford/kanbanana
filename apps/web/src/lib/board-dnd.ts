import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

export const boardCollisions: CollisionDetection = (args) => {
  const columnDrag = args.active.data.current?.kind === "column";
  const droppableContainers = args.droppableContainers.filter((container) => {
    const data = container.data.current;
    if (columnDrag) return data?.kind === "column";
    if (data?.kind === "column") return false;
    // Keyboard collisions should target cards, or the drop area of an empty column.
    return (
      args.pointerCoordinates || data?.kind === "card" || data?.cardCount === 0
    );
  });
  const filtered = { ...args, droppableContainers };
  const hits = pointerWithin(filtered);
  const cardHits = hits.filter(
    (hit) =>
      droppableContainers.find((container) => container.id === hit.id)?.data
        .current?.kind === "card",
  );
  return cardHits.length
    ? cardHits
    : hits.length
      ? hits
      : closestCenter(filtered);
};

// Nested columns and cards need different keyboard targets. A column must never
// snap to one of its cards, and a card must not snap to its containing column.
export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context },
) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code))
    return;
  event.preventDefault();
  const { active, over, collisionRect, droppableContainers, droppableRects } =
    context;
  if (!active || !collisionRect) return;
  const columnDrag = active.data.current?.kind === "column";
  const horizontal = event.code === "ArrowLeft" || event.code === "ArrowRight";
  if (columnDrag && !horizontal) return;
  const currentColumn =
    over?.data.current?.columnId ?? active.data.current?.columnId;
  const candidates = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      if (container.id === (over?.id ?? active.id)) return [];
      const data = container.data.current;
      if (
        columnDrag
          ? data?.kind !== "column"
          : data?.kind !== "card" &&
            !(data?.kind === "drop" && data.cardCount === 0)
      )
        return [];
      if (!columnDrag && !horizontal && data?.columnId !== currentColumn)
        return [];
      const rect = droppableRects.get(container.id);
      if (!rect) return [];
      const dx = rect.left - collisionRect.left;
      const dy = rect.top - collisionRect.top;
      const delta = horizontal ? dx : dy;
      const direction =
        event.code === "ArrowLeft" || event.code === "ArrowUp" ? -1 : 1;
      if (delta * direction <= 1) return [];
      return [
        {
          rect,
          distance: Math.abs(delta) * 1000 + Math.abs(horizontal ? dy : dx),
        },
      ];
    })
    .sort((a, b) => a.distance - b.distance);
  const target = candidates[0]?.rect;
  return target ? { x: target.left, y: target.top } : undefined;
};
