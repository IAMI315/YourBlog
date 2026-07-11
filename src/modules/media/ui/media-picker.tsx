"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

type MediaPickerItem = {
  id: string;
  originalName: string;
  url: string;
  altText: string;
};

type MediaPickerProps = {
  items: MediaPickerItem[];
  onSelect?: (item: MediaPickerItem) => void;
};

export function MediaPicker({ items, onSelect }: MediaPickerProps) {
  const [query, setQuery] = useState("");
  const filteredItems = items.filter((item) =>
    item.originalName.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  return (
    <section className="media-picker" aria-label="媒体选择器">
      <label>
        搜索媒体
        <input
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="按文件名搜索"
          type="search"
          value={query}
        />
      </label>
      <div className="media-picker__grid">
        {filteredItems.map((item) => (
          <button key={item.id} onClick={() => onSelect?.(item)} type="button">
            <ImagePlus aria-hidden="true" size={16} />
            <span>{item.originalName}</span>
            {item.altText ? <small>{item.altText}</small> : <small>需要替代文本</small>}
          </button>
        ))}
        {filteredItems.length === 0 ? <p>没有找到媒体。</p> : null}
      </div>
    </section>
  );
}
