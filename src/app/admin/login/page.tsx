import { LockKeyhole } from "lucide-react";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Please enter the administrator password.",
  invalid_credentials: "The password is incorrect.",
  rate_limited: "Too many attempts. Please try again later.",
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
        <p className="admin-login__eyebrow">Admin</p>
        <h1 id="admin-login-title">Sign in to YourBlog</h1>
        <form action={loginAction} className="admin-login__form">
          <label htmlFor="password">Password</label>
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
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
