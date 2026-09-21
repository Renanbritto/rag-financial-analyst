import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const comfortaa = Comfortaa({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RAG Financial Analyst",
  description: "Sistema RAG Full-Stack para análise financeira com IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${comfortaa.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
