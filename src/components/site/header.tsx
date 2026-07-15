import Link from "next/link";
import { Search } from "lucide-react";

import type { SiteSettings } from "../../modules/site-settings/public";

type HeaderProps = {
  settings: SiteSettings;
  navigation?: Array<{ label: string; href: string }>;
};

export function SiteHeader({ settings, navigation = settings.navigation }: HeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-header__brand" href="/">
        {settings.blogName}
      </Link>
      <nav className="site-header__nav" aria-label="主导航">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <form action="/search" className="site-header__search" role="search">
        <Search aria-hidden="true" size={16} strokeWidth={2} />
        <label className="sr-only" htmlFor="global-search">
          全站搜索
        </label>
        <input id="global-search" name="q" placeholder="搜索站内内容" type="search" />
        <button type="submit">搜索</button>
      </form>
    </header>
  );
}
