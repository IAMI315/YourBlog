"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, UploadCloud } from "lucide-react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | {
      status: "ready";
      previewUrl: string;
      ticket: string;
      validation: {
        kind: "html" | "zip";
        checksum: string;
        compressedBytes: number;
        extractedBytes: number;
        fileCount: number;
      };
    }
  | { status: "error"; message: string };

type ProjectUploaderProps = {
  projectId?: string;
  defaultTitle?: string;
  defaultSlug?: string;
  defaultSummary?: string;
  publishAction: (formData: FormData) => Promise<void>;
};

const STAGES = ["读取文件", "安全校验", "生成隔离预览", "等待发布确认"];

export function ProjectUploader({
  projectId,
  defaultTitle = "",
  defaultSlug = "",
  defaultSummary = "",
  publishAction,
}: ProjectUploaderProps) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const activeStage = state.status === "idle" ? 0 : state.status === "uploading" ? 2 : 4;
  const helperText = useMemo(() => {
    if (state.status === "ready") {
      return `${state.validation.kind.toUpperCase()} · ${state.validation.fileCount} 个文件 · ${Math.ceil(
        state.validation.extractedBytes / 1024,
      )} KB`;
    }

    if (state.status === "error") return state.message;

    return "支持单个 HTML 文件，或包含根目录 index.html 的 ZIP 项目。";
  }, [state]);

  async function upload(formData: FormData) {
    setState({ status: "uploading" });

    const response = await fetch("/api/admin/web-projects/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as
      | {
          ok: true;
          previewUrl: string;
          ticket: string;
          validation: {
            kind: "html" | "zip";
            checksum: string;
            compressedBytes: number;
            extractedBytes: number;
            fileCount: number;
          };
        }
      | { ok: false; message?: string; code: string };

    if (!response.ok || !payload.ok) {
      setState({
        status: "error",
        message: payload.ok ? "上传失败，请重试。" : payload.message ?? payload.code,
      });
      return;
    }

    setState({
      status: "ready",
      previewUrl: payload.previewUrl,
      ticket: payload.ticket,
      validation: payload.validation,
    });
  }

  return (
    <div className="project-uploader">
      <form
        className="project-uploader__dropzone"
        onSubmit={(event) => {
          event.preventDefault();
          void upload(new FormData(event.currentTarget));
        }}
      >
        <UploadCloud size={28} />
        <div>
          <h2>上传网页项目</h2>
          <p>{helperText}</p>
        </div>
        <input accept=".html,.htm,.zip,text/html,application/zip" name="file" required type="file" />
        <button className="button" disabled={state.status === "uploading"} type="submit">
          {state.status === "uploading" ? <Loader2 className="spin" size={16} /> : <UploadCloud size={16} />}
          <span>{state.status === "uploading" ? "验证中" : "上传并生成预览"}</span>
        </button>
      </form>

      <ol className="project-uploader__stages">
        {STAGES.map((stage, index) => (
          <li className={index < activeStage ? "is-complete" : ""} key={stage}>
            <CheckCircle2 size={16} />
            <span>{stage}</span>
          </li>
        ))}
      </ol>

      {state.status === "ready" ? (
        <div className="project-uploader__publish-panel">
          <a className="button button--ghost" href={state.previewUrl} rel="noreferrer" target="_blank">
            <ExternalLink size={16} />
            <span>打开隔离预览</span>
          </a>
          <form
            action={(formData) => {
              startTransition(() => {
                void publishAction(formData);
              });
            }}
            className="project-uploader__publish-form"
          >
            {projectId ? <input name="projectId" type="hidden" value={projectId} /> : null}
            <input name="ticket" type="hidden" value={state.ticket} />
            <label>
              标题
              <input defaultValue={defaultTitle} name="title" required />
            </label>
            <label>
              网址标识
              <input defaultValue={defaultSlug} name="slug" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              简介
              <textarea defaultValue={defaultSummary} name="summary" rows={3} />
            </label>
            <button className="button" disabled={isPending} type="submit">
              {isPending ? "发布中" : "确认发布"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
