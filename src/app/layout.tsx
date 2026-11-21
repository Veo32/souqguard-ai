import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/contexts/language-context";

export const metadata: Metadata = {
  title: "SouqGuard AI | حارس السوق — Visual Search & Policy Compliance Copilot",
  description:
    "Multimodal AI copilot for e-commerce trust — search listings by image or text and enforce marketplace policies automatically. مساعد ذكي متعدد الوسائط لثقة المتاجر: ابحث في الإعلانات بالصورة أو النص وطبّق السياسات تلقائياً.",
  keywords: [
    "SouqGuard",
    "visual search",
    "policy compliance",
    "marketplace AI",
    "البحث المرئي",
    "الامتثال",
  ],
  applicationName: "SouqGuard AI",
  openGraph: {
    title: "SouqGuard AI | حارس السوق",
    description:
      "Every listing, verified in seconds — AI visual search & policy compliance for marketplaces.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-center" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
