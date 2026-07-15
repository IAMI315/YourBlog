import Link from "next/link";

import { getHomeLayoutSettings } from "../../../../../modules/site-designer/public";
import { HomeLayoutEditor } from "../../../../../modules/site-designer/ui/home-layout-editor";
import { resetHomeLayoutAction, saveHomeLayoutAction } from "../actions";

type HomeLayoutPageProps = {
  searchParams?: Promise<{ saved?: string; reset?: string; error?: string }>;
};

export default async function HomeLayoutPage({ searchParams }: HomeLayoutPageProps) {
  const [settings, params] = await Promise.all([getHomeLayoutSettings(), searchParams]);

  return (
    <section className="admin-section" aria-labelledby="home-layout-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">外观与页面</p>
          <h1 id="home-layout-title">首页编辑</h1>
        </div>
        <Link className="button button--quiet" href="/admin/appearance">返回设计中心</Link>
      </div>
      {params?.saved ? <p className="admin-toast" role="status">首页设置已保存。</p> : null}
      {params?.reset ? <p className="admin-toast" role="status">已恢复默认首页布局。</p> : null}
      {params?.error ? <p className="admin-error" role="alert">首页设置无效，请检查模块和字段后重试。</p> : null}
      <HomeLayoutEditor resetAction={resetHomeLayoutAction} saveAction={saveHomeLayoutAction} settings={settings} />
    </section>
  );
}
