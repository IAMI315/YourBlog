import Link from "next/link";

import { AppearanceEditor } from "../../../../../modules/site-designer/ui/appearance-editor";
import { getAppearanceSettings } from "../../../../../modules/site-designer/public";
import { resetAppearanceAction, saveAppearanceAction } from "../actions";

type AppearancePageProps = {
  searchParams?: Promise<{ saved?: string; reset?: string; error?: string }>;
};

export default async function AppearancePage({ searchParams }: AppearancePageProps) {
  const [settings, params] = await Promise.all([getAppearanceSettings(), searchParams]);

  return (
    <section className="admin-section" aria-labelledby="appearance-global-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">外观与页面</p>
          <h1 id="appearance-global-title">全局外观</h1>
        </div>
        <Link className="button button--quiet" href="/admin/appearance">返回设计中心</Link>
      </div>
      {params?.saved ? <p className="admin-toast" role="status">外观已保存。</p> : null}
      {params?.reset ? <p className="admin-toast" role="status">已恢复默认外观。</p> : null}
      {params?.error ? <p className="admin-error" role="alert">外观参数无效，请重新选择后保存。</p> : null}
      <AppearanceEditor resetAction={resetAppearanceAction} saveAction={saveAppearanceAction} settings={settings} />
    </section>
  );
}
