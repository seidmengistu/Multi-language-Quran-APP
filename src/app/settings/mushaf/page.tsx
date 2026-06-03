"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_MUSHAF, MUSHAFS, type MushafId } from "@/lib/mushafs";

export default function MushafSettingsPage() {
  const [selected, setSelected] = useState<MushafId>(DEFAULT_MUSHAF);

  useEffect(() => {
    const m = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("mushafId="))
      ?.split("=")[1] as MushafId | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from cookie after mount
    if (m && MUSHAFS.some((x) => x.id === m)) setSelected(m);
  }, []);

  const choose = async (id: MushafId) => {
    setSelected(id);
    await fetch("/api/mushaf/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mushafId: id }),
    });
  };

  return (
    <div className="aq-screen">
      <div className="aq-topbar">
        <Link className="aq-icon-btn" href="/settings" aria-label="Back">
          ‹
        </Link>
        <div className="aq-topbar-title">Mushaf</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: "10px 12px 20px" }}>
        <div className="aq-list">
          {MUSHAFS.map((m) => (
            <label key={m.id} className="aq-row" style={{ cursor: "pointer" }}>
              <input
                type="radio"
                name="mushaf"
                checked={selected === m.id}
                onChange={() => choose(m.id)}
              />
              <div className="aq-row-main">
                <div className="aq-row-title">{m.title}</div>
                <div className="aq-row-sub">{m.subtitle || (m.sizeHint ? `Download? (${m.sizeHint})` : "")}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

