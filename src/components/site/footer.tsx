import type { SiteSettings } from "../../modules/site-settings/public";

type FooterProps = {
  settings: SiteSettings;
};

export function SiteFooter({ settings }: FooterProps) {
  return (
    <footer className="site-footer">
      <p>{settings.authorBio}</p>
      {settings.socialLinks.length > 0 ? (
        <nav aria-label="社交链接">
          {settings.socialLinks.map((link) => (
            <a href={link.url} key={link.url} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </footer>
  );
}
