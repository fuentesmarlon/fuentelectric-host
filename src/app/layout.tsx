import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AvisoEntorno } from "@/components/AvisoEntorno";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fuentelectric - Soluciones Eléctricas",
  description:
    "Empresa guatemalteca dedicada a instalaciones, mantenimiento y soluciones eléctricas comerciales e industriales. Especialistas en alta y media tensión.",
  openGraph: {
    title: "Fuentelectric - Soluciones Eléctricas en Guatemala",
    description: "Soluciones y mantenimiento eléctrico comercial e industrial.",
    type: "website",
    url: "https://www.fuentelectric.com",
    images: [
      {
        url: "https://www.fuentelectric.com/images/header.jpeg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${inter.className} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-blue-900">
        {children}
        <AvisoEntorno />
      </body>
    </html>
  );
}
