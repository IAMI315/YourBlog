import { LockKeyhole } from "lucide-react";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "请输入管理员密码。",
  invalid_credentials: "密码不正确。",
  rate_limited: "尝试次数过多，请稍后再试。",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="admin-login">
      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <div className="admin-login__icon" aria-hidden="true">
          <LockKeyhole size={22} strokeWidth={1.8} />
        </div>
        <p className="admin-login__eyebrow">管理后台</p>
        <h1 id="admin-login-title">登录 YourBlog</h1>
        <form action={loginAction} className="admin-login__form">
          <label htmlFor="password">管理员密码</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={1}
          />
          {error ? (
            <p className="admin-login__error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit">登录</button>
        </form>
      </section>
    </main>
  );
}
