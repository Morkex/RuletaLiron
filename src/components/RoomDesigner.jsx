import { useCallback, useEffect, useRef, useState } from "react";
import {
  TABLE_COLORS,
  createTable,
  emptyRoomLayout,
  seatsForTable,
  uid,
} from "../lib/roomLayout";
import { shortPlayerName } from "../lib/shortName";

function ChairIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5h1.5a1.5 1.5 0 0 1 0 3H18v6h-2v-3H8v3H6v-6H4.5a1.5 1.5 0 0 1 0-3H6V5zm2 0v5h6V5H9z"
      />
    </svg>
  );
}

/**
 * Lienzo de sala: modo diseño (editar) o vista (nombres en sillas).
 */
export default function RoomDesigner({
  layout,
  onChange,
  editable = false,
  seatPlayers = {},
  tableLabels = {},
  presentation = false,
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("select"); // select | add-table | add-seat
  const [selectedId, setSelectedId] = useState(null);
  const [selectedKind, setSelectedKind] = useState(null); // table | seat
  const [color, setColor] = useState(TABLE_COLORS[2].value);
  const dragRef = useRef(null);

  const selectedTable =
    selectedKind === "table"
      ? layout.tables.find((t) => t.id === selectedId)
      : null;

  const peerNames = Object.values(seatPlayers || {}).filter(Boolean);

  const clientToPct = useCallback((clientX, clientY) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    };
  }, []);

  const patchLayout = (next) => {
    onChange?.(typeof next === "function" ? next(layout) : next);
  };

  const onPointerDownCanvas = (e) => {
    if (!editable) return;
    if (e.target !== canvasRef.current && !e.target.dataset?.canvasBg) return;

    if (tool === "add-table") {
      const { x, y } = clientToPct(e.clientX, e.clientY);
      const { table, seats } = createTable({
        x: Math.max(0, x - 7),
        y: Math.max(0, y - 13),
        w: 14,
        h: 26,
        color,
        label: `Mesa ${layout.tables.length + 1}`,
        seatCount: 4,
      });
      patchLayout({
        tables: [...layout.tables, table],
        seats: [...layout.seats, ...seats],
      });
      setSelectedId(table.id);
      setSelectedKind("table");
      setTool("select");
      return;
    }

    setSelectedId(null);
    setSelectedKind(null);
  };

  const startDragTable = (e, table, mode = "move") => {
    if (!editable || tool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(table.id);
    setSelectedKind("table");
    const start = clientToPct(e.clientX, e.clientY);
    dragRef.current = {
      kind: "table",
      mode,
      id: table.id,
      startX: start.x,
      startY: start.y,
      orig: { ...table },
      origSeats: layout.seats
        .filter((s) => s.tableId === table.id)
        .map((s) => ({ ...s })),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const startDragSeat = (e, seat) => {
    if (!editable || tool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(seat.id);
    setSelectedKind("seat");
    const start = clientToPct(e.clientX, e.clientY);
    dragRef.current = {
      kind: "seat",
      id: seat.id,
      startX: start.x,
      startY: start.y,
      orig: { ...seat },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || !editable) return;
    const cur = clientToPct(e.clientX, e.clientY);
    const dx = cur.x - drag.startX;
    const dy = cur.y - drag.startY;

    if (drag.kind === "table") {
      if (drag.mode === "move") {
        patchLayout((prev) => ({
          ...prev,
          tables: prev.tables.map((t) => {
            if (t.id !== drag.id) return t;
            return {
              ...t,
              x: clamp(drag.orig.x + dx, 0, 100 - t.w),
              y: clamp(drag.orig.y + dy, 0, 100 - t.h),
            };
          }),
          seats: prev.seats.map((s) => {
            const o = drag.origSeats?.find((os) => os.id === s.id);
            if (!o) return s;
            return {
              ...s,
              x: clamp(o.x + dx, 0, 100),
              y: clamp(o.y + dy, 0, 100),
            };
          }),
        }));
      } else {
        patchLayout((prev) => ({
          ...prev,
          tables: prev.tables.map((t) =>
            t.id !== drag.id
              ? t
              : {
                  ...t,
                  w: clamp(drag.orig.w + dx, 10, 90),
                  h: clamp(drag.orig.h + dy, 12, 90),
                },
          ),
        }));
      }
    } else if (drag.kind === "seat") {
      patchLayout((prev) => ({
        ...prev,
        seats: prev.seats.map((s) =>
          s.id === drag.id
            ? {
                ...s,
                x: clamp(drag.orig.x + dx, 0, 100),
                y: clamp(drag.orig.y + dy, 0, 100),
              }
            : s,
        ),
      }));
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    if (!editable) return;
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [editable]);

  const addSeatToSelected = () => {
    if (!selectedTable) return;
    const seats = seatsForTable(layout, selectedTable.id);
    const side = seats.length % 2 === 0 ? "left" : "right";
    const t = selectedTable;
    patchLayout({
      ...layout,
      seats: [
        ...layout.seats,
        {
          id: uid("seat"),
          tableId: t.id,
          x: side === "left" ? t.x : t.x + t.w,
          y: t.y + t.h * (0.25 + (seats.length % 4) * 0.15),
        },
      ],
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (selectedKind === "table") {
      patchLayout({
        tables: layout.tables.filter((t) => t.id !== selectedId),
        seats: layout.seats.filter((s) => s.tableId !== selectedId),
      });
    } else if (selectedKind === "seat") {
      patchLayout({
        ...layout,
        seats: layout.seats.filter((s) => s.id !== selectedId),
      });
    }
    setSelectedId(null);
    setSelectedKind(null);
  };

  const updateSelectedColor = (c) => {
    setColor(c);
    if (selectedKind === "table" && selectedId) {
      patchLayout({
        ...layout,
        tables: layout.tables.map((t) =>
          t.id === selectedId ? { ...t, color: c } : t,
        ),
      });
    }
  };

  const renameSelected = (label) => {
    if (selectedKind !== "table" || !selectedId) return;
    patchLayout({
      ...layout,
      tables: layout.tables.map((t) =>
        t.id === selectedId ? { ...t, label } : t,
      ),
    });
  };

  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <ToolBtn active={tool === "select"} onClick={() => setTool("select")}>
            Mover
          </ToolBtn>
          <ToolBtn
            active={tool === "add-table"}
            onClick={() => setTool("add-table")}
          >
            + Mesa
          </ToolBtn>
          <ToolBtn
            active={false}
            onClick={addSeatToSelected}
            disabled={!selectedTable}
          >
            + Silla
          </ToolBtn>
          <ToolBtn
            active={false}
            onClick={deleteSelected}
            disabled={!selectedId}
            danger
          >
            Eliminar
          </ToolBtn>
          <div className="mx-1 h-6 w-px bg-mtg-gold/20" />
          <div className="flex flex-wrap gap-1">
            {TABLE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => updateSelectedColor(c.value)}
                className={`h-7 w-7 rounded-md border-2 transition ${
                  color === c.value || selectedTable?.color === c.value
                    ? "border-mtg-gold scale-110"
                    : "border-white/20"
                }`}
                style={{ background: c.value }}
              />
            ))}
          </div>
          {selectedTable && (
            <input
              type="text"
              value={selectedTable.label}
              onChange={(e) => renameSelected(e.target.value)}
              placeholder="Nombre mesa"
              className="ml-auto w-36 rounded-md border border-mtg-gold/25 bg-mtg-void/70 px-2 py-1 text-xs outline-none focus:border-mtg-gold/60"
            />
          )}
          <button
            type="button"
            className="btn-ghost rounded-md px-2 py-1 text-xs text-mtg-mana-r"
            onClick={() => onChange?.(emptyRoomLayout())}
          >
            Vaciar plano
          </button>
        </div>
      )}

      <div
        ref={canvasRef}
        data-canvas-bg="1"
        role="img"
        aria-label="Plano de la sala"
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative w-full overflow-hidden rounded-xl border border-mtg-gold/30 ${
          presentation ? "aspect-[16/9] min-h-[70vh]" : "aspect-[16/10]"
        } ${
          editable && tool === "add-table" ? "cursor-crosshair" : "cursor-default"
        }`}
        style={{
          background: `
            linear-gradient(180deg, rgba(14,28,22,0.92), rgba(8,16,14,0.96)),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 24px,
              rgba(201,168,76,0.04) 24px,
              rgba(201,168,76,0.04) 25px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 24px,
              rgba(201,168,76,0.04) 24px,
              rgba(201,168,76,0.04) 25px
            )
          `,
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
        }}
      >
        {!presentation && (
          <p className="pointer-events-none absolute left-3 top-2 font-display text-[10px] uppercase tracking-[0.2em] text-mtg-gold/35">
            Plano de sala
          </p>
        )}

        {layout.tables.map((table) => {
          const selected =
            selectedKind === "table" && selectedId === table.id;
          const label =
            tableLabels[table.id] || table.label || "";
          return (
            <div
              key={table.id}
              onPointerDown={(e) => startDragTable(e, table, "move")}
              className={`absolute rounded-lg transition-shadow ${
                editable ? "cursor-grab active:cursor-grabbing" : ""
              } ${selected ? "ring-2 ring-mtg-gold ring-offset-2 ring-offset-transparent" : ""}`}
              style={{
                left: `${table.x}%`,
                top: `${table.y}%`,
                width: `${table.w}%`,
                height: `${table.h}%`,
                background: `
                  linear-gradient(145deg, rgba(255,255,255,0.12), transparent 40%),
                  ${table.color}
                `,
                boxShadow: `
                  0 10px 28px rgba(0,0,0,0.45),
                  inset 0 0 0 2px rgba(201,168,76,0.25),
                  inset 0 -8px 20px rgba(0,0,0,0.35)
                `,
              }}
            >
              {label && (
                <span
                  className={`absolute left-1/2 top-1.5 max-w-[94%] -translate-x-1/2 truncate rounded bg-black/55 text-center font-display font-semibold uppercase tracking-wide text-mtg-frost ${
                    presentation
                      ? "px-2 py-1 text-sm md:px-2.5 md:py-1 md:text-base"
                      : "px-1.5 py-0.5 text-xs md:text-sm"
                  }`}
                >
                  {label}
                </span>
              )}
              {editable && selected && (
                <button
                  type="button"
                  aria-label="Redimensionar"
                  onPointerDown={(e) => startDragTable(e, table, "resize")}
                  className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/3 translate-y-1/3 cursor-se-resize rounded-sm border border-mtg-gold bg-mtg-gold-bright"
                />
              )}
            </div>
          );
        })}

        {layout.seats.map((seat) => {
          const player = seatPlayers[seat.id];
          const selected =
            selectedKind === "seat" && selectedId === seat.id;
          return (
            <div
              key={seat.id}
              title={player || (editable ? "Silla" : "Vacío")}
              onPointerDown={(e) => {
                if (editable && tool === "select") startDragSeat(e, seat);
                else e.stopPropagation();
              }}
              className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
                editable && tool === "select"
                  ? "cursor-grab active:cursor-grabbing"
                  : ""
              }`}
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 shadow-lg ${
                  presentation
                    ? "h-11 w-11 md:h-14 md:w-14"
                    : "h-8 w-8 md:h-9 md:w-9"
                } ${
                  player
                    ? "border-mtg-gold bg-mtg-brand text-mtg-gold-bright"
                    : "border-rose-400/80 bg-mtg-frost text-mtg-ink"
                } ${selected ? "ring-2 ring-mtg-gold-bright" : ""}`}
              >
                <ChairIcon
                  className={
                    presentation
                      ? "h-5 w-5 md:h-6 md:w-6"
                      : "h-3.5 w-3.5 md:h-4 md:w-4"
                  }
                />
              </div>
              {player && (
                <span
                  className={`mt-0.5 truncate rounded-md border border-mtg-gold/35 bg-mtg-ink/95 text-center font-bold leading-tight text-mtg-frost shadow-md ${
                    presentation
                      ? "max-w-[160px] px-2.5 py-1 text-sm md:max-w-[200px] md:text-base"
                      : "max-w-[120px] px-2 py-0.5 text-xs md:max-w-[150px] md:text-sm"
                  }`}
                  title={player}
                >
                  {shortPlayerName(player, peerNames)}
                </span>
              )}
            </div>
          );
        })}

        {layout.tables.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-mtg-frost/40">
            {editable
              ? "Pulsa «+ Mesa» y haz clic en el plano para colocar mesas"
              : "Todavía no hay plano de sala"}
          </p>
        )}
      </div>

      {editable && (
        <p className="text-xs text-mtg-frost/45">
          {tool === "add-table"
            ? "Haz clic en el plano para colocar una mesa (se crean 4 sillas)."
            : "Arrastra mesas y sillas. Selecciona una mesa para añadir sillas o cambiar color."}{" "}
          Capacidad:{" "}
          <strong className="text-mtg-gold">{layout.seats.length}</strong> sillas
          en{" "}
          <strong className="text-mtg-gold">{layout.tables.length}</strong> mesas.
        </p>
      )}
    </div>
  );
}

function ToolBtn({ active, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1.5 text-xs transition disabled:opacity-40 ${
        active
          ? "bg-mtg-gold/25 text-mtg-gold-bright ring-1 ring-mtg-gold/50"
          : danger
            ? "text-mtg-mana-r hover:bg-mtg-mana-r/15"
            : "btn-ghost"
      }`}
    >
      {children}
    </button>
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
