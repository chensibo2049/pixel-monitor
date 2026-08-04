"use client";

import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Brand } from "./brand";

export function LoginClient({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        displayName: form.get("displayName"),
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "操作失败，请稍后再试。");
      setLoading(false);
      return;
    }
    window.location.assign(returnTo);
  }

  return (
    <main className="auth-page">
      <a className="auth-back" href="/"><ArrowLeft size={16} /> 返回首页</a>
      <section className="auth-copy">
        <Brand />
        <span className="section-kicker">学生创作账号</span>
        <h1>今晚交图，<br />从一个想法开始。</h1>
        <p>保存作品、管理积分、复用校园海报配方。新账号赠送 30 体验积分。</p>
        <div className="auth-poster">
          <span>MAKE<br />IT<br />VISIBLE</span>
          <Sparkles size={40} />
          <small>PIXEL MONITOR · 2026</small>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => { setMode("login"); setError(""); }}>登录</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => { setMode("register"); setError(""); }}>注册</button>
        </div>
        <div className="auth-title">
          <span>{mode === "login" ? "欢迎回来" : "创建创作账号"}</span>
          <h2>{mode === "login" ? "继续做你的下一张图" : "注册即送 30 积分"}</h2>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>昵称<input name="displayName" autoComplete="nickname" minLength={2} maxLength={30} required placeholder="例如：林同学" /></label>
          )}
          <label>邮箱<input name="email" type="email" autoComplete="email" required placeholder="name@university.edu.cn" /></label>
          <label>密码<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={72} required placeholder="至少 8 位" /></label>
          {error && <div className="inline-error">{error}</div>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
            {loading ? "请稍候…" : mode === "login" ? "登录并进入工作台" : "注册并领取 30 积分"}
          </button>
        </form>
        <p className="auth-privacy">密码会加密存储；生图密钥只存在于服务器。</p>
      </section>
    </main>
  );
}
