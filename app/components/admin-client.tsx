"use client";

import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  KeyRound,
  LoaderCircle,
  Save,
  School,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Brand } from "./brand";

type Application = {
  id: string;
  campus_name: string;
  contact: string;
  desired_slug: string;
  reason: string;
  created_at: string;
  display_name: string;
  email: string;
};

export function AdminClient({
  ownerEmail,
  pricing,
  service,
  stats,
  applications,
}: {
  ownerEmail: string;
  pricing: {
    standardPriceCents: number;
    proPriceCents: number;
    agentCommissionPercent: number;
  };
  service: { keyConfigured: boolean; baseUrl: string };
  stats: { generations: number; revenue: string; users: number; agents: number };
  applications: Application[];
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(applications);
  const [approving, setApproving] = useState("");

  async function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        standardPriceCents: Math.round(Number(form.get("standardPrice")) * 100),
        proPriceCents: Math.round(Number(form.get("proPrice")) * 100),
        agentCommissionPercent: Number(form.get("commission")),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    setMessage(response.ok ? "价格已更新，新的订单会立即使用。" : data.error ?? "保存失败");
  }

  async function approve(applicationId: string) {
    setApproving(applicationId);
    const response = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const data = (await response.json()) as { error?: string };
    setApproving("");
    if (!response.ok) {
      setMessage(data.error ?? "开通失败");
      return;
    }
    setPending((current) => current.filter((item) => item.id !== applicationId));
    setMessage("校园分站已开通。");
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand compact />
        <nav>
          <a className="active" href="#overview"><Activity size={18} /> 经营概览</a>
          <a href="#pricing-admin"><CircleDollarSign size={18} /> 价格配置</a>
          <a href="#agents-admin"><School size={18} /> 代理审核</a>
          <a href="/"><ArrowLeft size={18} /> 返回首页</a>
        </nav>
        <div className="admin-owner"><span>站点管理员</span><b>{ownerEmail}</b></div>
      </aside>
      <section className="admin-main">
        <header>
          <div><span>CONTROL ROOM</span><h1>管理后台</h1></div>
          <div className={service.keyConfigured ? "service-ok" : "service-warn"}>
            <i />
            {service.keyConfigured ? "生图服务已接入" : "待配置生图密钥"}
          </div>
        </header>

        <section className="admin-stats" id="overview">
          <article><span><Sparkles size={18} /> 成功生成</span><strong>{stats.generations}</strong><small>张图片</small></article>
          <article><span><CircleDollarSign size={18} /> 累计收入</span><strong>{stats.revenue}</strong><small>实际成交</small></article>
          <article><span><UsersRound size={18} /> 注册用户</span><strong>{stats.users}</strong><small>位创作者</small></article>
          <article><span><School size={18} /> 校园代理</span><strong>{stats.agents}</strong><small>个分站</small></article>
        </section>

        <div className="admin-columns">
          <section className="admin-panel" id="pricing-admin">
            <div className="panel-title">
              <div><span>全站设置</span><h2>模型与售价</h2></div>
              <CircleDollarSign size={22} />
            </div>
            <form className="pricing-form" onSubmit={savePricing}>
              <div className="model-setting">
                <div>
                  <span className="model-code">image-2 · P0</span>
                  <h3>标准高清</h3>
                  <p>最高 2K 以下 · 模型成本 ¥0.04 / 次</p>
                </div>
                <label>前台售价<div><span>¥</span><input name="standardPrice" type="number" min="0.04" step="0.01" defaultValue={(pricing.standardPriceCents / 100).toFixed(2)} /></div></label>
              </div>
              <div className="model-setting pro">
                <div>
                  <span className="model-code">image-2-Pro · P1</span>
                  <h3>Pro 超清</h3>
                  <p>最高 4K · 模型成本 ¥0.12 / 次</p>
                </div>
                <label>前台售价<div><span>¥</span><input name="proPrice" type="number" min="0.12" step="0.01" defaultValue={(pricing.proPriceCents / 100).toFixed(2)} /></div></label>
              </div>
              <label className="commission-setting">
                <span>校园代理默认分佣比例</span>
                <div><input name="commission" type="number" min="0" max="80" defaultValue={pricing.agentCommissionPercent} /><b>%</b></div>
              </label>
              {message && <div className="admin-message">{message}</div>}
              <button type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                {saving ? "正在保存…" : "保存价格配置"}
              </button>
            </form>
          </section>

          <section className="admin-panel service-panel">
            <div className="panel-title">
              <div><span>服务状态</span><h2>生图接口</h2></div>
              <KeyRound size={22} />
            </div>
            <div className="service-row">
              <span>服务端密钥</span>
              <b>{service.keyConfigured ? "已安全配置" : "尚未配置"}</b>
              {service.keyConfigured && <BadgeCheck size={17} />}
            </div>
            <div className="service-row stacked">
              <span>API 地址</span>
              <code>{service.baseUrl}</code>
            </div>
            <div className="security-note">
              密钥仅在服务端调用，不会发送到浏览器。修改密钥或接口地址请在托管环境中更新。
            </div>
          </section>
        </div>

        <section className="admin-panel agents-panel" id="agents-admin">
          <div className="panel-title">
            <div><span>校园增长</span><h2>待审核代理</h2></div>
            <span className="count-chip">{pending.length} 个待处理</span>
          </div>
          {pending.length ? (
            <div className="application-list">
              {pending.map((item) => (
                <article key={item.id}>
                  <div className="applicant-avatar">{item.campus_name.slice(0, 1)}</div>
                  <div className="application-main">
                    <div><h3>{item.campus_name}</h3><code>/s/{item.desired_slug}</code></div>
                    <p>{item.reason || "申请人未填写推广计划。"}</p>
                    <small>{item.display_name} · {item.email} · {item.contact}</small>
                  </div>
                  <button type="button" onClick={() => approve(item.id)} disabled={approving === item.id}>
                    {approving === item.id ? <LoaderCircle className="spin" size={17} /> : <BadgeCheck size={17} />}
                    {approving === item.id ? "开通中…" : "通过并开站"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-admin">暂时没有待审核申请。</div>
          )}
        </section>
      </section>
    </main>
  );
}
