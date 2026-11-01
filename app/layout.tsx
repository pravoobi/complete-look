import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Complete Look",
  description: "Other try-ons show you a dress. Complete Look shows you the whole outfit, in colours chosen for your skin tone, on you.",
};

export const viewport: Viewport = { themeColor: "#faf6f0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl text-[var(--accent)]">
            Complete Look
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/#samples">Samples</Link>
            <Link href="/try" className="rounded-full bg-[var(--accent)] px-3 py-1 text-white">
              Try yours
            </Link>
          </div>
        </nav>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-[var(--muted)]">
          Built on YouCam APIs (Perfect Corp) for the YouCam API Skin AI &amp; eCommerce VTO Hackathon. Sample people and products are AI-generated.
        </footer>
      </body>
    </html>
  );
}
