import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "../components/site/footer";
import { SiteHeader } from "../components/site/header";
import { getSiteSettings } from "../modules/site-settings/public";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.seoTitle || settings.blogName,
    description: settings.seoDescription || settings.homeDescription,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getSiteSettings();

  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <SiteHeader settings={settings} />
        {children}
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
