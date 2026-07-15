import { Save } from "lucide-react";

import { Button } from "../../../../components/design-system/button";
import { Field, TextArea, TextInput } from "../../../../components/design-system/field";
import { getSiteSettings } from "../../../../modules/site-settings/public";
import { saveSiteSettingsAction } from "./actions";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const errorMessages: Record<string, string> = {
  BLOG_NAME_REQUIRED: "博客名称不能为空。",
  SOCIAL_LINK_HTTPS_REQUIRED: "外部社交链接必须使用 HTTPS。",
  NAVIGATION_ROUTE_NOT_ALLOWED: "导航只能使用允许的内部路径。",
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const settings = await getSiteSettings();
  const params = (await searchParams) ?? {};
  const navigationValue = settings.navigation.map((item) => `${item.label}|${item.href}`).join("\n");
  const socialValue = settings.socialLinks.map((link) => `${link.label}|${link.url}`).join("\n");

  return (
    <section className="admin-section" aria-labelledby="settings-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">站点设置</p>
          <h1 id="settings-title">站点身份</h1>
        </div>
        {params.saved ? (
          <p className="admin-toast" role="status">
            设置已保存。
          </p>
        ) : null}
      </div>
      <form action={saveSiteSettingsAction} className="settings-form">
        <Field
          error={params.blogName ? errorMessages[params.blogName] : undefined}
          htmlFor="blogName"
          label="博客名称"
        >
          <TextInput id="blogName" name="blogName" required defaultValue={settings.blogName} />
        </Field>
        <Field htmlFor="authorName" label="作者名称">
          <TextInput id="authorName" name="authorName" defaultValue={settings.authorName} />
        </Field>
        <Field htmlFor="authorBio" label="作者简介">
          <TextArea id="authorBio" name="authorBio" defaultValue={settings.authorBio} rows={3} />
        </Field>
        <Field htmlFor="homeTitle" label="首页标题">
          <TextInput id="homeTitle" name="homeTitle" defaultValue={settings.homeTitle} />
        </Field>
        <Field htmlFor="homeDescription" label="首页描述">
          <TextArea
            id="homeDescription"
            name="homeDescription"
            defaultValue={settings.homeDescription}
            rows={3}
          />
        </Field>
        <Field
          error={params.navigation ? errorMessages[params.navigation] : undefined}
          htmlFor="navigation"
          label="导航"
        >
          <TextArea id="navigation" name="navigation" defaultValue={navigationValue} rows={5} />
        </Field>
        <Field
          error={params.socialLinks ? errorMessages[params.socialLinks] : undefined}
          htmlFor="socialLinks"
          label="社交链接"
        >
          <TextArea id="socialLinks" name="socialLinks" defaultValue={socialValue} rows={4} />
        </Field>
        <Field htmlFor="seoTitle" label="SEO 标题">
          <TextInput id="seoTitle" name="seoTitle" defaultValue={settings.seoTitle} />
        </Field>
        <Field htmlFor="seoDescription" label="SEO 描述">
          <TextArea
            id="seoDescription"
            name="seoDescription"
            defaultValue={settings.seoDescription}
            rows={3}
          />
        </Field>
        <Button icon={<Save size={18} />} type="submit">
          保存设置
        </Button>
      </form>
    </section>
  );
}
