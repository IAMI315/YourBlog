import Link from "next/link";
import { LayoutTemplate, Paintbrush, PlusSquare } from "lucide-react";

export default function AppearanceOverviewPage() {
  return (
    <section className="admin-section appearance-overview" aria-labelledby="appearance-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">外观与页面</p>
          <h1 id="appearance-title">网站设计</h1>
        </div>
      </div>
      <div className="appearance-overview__grid">
        <Link className="appearance-overview__card" href="/admin/appearance/global">
          <Paintbrush size={24} />
          <span>全局外观</span>
          <strong>调整色彩、通透度、圆角与顶部栏</strong>
        </Link>
        <Link className="appearance-overview__card" href="/admin/appearance/home">
          <LayoutTemplate size={24} />
          <span>首页编辑</span>
          <strong>控制首页模块、顺序和文案</strong>
        </Link>
        <Link className="appearance-overview__card" href="/admin/pages">
          <PlusSquare size={24} />
          <span>页面管理</span>
          <strong>创建、预览和发布独立页面</strong>
        </Link>
      </div>
    </section>
  );
}
