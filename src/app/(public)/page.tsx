import { EditorialHome } from "../../components/site/editorial-home";
import { articleQueries } from "../../modules/articles/public";
import { getMediaUrl } from "../../modules/media/public";
import { getHomeLayoutSettings } from "../../modules/site-designer/public";
import { getSiteSettings } from "../../modules/site-settings/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, articles, homeLayout] = await Promise.all([
    getSiteSettings(),
    articleQueries.listPublished(),
    getHomeLayoutSettings(),
  ]);
  const featuredImageUrl = articles[0]?.coverMediaStorageKey
    ? getMediaUrl(articles[0].coverMediaStorageKey)
    : null;

  return (
    <EditorialHome
      articles={articles}
      featuredImageUrl={featuredImageUrl}
      homeLayout={homeLayout}
      settings={settings}
    />
  );
}
