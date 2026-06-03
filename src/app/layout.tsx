import type { Metadata, Viewport } from "next";
import {
  Inter,
  Amiri,
  Amiri_Quran,
  Scheherazade_New,
  Noto_Naskh_Arabic,
} from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import "@/styles/al-quran.css";
import { themeInitScript } from "@/components/theme/theme";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { DEFAULT_LANG, LANGS, type Lang } from "@/lib/i18n/strings";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { pwaCaptureScript } from "@/components/pwa/pwa-capture";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
});
const amiriQuran = Amiri_Quran({
  weight: "400",
  subsets: ["arabic"],
  variable: "--font-amiri-quran",
});
const scheherazade = Scheherazade_New({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  variable: "--font-scheherazade",
});
const notoNaskh = Noto_Naskh_Arabic({
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
  variable: "--font-naskh",
});

export const metadata: Metadata = {
  applicationName: "Quran App",
  title: "Quran App — Read, Listen & Learn the Qur'an",
  description:
    "Read the Qur'an with a beautiful Mushaf, word-by-word audio recitation, translations (Amharic, Afaan Oromo, Somali, English), bookmarks, and reading progress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Quran App",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f5d3f" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1310" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("appLang")?.value;
  const lang: Lang = LANGS.some((l) => l.code === rawLang)
    ? (rawLang as Lang)
    : DEFAULT_LANG;

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${amiri.variable} ${amiriQuran.variable} ${scheherazade.variable} ${notoNaskh.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Capture the install prompt as early as possible. */}
        <script dangerouslySetInnerHTML={{ __html: pwaCaptureScript }} />
      </head>
      <body
        className="min-h-screen bg-background bg-pattern text-foreground flex flex-col font-sans"
        suppressHydrationWarning
      >
        <I18nProvider initialLang={lang}>
          <main className="flex-1 w-full">{children}</main>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
