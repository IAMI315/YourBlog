import { EditorialHome } from "../../components/site/editorial-home";
import { articleQueries } from "../../modules/articles/public";
import { getMediaUrl } from "../../modules/media/public";
import { getSiteSettings } from "../../modules/site-settings/public";

export default async function HomePage() {
  const [settings, articles] = await Promise.all([
    getSiteSettings(),
    articleQueries.listPublished(),
  ]);
  const featuredImageUrl = articles[0]?.coverMediaStorageKey
    ? getMediaUrl(articles[0].coverMediaStorageKey)
    : null;

  return <EditorialHome articles={articles} featuredImageUrl={featuredImageUrl} settings={settings} />;
}
