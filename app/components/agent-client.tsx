"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Copy,
  Link2,
  LoaderCircle,
  School,
  Store,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Brand } from "./brand";

type Site = {
  id: string;
  slug: string;
  campus_name: string;
  brand_name: string;
  standardPrice: string;
  proPrice: string;
  standardPackPrice: string;
  proPackPrice: string;
  commission_percent: number;
  status: string;
  orders: number;
  commission: string;
  todayOrders: number;
  weekOrders: number;
  weekTrend: number;
  popularOperation: string | null;
};

const operationLabels: Record<string, string> = {
  generate: "文字生图",
  edit: "局部修改",
  variation: "生成类似",
  image_to_image: "参考图生成",
  remove_background: "一键去背景",
};

export function AgentClient({
  displayName,
  application,
  site,
}: {
  displayName: string;
  application: {
    campus_name: string;
    desired_slug: string;
    status: string;
    created_at: string;
  } | null;
  site: Site | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/agent/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = (await response.json()) as { error?: string };
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error ?? "提交失败，请稍后再试。");
      return;
    }
    setSuccess(true);
  }

  async function copyLink() {
    const url = `${window.location.origin}/s/${site?.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="agent-page">
      <header className="simple-nav">
        <Brand />
        <div>
          <span>{displayName}</span>
          <a href="/"><ArrowLeft size={16} /> 返回首页</a>
        </div>
      </header>

      <section className="agent-hero">
        <div>
          <span className="eyebrow dark">校园合伙人计划 · 2026</span>
          <h1>你的学校，<br />你的生图分站。</h1>
          <p>无需开发、无需维护。申请通过后即可获得专属链接、独立品牌和每笔订单分佣。</p>
        </div>
        <div className="agent-metric-stack">
          <div><span>开站成本</span><strong>¥0</strong><small>审核通过即开通</small></div>
          <div><span>默认分佣</span><strong>20%</strong><small>后台可统一调整</small></div>
          <div><span>技术维护</span><strong>0</strong><small>模型与计费由平台负责</small></div>
        </div>
      </section>

      <section className="agent-steps section-wrap">
        {[
          [School, "01", "提交申请", "填写学校和联系方式，告诉我们你准备如何推广。"],
          [Store, "02", "开通分站", "审核通过后，系统生成专属校园链接和品牌页面。"],
          [TrendingUp, "03", "分享赚分佣", "同学从你的分站生成图片，订单自动计入收益。"],
        ].map(([Icon, number, title, copy]) => {
          const StepIcon = Icon as typeof School;
          return (
            <article key={String(number)}>
              <span className="step-number">{String(number)}</span>
              <StepIcon size={25} />
              <h2>{String(title)}</h2>
              <p>{String(copy)}</p>
            </article>
          );
        })}
      </section>

      {site ? (
        <section className="agent-dashboard section-wrap">
          <div className="dashboard-title">
            <div><span>我的分站</span><h2>{site.brand_name}</h2></div>
            <span className="status-badge"><CheckCircle2 size={15} /> 运营中</span>
          </div>
          <div className="agent-stats">
            <article><span>累计生成</span><strong>{site.orders}</strong><small>笔订单</small></article>
            <article><span>累计分佣</span><strong>{site.commission}</strong><small>待结算</small></article>
            <article><span>当前分佣</span><strong>{site.commission_percent}%</strong><small>每笔订单</small></article>
            <article><span>今日订单</span><strong>{site.todayOrders}</strong><small>实时更新</small></article>
            <article>
              <span>近 7 天订单</span>
              <strong>{site.weekOrders}</strong>
              <small className={site.weekTrend < 0 ? "trend-down" : "trend-up"}>
                {site.weekTrend > 0 ? "+" : ""}{site.weekTrend}% 较前 7 天
              </small>
            </article>
            <article>
              <span>近 30 天热门功能</span>
              <strong className="operation-stat">
                {site.popularOperation ? operationLabels[site.popularOperation] ?? "图片创作" : "暂无"}
              </strong>
              <small>仅汇总类型，不展示同学提示词</small>
            </article>
          </div>
          <div className="site-link-box">
            <Link2 size={18} />
            <span>{`/s/${site.slug}`}</span>
            <button type="button" onClick={copyLink}>
              <Copy size={16} /> {copied ? "已复制" : "复制链接"}
            </button>
            <a href={`/s/${site.slug}`} target="_blank">打开分站 <ArrowRight size={16} /></a>
          </div>
          <div className="site-prices">
            <div><span>标准高清售价</span><strong>{site.standardPrice}</strong></div>
            <div><span>Pro 超清售价</span><strong>{site.proPrice}</strong></div>
            <div><span>标准四图包</span><strong>{site.standardPackPrice}</strong></div>
            <div><span>Pro 四图包</span><strong>{site.proPackPrice}</strong></div>
            <p>价格由平台后台统一配置，代理后台二期将支持在底价上自主加价。</p>
          </div>
        </section>
      ) : application || success ? (
        <section className="pending-card section-wrap">
          <div className="pending-icon"><LoaderCircle size={31} /></div>
          <span>申请已收到</span>
          <h2>正在等待审核</h2>
          <p>通常会在 1 个工作日内完成。审核通过后，这里会自动出现你的分站数据。</p>
          {application && (
            <div className="pending-detail">
              <span>{application.campus_name}</span>
              <code>/s/{application.desired_slug}</code>
            </div>
          )}
        </section>
      ) : (
        <section className="apply-section section-wrap">
          <div className="apply-copy">
            <span className="section-kicker">现在申请</span>
            <h2>成为你们学校的<br />首位校园代理。</h2>
            <ul>
              <li><BadgePercent size={18} /> 首批校园代理优先获得活动素材支持</li>
              <li><CheckCircle2 size={18} /> 分站订单、收益、积分消费实时可查</li>
              <li><Store size={18} /> 支持专属品牌名与校园宣传页</li>
            </ul>
          </div>
          <form className="apply-form" onSubmit={submit}>
            <label>学校名称<input name="campusName" placeholder="例如：浙江大学" required /></label>
            <label>联系方式<input name="contact" placeholder="微信号 / 手机号" required /></label>
            <label>
              分站英文标识
              <div className="slug-input"><span>/s/</span><input name="desiredSlug" placeholder="zju" pattern="[A-Za-z0-9-]{3,24}" required /></div>
            </label>
            <label>你准备怎么推广？<textarea name="reason" placeholder="例如：我是摄影社负责人，可以在社团群和校园墙推广…" /></label>
            {error && <div className="inline-error">{error}</div>}
            <button type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <Store size={18} />}
              {submitting ? "正在提交…" : "提交代理申请"}
            </button>
            <small>提交即表示你同意合理宣传，不进行虚假承诺或违规推广。</small>
          </form>
        </section>
      )}
    </main>
  );
}
