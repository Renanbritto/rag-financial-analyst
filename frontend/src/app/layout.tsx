import type { Metadata, Viewport } from "next";
import { Comfortaa, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#090d16",
};

const comfortaa = Comfortaa({ 
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rag-financial-analyst.vercel.app"),
  title: "RN Intelligence • Copilot de Auditoria DRE & Financial RAG",
  description: "Copilot corporativo de FP&A e Auditoria Contábil com tecnologia RAG. Ingestão de DREs em PDF, memória vetorial Qdrant e Google Gemini.",
  keywords: [
    "RN Intelligence",
    "Auditoria Contábil",
    "FP&A Copilot",
    "DRE Consolidada",
    "RAG",
    "Qdrant Vector DB",
    "EBITDA",
    "Análise Financeira",
    "Renan Nocelli"
  ],
  authors: [{ name: "Renan Britto Nocelli", url: "https://renan-nocelli.vercel.app" }],
  creator: "Renan Britto Nocelli",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://rag-financial-analyst.vercel.app",
    title: "RN Intelligence • Copilot de Auditoria DRE & Financial RAG",
    description: "Auditoria contábil de demonstrativos (DRE / Balanço), cálculo de margens e conciliação com memória vetorial Qdrant e citação direta.",
    siteName: "RN Intelligence",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "RN Intelligence • Financial Copilot & Auditoria Contábil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RN Intelligence • Copilot de Auditoria DRE & Financial RAG",
    description: "Auditoria analítica de demonstrativos contábeis, cálculo de margem EBITDA e reconciliação com RAG vetorial.",
    images: ["/og-image.jpg"],
    creator: "@renanbritto",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${comfortaa.variable} ${jetbrainsMono.variable} font-sans bg-[#090d16] text-zinc-100 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
