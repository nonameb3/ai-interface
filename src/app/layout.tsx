import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Portfolio Assistant | Interactive Demo",
  description: "Modern AI-powered portfolio assistant with smart suggestions, RAG technology, and responsive chat interface. Built with Next.js 15, OpenAI, and Pinecone.",
  keywords: ["AI", "Portfolio", "Assistant", "Chatbot", "Next.js", "OpenAI", "RAG", "Demo"],
  authors: [{ name: "Portfolio Assistant Demo" }],
  creator: "Portfolio Assistant Demo",
  
  // Open Graph / Facebook
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "AI Portfolio Assistant | Interactive Demo",
    description: "Experience an AI-powered portfolio assistant with smart suggestions and professional responses.",
    siteName: "AI Portfolio Assistant",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "AI Portfolio Assistant Demo",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "AI Portfolio Assistant | Interactive Demo",
    description: "Experience an AI-powered portfolio assistant with smart suggestions and professional responses.",
    images: ["/android-chrome-512x512.png"],
    creator: "@roonnapai", // Replace with your Twitter handle
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  
  // Manifest
  manifest: "/site.webmanifest",
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Additional meta tags
  category: "Technology",
  verification: {
    // Add verification codes if needed
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
