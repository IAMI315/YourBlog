import Link from "next/link";

import type { SiteSettings } from "../../modules/site-settings/public";

type HeaderProps = {
  settings: SiteSettings;
};

export function SiteHeader({ settings }: HeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-header__brand" href="/">
        {settings.blogName}
      </Link>
      <nav className="site-header__nav" aria-label="Primary navigation">
        {settings.navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
