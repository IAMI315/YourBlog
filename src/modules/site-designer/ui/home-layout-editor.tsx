"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import {
  HOME_DESKTOP_SPANS,
  type HomeDesktopSpan,
  type HomeLayoutSettings,
  type HomeModule,
  type HomeModuleLayout,
} from "../domain/home-layout";
import {
  HOME_GRID_ROW_SPANS,
  homeGridPreviewStyle,
  type HomeGridRowSpan,
  type HomeGridViewport,
} from "../domain/home-grid";

type HomeLayoutEditorProps = {
  settings: HomeLayoutSettings;
  resetAction: () => Promise<void>;
  saveAction: (formData: FormData) => Promise<void>;
};

type PreviewViewport = HomeGridViewport;

const moduleLabels = {
  hero: "首屏介绍",
  featured: "精选教程",
  recent: "最近文章",
  labs: "网页实验室",
  archive: "教程归档",
} as const;

const spanLabels: Record<HomeDesktopSpan, string> = {
  full: "全宽 12/12",
  wide: "宽 8/12",
  half: "半宽 6/12",
  narrow: "窄 4/12",
};

const rowSpanLabels: Record<HomeGridRowSpan, string> = {
  1: "跨 1 行",
  2: "跨 2 行",
  3: "跨 3 行",
  4: "跨 4 行",
};

const viewportLabels: Record<PreviewViewport, string> = {
  desktop: "桌面",
  tablet: "平板",
  mobile: "手机",
};

const viewportIcons = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
} as const;

function moveModule(modules: HomeModule[], index: number, direction: -1 | 1): HomeModule[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= modules.length) return modules;
  const next = [...modules];
  const [module] = next.splice(index, 1);
  next.splice(nextIndex, 0, module!);
  return next;
}

function updateModule(
  modules: HomeModule[],
  id: HomeModule["id"],
  update: (module: HomeModule) => HomeModule,
): HomeModule[] {
  return modules.map((module) => (module.id === id ? update(module) : module));
}

function layoutSummary(layout: HomeModuleLayout): string {
  return `${spanLabels[layout.desktopSpan]} · ${rowSpanLabels[layout.rowSpan]}${layout.breakBefore ? " · 新行" : ""}`;
}

function PreviewModuleContent({
  module,
  settings,
}: {
  module: HomeModule;
  settings: HomeLayoutSettings;
}) {
  switch (module.id) {
    case "hero":
      return (
        <section className="editorial-hero editorial-hero--solo">
          <div className="editorial-hero__copy">
            <p className="home__eyebrow">管理员</p>
            <h1>{settings.heroTitle || "YourBlog"}</h1>
            <p>{settings.heroDescription || "一个用于沉淀科技教程、实验项目和工程笔记的个人博客。"}</p>
          </div>
        </section>
      );
    case "featured":
      return (
        <article className="editorial-hero__feature editorial-feature-card">
          <span className="editorial-hero__image-fallback" aria-hidden="true" />
          <span className="editorial-hero__feature-content">
            <small>{settings.featuredLabel}</small>
            <strong>欢迎</strong>
            <em>发布后的精选教程会展示在这里。</em>
          </span>
        </article>
      );
    case "recent":
      return (
        <section className="editorial-layers__list" aria-label="最近教程预览">
          <article className="editorial-note-card">
            <span>{settings.archiveLabel}</span>
            <strong>教程列表会显示在这里</strong>
            <em>发布第一篇文章后，首页会自动出现精选和最近文章。</em>
          </article>
        </section>
      );
    case "labs":
      return (
        <article className="editorial-layers__lab">
          <span>{settings.labLabel}</span>
          <strong>{settings.labTitle}</strong>
          <em>{settings.labDescription}</em>
        </article>
      );
    case "archive":
      return (
        <article className="editorial-archive-link">
          <span>{settings.archiveLabel}</span>
          <strong>按时间查看全部教程</strong>
        </article>
      );
  }
}

function PreviewModule({
  module,
  settings,
  viewport,
}: {
  module: HomeModule;
  settings: HomeLayoutSettings;
  viewport: PreviewViewport;
}) {
  if (!module.enabled) return null;

  return (
    <div
      className={`home-layout-preview__module home-layout-preview__module--${module.id}`}
      style={homeGridPreviewStyle(module.layout, viewport) as CSSProperties}
    >
      <PreviewModuleContent module={module} settings={settings} />
      <small className="home-layout-preview__module-layout">{layoutSummary(module.layout)}</small>
    </div>
  );
}

export function HomeLayoutEditor({ resetAction, saveAction, settings }: HomeLayoutEditorProps) {
  const [modules, setModules] = useState(settings.modules);
  const [selectedModuleId, setSelectedModuleId] = useState<HomeModule["id"]>(settings.modules[0]?.id ?? "hero");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0]!;

  function updateSelectedLayout(update: Partial<HomeModuleLayout>) {
    setModules((current) =>
      updateModule(current, selectedModule.id, (module) => ({
        ...module,
        layout: { ...module.layout, ...update },
      })),
    );
  }

  return (
    <form action={saveAction} className="home-layout-editor">
      <input name="modules" type="hidden" value={JSON.stringify(modules)} />
      <div className="home-layout-editor__workspace">
        <section className="home-layout-editor__modules" aria-label="首页模块">
          <div className="home-layout-editor__modules-header">
            <div>
              <p>模块布局</p>
              <span>选择一个模块后调整宽度和跨行高度</span>
            </div>
          </div>
          {modules.map((module, index) => (
            <div className="home-layout-editor__module" key={module.id}>
              <button
                aria-pressed={selectedModule.id === module.id}
                className="home-layout-editor__module-select"
                onClick={() => setSelectedModuleId(module.id)}
                type="button"
              >
                <strong>{moduleLabels[module.id]}</strong>
                <span>{module.enabled ? layoutSummary(module.layout) : "已隐藏"}</span>
              </button>
              <div className="home-layout-editor__module-actions">
                <button aria-label={`上移${moduleLabels[module.id]}`} disabled={index === 0} onClick={() => setModules(moveModule(modules, index, -1))} type="button"><ArrowUp size={16} /></button>
                <button aria-label={`下移${moduleLabels[module.id]}`} disabled={index === modules.length - 1} onClick={() => setModules(moveModule(modules, index, 1))} type="button"><ArrowDown size={16} /></button>
                <button
                  aria-label={`${module.enabled ? "隐藏" : "显示"}${moduleLabels[module.id]}`}
                  onClick={() => setModules(updateModule(modules, module.id, (item) => ({ ...item, enabled: !item.enabled })))}
                  type="button"
                >
                  {module.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
          ))}
        </section>
        <section className="home-layout-editor__inspector" aria-labelledby="layout-inspector-title">
          <div className="home-layout-editor__inspector-heading">
            <p>布局检查器</p>
            <h2 id="layout-inspector-title">{moduleLabels[selectedModule.id]}</h2>
          </div>
          <fieldset>
            <legend>桌面宽度</legend>
            <div className="home-layout-editor__segments">
              {HOME_DESKTOP_SPANS.map((span) => (
                <button
                  aria-pressed={selectedModule.layout.desktopSpan === span}
                  key={span}
                  onClick={() => updateSelectedLayout({ desktopSpan: span })}
                  type="button"
                >
                  {spanLabels[span]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>跨行高度</legend>
            <div className="home-layout-editor__segments home-layout-editor__segments--height">
              {HOME_GRID_ROW_SPANS.map((rowSpan) => (
                <button
                  aria-pressed={selectedModule.layout.rowSpan === rowSpan}
                  key={rowSpan}
                  onClick={() => updateSelectedLayout({ rowSpan })}
                  type="button"
                >
                  {rowSpanLabels[rowSpan]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="home-layout-editor__break-toggle">
            <span><strong>从新的一行开始</strong><small>让区块从网格第一列开始</small></span>
            <input
              checked={selectedModule.layout.breakBefore}
              onChange={(event) => updateSelectedLayout({ breakBefore: event.target.checked })}
              type="checkbox"
            />
          </label>
        </section>
      </div>
      <section className="home-layout-preview" aria-label="首页即时预览">
        <div className="home-layout-preview__header">
          <div><p>即时预览</p><span>当前修改尚未保存到公开首页</span></div>
          <div className="home-layout-preview__tabs" role="tablist" aria-label="预览设备">
            {(["desktop", "tablet", "mobile"] as const).map((item) => {
              const Icon = viewportIcons[item];

              return (
                <button
                  aria-selected={viewport === item}
                  key={item}
                  onClick={() => setViewport(item)}
                  role="tab"
                  type="button"
                >
                  <Icon size={15} /><span>{viewportLabels[item]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`home-layout-preview__frame home-layout-preview__frame--${viewport}`}>
          <div className="home-layout-preview__grid">
            {modules.map((module) => (
              <PreviewModule key={module.id} module={module} settings={settings} viewport={viewport} />
            ))}
          </div>
        </div>
      </section>
      <section className="home-layout-editor__fields">
        <label>首页标题<input defaultValue={settings.heroTitle ?? ""} name="heroTitle" /></label>
        <label>首页描述<textarea defaultValue={settings.heroDescription ?? ""} name="heroDescription" rows={3} /></label>
        <label>精选标签<input defaultValue={settings.featuredLabel} name="featuredLabel" required /></label>
        <label>最近文章数量<input defaultValue={settings.recentArticlesCount} max={12} min={1} name="recentArticlesCount" type="number" /></label>
        <label>实验室标签<input defaultValue={settings.labLabel} name="labLabel" required /></label>
        <label>实验室标题<input defaultValue={settings.labTitle} name="labTitle" required /></label>
        <label className="home-layout-editor__field--wide">实验室描述<textarea defaultValue={settings.labDescription} name="labDescription" required rows={3} /></label>
        <label>归档标签<input defaultValue={settings.archiveLabel} name="archiveLabel" required /></label>
      </section>
      <div className="appearance-editor__actions">
        <button className="button" type="submit"><Save size={17} /><span>保存首页</span></button>
        <button
          className="button button--quiet"
          formAction={resetAction}
          onClick={(event) => {
            if (!window.confirm("确定恢复默认首页布局吗？当前模块顺序、显隐、尺寸和文案将被覆盖。")) event.preventDefault();
          }}
          type="submit"
        >
          <RotateCcw size={17} /><span>恢复默认</span>
        </button>
      </div>
    </form>
  );
}
