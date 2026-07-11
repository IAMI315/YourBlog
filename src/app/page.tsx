import { getSiteSettings } from "../modules/site-settings/public";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <main className="home">
      <section className="home__hero">
        <p className="home__eyebrow">{settings.authorName}</p>
        <h1>{settings.homeTitle || settings.blogName}</h1>
        <p>{settings.homeDescription}</p>
      </section>
    </main>
  );
}
