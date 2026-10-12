import type { Metadata } from "next";
import { Comfortaa, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
  title: "RN Intelligence • Copilot de Auditoria DRE & Financial RAG",
  description: "RN Intelligence com Skill de Análise Financeira & FP&A. Ingestão de DREs em PDF, Memória Vetorial Qdrant e Google Gemini.",
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
