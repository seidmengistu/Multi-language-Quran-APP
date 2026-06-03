"use client";

import { RECITERS, Reciter } from "@/lib/reciters";
import { useT } from "@/lib/i18n/I18nProvider";

interface ReciterPickerProps {
  currentReciter: Reciter;
  onSelect: (reciter: Reciter) => void;
  onClose: () => void;
}

export function ReciterPicker({ currentReciter, onSelect, onClose }: ReciterPickerProps) {
  const t = useT();
  // Group reciters by unique name (some have multiple styles)
  const grouped = RECITERS.reduce<Record<string, Reciter[]>>((acc, r) => {
    const key = r.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="reciter-overlay" onClick={onClose}>
      <div className="reciter-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reciter-modal-header">
          <h2>{t("reciter.choose")}</h2>
          <button onClick={onClose} className="reciter-close-btn" aria-label="Close">✕</button>
        </div>

        {/* Reciter List */}
        <div className="reciter-list">
          {Object.entries(grouped).map(([name, variants]) => (
            <div key={name} className="reciter-group">
              {variants.map((reciter) => {
                const isActive = reciter.id === currentReciter.id;
                return (
                  <button
                    key={reciter.id}
                    className={`reciter-item ${isActive ? "reciter-item-active" : ""}`}
                    onClick={() => {
                      onSelect(reciter);
                      onClose();
                    }}
                  >
                    <div className="reciter-item-info">
                      <span className="reciter-item-name">{reciter.name}</span>
                      <span className="reciter-item-arabic">{reciter.arabicName}</span>
                    </div>
                    <div className="reciter-item-meta">
                      <span className="reciter-item-style">{reciter.style}</span>
                      {isActive && <span className="reciter-item-check">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
