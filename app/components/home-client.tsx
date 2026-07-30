"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  GraduationCap,
  Image as ImageIcon,
  Layers3,
  Megaphone,
  MousePointer2,
  Palette,
  Sparkles,
  Store,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";

const promptIdeas = [
  "社团招新海报",
  "毕设概念图",
  "小红书封面",
  "校园活动 KV",
];

export function HomeClient({
  userName,
  prices,
}: {
  userName: string | null;
  prices: { standard: number; pro: number };
}) {
  const [prompt, setPrompt] = useState(
    "为大学摄影社设计一张春季招新海报，胶片质感，明亮蓝黄色，年轻有活力",
  );
  const [plan, setPlan] = useState<"image-2" | "image-2-Pro">("image-2");

  const studioHref = `/studio?prompt=${encodeURIComponent(prompt)}&plan=${encodeURIComponent(plan)}`;
  const standardPrice = `¥${(prices.standard / 100).toFixed(2)}`;
  const proPrice = `¥${(prices.pro / 100).toFixed(2)}`;

  return (
    <main>
      <header className="site-nav">
        <Brand />
        <nav aria-label="主导航">
          <a href="#works">灵感样张</a>
          <a href="#pricing">价格</a>
          <a href="/agent">校园代理</a>
        </nav>
        <div className="nav-actions">
          {userName && <span className="hello">Hi，{firstName(userName)}</span>}
          <a className="button button-dark button-small" href="/studio">
            <WandSparkles size={16} />
            开始创作
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>专为大学生</span>
            <span className="eyebrow-dot" />
            只认真做生图
          </div>
          <h1>
            把脑子里的画面，
            <br />
            变成今晚<span className="marker">就能交</span>的图。
          </h1>
          <p>
            从社团招新到毕设概念，一句话生成可直接用的高质量图片。
            不订阅、不囤点，生成一次付一次。
          </p>
          <div className="hero-proof">
            <span>
              <BadgeCheck size={17} /> 2K / 4K 输出
            </span>
            <span>
              <BadgeCheck size={17} /> 按次计费
            </span>
            <span>
              <BadgeCheck size={17} /> 提示词友好
            </span>
          </div>
        </div>

        <div className="generator-shell" aria-label="生图体验预览">
          <div className="shell-tape">今天也要准时交图</div>
          <div className="generator-top">
            <div>
              <span className="step-label">01 / 写下画面</span>
              <h2>这次想生成什么？</h2>
            </div>
            <span className="online-dot">服务在线</span>
          </div>

          <label className="prompt-box">
            <span className="sr-only">图片提示词</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={800}
            />
            <span className="prompt-count">{prompt.length} / 800</span>
          </label>

          <div className="idea-row" aria-label="提示词模板">
            {promptIdeas.map((idea) => (
              <button key={idea} type="button" onClick={() => setPrompt(idea)}>
                + {idea}
              </button>
            ))}
          </div>

          <div className="plan-row">
            <button
              className={plan === "image-2" ? "plan-option active" : "plan-option"}
              type="button"
              onClick={() => setPlan("image-2")}
            >
              <span className="radio-dot" />
              <span>
                <b>标准高清</b>
                <small>2K 以下 · 日常够用</small>
              </span>
              <strong>{standardPrice}</strong>
            </button>
            <button
              className={
                plan === "image-2-Pro" ? "plan-option active" : "plan-option"
              }
              type="button"
              onClick={() => setPlan("image-2-Pro")}
            >
              <span className="radio-dot" />
              <span>
                <b>Pro 超清</b>
                <small>最高 4K · 细节拉满</small>
              </span>
              <strong>{proPrice}</strong>
            </button>
          </div>

          <a className="generate-cta" href={studioHref}>
            <Sparkles size={20} fill="currentColor" />
            立即生成
            <span>{plan === "image-2" ? `${standardPrice} / 次` : `${proPrice} / 次`}</span>
          </a>
          <p className="microcopy">新同学注册即送 ¥5.00 体验余额</p>
        </div>
      </section>

      <section className="ticker" aria-label="适用场景">
        <div>
          <span>社团招新</span>
          <i>✦</i>
          <span>课程作业</span>
          <i>✦</i>
          <span>毕业设计</span>
          <i>✦</i>
          <span>自媒体封面</span>
          <i>✦</i>
          <span>校园创业</span>
          <i>✦</i>
          <span>电商配图</span>
        </div>
      </section>

      <section className="showcase section-wrap" id="works">
        <div className="section-heading">
          <div>
            <span className="section-kicker">灵感样张</span>
            <h2>不只“能看”，更要拿得出手。</h2>
          </div>
          <p>为大学生最常见的创作场景调好比例与画质，少折腾参数，多留时间做正事。</p>
        </div>

        <div className="art-grid">
          <article className="art-card art-card-main">
            <div className="poster poster-club">
              <div className="poster-stamp">JOIN US</div>
              <span>YOUTH<br />PHOTO<br />CLUB</span>
              <b>春日摄影社 · 招新计划</b>
              <div className="poster-orbit" />
            </div>
            <div className="art-meta">
              <span>校园海报</span>
              <small>3:4 · image-2</small>
            </div>
          </article>
          <article className="art-card">
            <div className="poster poster-arch">
              <div className="arch-sun" />
              <div className="arch-building">
                <i /><i /><i />
              </div>
              <b>共享学习舱<br />概念设计</b>
              <small>GRADUATION PROJECT 2026</small>
            </div>
            <div className="art-meta">
              <span>毕设概念</span>
              <small>4K · image-2-Pro</small>
            </div>
          </article>
          <article className="art-card">
            <div className="poster poster-social">
              <span className="social-top">我的校园日常</span>
              <div className="social-cloud cloud-a" />
              <div className="social-cloud cloud-b" />
              <div className="social-figure">
                <GraduationCap size={44} />
              </div>
              <b>今天也在<br />认真生活！</b>
            </div>
            <div className="art-meta">
              <span>社媒封面</span>
              <small>3:4 · image-2</small>
            </div>
          </article>
        </div>
      </section>

      <section className="use-cases">
        <div className="section-wrap">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">一站搞定</span>
              <h2>你的创意，不该被工具卡住。</h2>
            </div>
          </div>
          <div className="feature-grid">
            {[
              [Palette, "设计作业", "快速找方向，给版式和视觉更多可能。"],
              [BookOpen, "论文 / 汇报", "生成封面、插图与概念视觉，让表达更直观。"],
              [Megaphone, "社团宣传", "招新、活动、比赛，一句话完成主视觉。"],
              [Layers3, "自媒体创作", "封面、配图、海报，持续更新不缺素材。"],
            ].map(([Icon, title, copy], index) => {
              const FeatureIcon = Icon as typeof Palette;
              return (
                <article key={String(title)} className={`feature feature-${index + 1}`}>
                  <span><FeatureIcon size={24} /></span>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pricing section-wrap" id="pricing">
        <div className="section-heading">
          <div>
            <span className="section-kicker">按次付费</span>
            <h2>不办会员，也没有用不完的点数。</h2>
          </div>
          <p>后台可随时调整前台价格。系统按生成请求扣费，失败自动退回余额。</p>
        </div>
        <div className="price-grid">
          <article className="price-card">
            <div className="price-head">
              <span>image-2</span>
              <ImageIcon size={28} />
            </div>
            <h3>标准高清</h3>
            <div className="big-price"><sup>¥</sup>{standardPrice.slice(1)}<small>/ 次</small></div>
            <p>适合日常海报、社媒封面和课程配图。</p>
            <ul>
              <li><Check size={17} /> 支持 1:1 / 3:2 / 2:3</li>
              <li><Check size={17} /> 最高 2K 以下分辨率</li>
              <li><Check size={17} /> 快速出图</li>
            </ul>
            <a href="/studio?plan=image-2">选标准高清 <ArrowRight size={17} /></a>
          </article>
          <article className="price-card price-card-pro">
            <div className="popular-tag">适合交稿</div>
            <div className="price-head">
              <span>image-2-Pro</span>
              <Zap size={28} fill="currentColor" />
            </div>
            <h3>Pro 超清</h3>
            <div className="big-price"><sup>¥</sup>{proPrice.slice(1)}<small>/ 次</small></div>
            <p>适合毕设、印刷海报和需要放大查看的作品。</p>
            <ul>
              <li><Check size={17} /> 支持 1:1 / 16:9 / 9:16</li>
              <li><Check size={17} /> 最高 4K 全分辨率</li>
              <li><Check size={17} /> 精细文字与材质</li>
            </ul>
            <a href="/studio?plan=image-2-Pro">选 Pro 超清 <ArrowRight size={17} /></a>
          </article>
        </div>
      </section>

      <section className="agent-cta">
        <div className="agent-visual">
          <div className="campus-card card-back">
            <Store size={32} />
            <b>你的校园分站</b>
            <span>campus.pixel-monitor.cn</span>
          </div>
          <div className="campus-card card-front">
            <span className="card-label">本月收益</span>
            <strong>¥ 1,286.40</strong>
            <div className="mini-chart"><i /><i /><i /><i /><i /><i /></div>
            <small>每一次生成，都有你的分成</small>
          </div>
        </div>
        <div className="agent-copy">
          <span className="section-kicker light">校园合伙人</span>
          <h2>把好用的工具带回学校，<br />顺便赚下第一桶金。</h2>
          <p>申请校园代理，免费开通专属分站。你负责分享，我们负责模型、计费和运维。</p>
          <div className="agent-points">
            <span><MousePointer2 size={18} /> 独立分站链接</span>
            <span><Store size={18} /> 自定义品牌与售价</span>
            <span><GraduationCap size={18} /> 订单实时分佣</span>
          </div>
          <a className="button button-acid" href="/agent">
            申请校园代理 <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer>
        <Brand compact />
        <p>让每一个想法，都能被看见。AI 生成内容，请合理使用。</p>
        <div>
          <a href="/studio">创作台</a>
          <a href="/agent">校园代理</a>
          <a href="/admin">管理后台</a>
        </div>
      </footer>
    </main>
  );
}

function firstName(name: string) {
  return name.includes("@") ? name.split("@")[0] : name.slice(0, 10);
}
