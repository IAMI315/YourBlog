import { ProjectUploader } from "../../../../../modules/web-projects/client";
import { publishUploadedWebProjectAction } from "../actions";

export default function NewWebProjectPage() {
  return (
    <section className="admin-section" aria-labelledby="new-web-project-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">项目上传</p>
          <h1 id="new-web-project-title">上传网页项目</h1>
        </div>
      </div>
      <ProjectUploader publishAction={publishUploadedWebProjectAction} />
    </section>
  );
}
