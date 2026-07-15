import { Upload } from "lucide-react";

import { getMediaUrl, listMedia } from "../../../../modules/media/public";
import { DeleteMediaButton } from "./delete-media-button";
import { deleteUnusedMediaAction, updateMediaAltTextAction } from "./actions";

type MediaPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const query = (await searchParams)?.q?.trim() ?? "";
  const media = await listMedia({ search: query || undefined });

  return (
    <section className="admin-section" aria-labelledby="media-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">媒体管理</p>
          <h1 id="media-title">媒体库</h1>
        </div>
      </div>
      <form action="/api/admin/media" className="media-upload" encType="multipart/form-data" method="post">
        <label className="media-field media-field--file">
          <span>上传图片</span>
          <input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" name="file" required type="file" />
        </label>
        <label className="media-field">
          <span>替代文本</span>
          <input name="altText" placeholder="描述图片内容，发布前必填" />
        </label>
        <button className="button" type="submit">
          <Upload size={16} />
          <span>上传</span>
        </button>
      </form>
      <form className="media-search">
        <label className="media-field media-field--search">
          <span>搜索</span>
          <input defaultValue={query} name="q" placeholder="按原始文件名搜索" type="search" />
        </label>
        <button className="button" type="submit">
          搜索
        </button>
      </form>
      <div className="media-library">
        {media.map((item) => (
          <article className="media-library__item" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 管理后台媒体库用于预览用户上传文件。 */}
            <img alt={item.altText || item.originalName} src={getMediaUrl(item.storageKey)} />
            <div>
              <h2>{item.originalName}</h2>
              <p>
                {item.width}×{item.height} · {Math.ceil(item.byteSize / 1024)} KB · 使用 {item.usageCount ?? 0} 次
              </p>
              <form action={updateMediaAltTextAction.bind(null, item.id)}>
                <label className="media-field">
                  <span>替代文本</span>
                  <input defaultValue={item.altText} name="altText" />
                </label>
                <div className="media-library__actions">
                  <button className="button" type="submit">
                    保存
                  </button>
                  <DeleteMediaButton
                    action={deleteUnusedMediaAction.bind(null, item.id)}
                    disabled={(item.usageCount ?? 0) > 0}
                  />
                </div>
              </form>
            </div>
          </article>
        ))}
        {media.length === 0 ? <p>还没有媒体文件。</p> : null}
      </div>
    </section>
  );
}
