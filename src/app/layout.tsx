import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "../components/site/footer";
import { SiteHeader } from "../components/site/header";
import { getAppearanceSettings, pageQueries } from "../modules/site-designer/public";
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
  const [settings, appearance, pages] = await Promise.all([
    getSiteSettings(),
    getAppearanceSettings(),
    pageQueries.listForNavigation(),
  ]);
  const navigation = [
    ...settings.navigation,
    ...pages.map((page) => ({ label: page.title, href: `/pages/${page.slug}` })),
  ];

  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body
        data-accent={appearance.accentPreset}
        data-background={appearance.backgroundTone}
        data-button-style={appearance.buttonStyle}
        data-glass={appearance.glassIntensity}
        data-header-density={appearance.headerDensity}
        data-radius={appearance.radiusScale}
        data-theme={appearance.themePreset}
      >
        <SiteHeader navigation={navigation} settings={settings} />
        {children}
        {appearance.footerVisible ? <SiteFooter settings={settings} /> : null}
      </body>
    </html>
  );
}
