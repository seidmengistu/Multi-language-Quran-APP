export type MushafId = "1" | "2" | "3";

export interface MushafOption {
  id: MushafId;
  title: string;
  subtitle: string;
  sizeHint: string;
  className: string;
  theme: {
    primary: string;
    secondary: string;
    background: string;
    border: string;
  };
}

export const MUSHAFS: MushafOption[] = [
  {
    id: "1",
    title: "Madani Mushaf (1441)",
    subtitle: "Downloaded",
    sizeHint: "",
    className: "mushaf-madani",
    theme: {
      primary: "#1b7a3d",
      secondary: "#27ae60",
      background: "#fefcf3",
      border: "#b4a078",
    },
  },
  {
    id: "2",
    title: "Classic Madani Mushaf",
    subtitle: "Downloaded",
    sizeHint: "",
    className: "mushaf-classic",
    theme: {
      primary: "#2c3e50",
      secondary: "#34495e",
      background: "#fdf8e6",
      border: "#9c8c6d",
    },
  },
  {
    id: "3",
    title: "Naskh (Indopak)",
    subtitle: "Downloaded",
    sizeHint: "",
    className: "mushaf-indopak",
    theme: {
      primary: "#1a1a1a",
      secondary: "#333333",
      background: "#ffffff",
      border: "#cccccc",
    },
  },
];

export const DEFAULT_MUSHAF: MushafId = "1";

