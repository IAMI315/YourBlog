import { getSiteSettings } from "../../../modules/site-settings/public";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "关于",
  description: "关于作者和这个技术博客。",
};

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <main className="public-page">
      <section className="public-page__header">
        <p className="home__eyebrow">About</p>
        <h1>{settings.authorName}</h1>
        <p>{settings.authorBio}</p>
      </section>
      <section className="about-panel">
        <h2>{settings.blogName}</h2>
        <p>
          {settings.blogName} 用来沉淀科技教程、部署记录和实验项目。内容保存在自己的服务器上，
          并以清爽、通透的阅读界面呈现。
        </p>
      </section>
    </main>
  );
}
