"use client";

import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";

import { APPEARANCE_OPTIONS, type AppearanceSettings } from "../domain/appearance";

type AppearanceEditorProps = {
  settings: AppearanceSettings;
  resetAction: () => Promise<void>;
  saveAction: (formData: FormData) => Promise<void>;
};

const labels = {
  themePreset: { aurora: "柔光层次", clarity: "清透留白" },
  accentPreset: { sky: "天际蓝", mint: "薄荷绿", rose: "雾玫红" },
  backgroundTone: { mist: "云雾", dawn: "晨曦", night: "深空" },
  glassIntensity: { subtle: "柔和", balanced: "平衡", vivid: "通透" },
  radiusScale: { compact: "紧凑", regular: "标准", relaxed: "舒展" },
  buttonStyle: { soft: "柔光", tint: "色彩" },
  headerDensity: { compact: "紧凑", standard: "标准", spacious: "宽松" },
} as const;

export function AppearanceEditor({ resetAction, saveAction, settings }: AppearanceEditorProps) {
  const [draft, setDraft] = useState(settings);

  return (
    <form action={saveAction} className="appearance-editor">
      <div className="appearance-editor__controls">
        <label>
          视觉基调
          <select
            name="themePreset"
            onChange={(event) => setDraft({ ...draft, themePreset: event.target.value as AppearanceSettings["themePreset"] })}
            value={draft.themePreset}
          >
            {APPEARANCE_OPTIONS.themePreset.map((value) => <option key={value} value={value}>{labels.themePreset[value]}</option>)}
          </select>
        </label>
        <label>
          强调色
          <select
            name="accentPreset"
            onChange={(event) => setDraft({ ...draft, accentPreset: event.target.value as AppearanceSettings["accentPreset"] })}
            value={draft.accentPreset}
          >
            {APPEARANCE_OPTIONS.accentPreset.map((value) => <option key={value} value={value}>{labels.accentPreset[value]}</option>)}
          </select>
        </label>
        <label>
          背景层次
          <select
            name="backgroundTone"
            onChange={(event) => setDraft({ ...draft, backgroundTone: event.target.value as AppearanceSettings["backgroundTone"] })}
            value={draft.backgroundTone}
          >
            {APPEARANCE_OPTIONS.backgroundTone.map((value) => <option key={value} value={value}>{labels.backgroundTone[value]}</option>)}
          </select>
        </label>
        <label>
          玻璃通透度
          <select
            name="glassIntensity"
            onChange={(event) => setDraft({ ...draft, glassIntensity: event.target.value as AppearanceSettings["glassIntensity"] })}
            value={draft.glassIntensity}
          >
            {APPEARANCE_OPTIONS.glassIntensity.map((value) => <option key={value} value={value}>{labels.glassIntensity[value]}</option>)}
          </select>
        </label>
        <label>
          圆角尺度
          <select
            name="radiusScale"
            onChange={(event) => setDraft({ ...draft, radiusScale: event.target.value as AppearanceSettings["radiusScale"] })}
            value={draft.radiusScale}
          >
            {APPEARANCE_OPTIONS.radiusScale.map((value) => <option key={value} value={value}>{labels.radiusScale[value]}</option>)}
          </select>
        </label>
        <label>
          按钮风格
          <select
            name="buttonStyle"
            onChange={(event) => setDraft({ ...draft, buttonStyle: event.target.value as AppearanceSettings["buttonStyle"] })}
            value={draft.buttonStyle}
          >
            {APPEARANCE_OPTIONS.buttonStyle.map((value) => <option key={value} value={value}>{labels.buttonStyle[value]}</option>)}
          </select>
        </label>
        <label>
          顶部栏密度
          <select
            name="headerDensity"
            onChange={(event) => setDraft({ ...draft, headerDensity: event.target.value as AppearanceSettings["headerDensity"] })}
            value={draft.headerDensity}
          >
            {APPEARANCE_OPTIONS.headerDensity.map((value) => <option key={value} value={value}>{labels.headerDensity[value]}</option>)}
          </select>
        </label>
        <label className="appearance-editor__check">
          <input
            checked={draft.footerVisible}
            name="footerVisible"
            onChange={(event) => setDraft({ ...draft, footerVisible: event.target.checked })}
            type="checkbox"
          />
          显示页脚
        </label>
      </div>
      <div
        className="appearance-preview"
        data-accent={draft.accentPreset}
        data-background={draft.backgroundTone}
        data-glass={draft.glassIntensity}
        data-radius={draft.radiusScale}
      >
        <div className="appearance-preview__bar"><span>YourBlog</span><i /></div>
        <div className="appearance-preview__hero"><span>个人科技教程</span><strong>清晰、有层次的阅读体验</strong></div>
        <div className="appearance-preview__cards"><i /><i /><i /></div>
      </div>
      <div className="appearance-editor__actions">
        <button className="button" type="submit"><Save size={17} /><span>保存外观</span></button>
        <button
          className="button button--quiet"
          formAction={resetAction}
          onClick={(event) => {
            if (!window.confirm("确定恢复为默认外观吗？当前保存的外观设置将被覆盖。")) event.preventDefault();
          }}
          type="submit"
        >
          <RotateCcw size={17} /><span>恢复默认</span>
        </button>
      </div>
    </form>
  );
}
