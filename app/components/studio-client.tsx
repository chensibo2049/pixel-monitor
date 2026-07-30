"use client";

import {
  ArrowLeft,
  Clock3,
  Download,
  History,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Maximize2,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "./brand";

type Plan = "image-2" | "image-2-Pro";
type Aspect = "square" | "portrait" | "landscape";
type HistoryItem = {
  id: string;
  prompt: string;
  plan: string;
  size: string;
  price: string;
  status: string;
  createdAt: string;
};

export function StudioClient({
  displayName,
  initialBalanceCents,
  prices,
  history,
}: {
  displayName: string;
  initialBalanceCents: number;
  prices: { standard: number; pro: number };
  history: HistoryItem[];
}) {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan>("image-2");
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [subsite, setSubsite] = useState("");
  const [balance, setBalance] = useState(initialBalanceCents);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    id: string;
    imageUrl: string;
    revisedPrompt?: string | null;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get("prompt");
    const initialPlan = params.get("plan");
    if (initialPrompt) setPrompt(initialPrompt.slice(0, 800));
    if (initialPlan === "image-2-Pro") setPlan("image-2-Pro");
    setSubsite(params.get("site") ?? "");
  }, []);

  const selectedPrice = plan === "image-2-Pro" ? prices.pro : prices.standard;
  const aspectLabel = useMemo(
    () =>
      ({
        square: "1:1",
        portrait: plan === "image-2-Pro" ? "9:16 · 4K" : "2:3",
        landscape: plan === "image-2-Pro" ? "16:9 · 4K" : "3:2",
      })[aspect],
    [aspect, plan],
  );

  async function generate() {
    if (prompt.trim().length < 4) {
      setError("先写一句你想生成的画面吧。");
      return;
    }
    setError("");
    setResult(null);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, plan, aspect, subsite }),
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        imageUrl?: string;
        revisedPrompt?: string | null;
        balanceCents?: number;
      };
      if (!response.ok || !data.id || !data.imageUrl) {
        throw new Error(data.error ?? "生成失败，请稍后再试。");
      }
      setResult({
        id: data.id,
        imageUrl: data.imageUrl,
        revisedPrompt: data.revisedPrompt,
      });
      if (typeof data.balanceCents === "number") setBalance(data.balanceCents);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "生成失败，请稍后再试。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand compact />
        <nav>
          <a className="active" href="/studio"><WandSparkles size={18} /> AI 生图</a>
          <a href="#history"><History size={18} /> 我的作品</a>
          <a href="/agent"><LayoutGrid size={18} /> 校园分站</a>
          <a href="/"><ArrowLeft size={18} /> 返回首页</a>
        </nav>
        <div className="sidebar-user">
          <span><UserRound size={17} /></span>
          <div>
            <b>{displayName}</b>
            <small>学生创作者</small>
          </div>
          <a href="/signout-with-chatgpt?return_to=/" aria-label="退出登录">
            <LogOut size={16} />
          </a>
        </div>
      </aside>

      <section className="studio-main">
        <header className="studio-header">
          <div>
            <span className="studio-mobile-brand"><Brand compact /></span>
            <h1>AI 生图工作台</h1>
            <p>描述越具体，画面越接近你想要的样子。</p>
          </div>
          <div className="balance-pill">
            <span>可用余额</span>
            <strong>¥{(balance / 100).toFixed(2)}</strong>
          </div>
        </header>

        <div className="studio-grid">
          <div className="studio-controls">
            <section className="control-card">
              <div className="control-title">
                <span>01</span>
                <div><h2>描述你的画面</h2><p>支持中文自然语言</p></div>
              </div>
              <label className="studio-prompt">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="例如：一张大学音乐节的竖版主视觉，傍晚操场，年轻人群，胶片颗粒，蓝橙撞色，标题留白…"
                  maxLength={800}
                />
                <span>{prompt.length} / 800</span>
              </label>
              <div className="template-line">
                <span>灵感：</span>
                {["社团招新海报", "毕设空间概念", "校园市集封面"].map(
                  (text) => (
                    <button key={text} type="button" onClick={() => setPrompt(text)}>
                      {text}
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="control-card">
              <div className="control-title">
                <span>02</span>
                <div><h2>选择画质</h2><p>按作品用途选择</p></div>
              </div>
              <div className="studio-plan-grid">
                <button
                  className={plan === "image-2" ? "studio-plan selected" : "studio-plan"}
                  type="button"
                  onClick={() => setPlan("image-2")}
                >
                  <ImageIcon size={21} />
                  <div><b>标准高清</b><small>2K 以下 · 快速出图</small></div>
                  <strong>¥{(prices.standard / 100).toFixed(2)}</strong>
                </button>
                <button
                  className={plan === "image-2-Pro" ? "studio-plan selected" : "studio-plan"}
                  type="button"
                  onClick={() => setPlan("image-2-Pro")}
                >
                  <Sparkles size={21} />
                  <div><b>Pro 超清</b><small>最高 4K · 精细交稿</small></div>
                  <strong>¥{(prices.pro / 100).toFixed(2)}</strong>
                </button>
              </div>
            </section>

            <section className="control-card">
              <div className="control-title">
                <span>03</span>
                <div><h2>画面比例</h2><p>已自动匹配分辨率</p></div>
              </div>
              <div className="aspect-row">
                {[
                  ["square", "1:1", "方形"],
                  ["portrait", "2:3", "竖版"],
                  ["landscape", "3:2", "横版"],
                ].map(([value, ratio, label]) => (
                  <button
                    key={value}
                    className={aspect === value ? "selected" : ""}
                    type="button"
                    onClick={() => setAspect(value as Aspect)}
                  >
                    <i className={`ratio-shape ratio-${value}`} />
                    <span><b>{ratio}</b><small>{label}</small></span>
                  </button>
                ))}
              </div>
            </section>

            {error && <div className="inline-error">{error}</div>}
            <button
              className="studio-generate"
              type="button"
              onClick={generate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <LoaderCircle className="spin" size={21} />
              ) : (
                <Sparkles size={21} fill="currentColor" />
              )}
              {isGenerating ? "正在认真画…" : "生成图片"}
              <span>本次 ¥{(selectedPrice / 100).toFixed(2)}</span>
            </button>
            <p className="studio-note">
              <Clock3 size={14} /> 通常 20—60 秒完成；失败不扣费
            </p>
          </div>

          <div className="result-panel">
            <div className="result-toolbar">
              <span>生成预览</span>
              <small>{aspectLabel}</small>
            </div>
            <div className={`result-canvas result-${aspect}`}>
              {isGenerating ? (
                <div className="generating-state">
                  <div className="generation-orbit"><Sparkles size={28} /></div>
                  <h3>正在把文字变成画面</h3>
                  <p>复杂构图和 4K 图片会多等一会儿</p>
                </div>
              ) : result ? (
                <>
                  <img src={result.imageUrl} alt={prompt} />
                  <div className="result-actions">
                    <a href={result.imageUrl} download={`pixel-${result.id}.png`}>
                      <Download size={17} /> 下载原图
                    </a>
                    <a href={result.imageUrl} target="_blank" rel="noreferrer">
                      <Maximize2 size={17} /> 查看原图
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-result">
                  <div className="empty-art">
                    <span>YOUR<br />IDEA</span>
                    <i />
                    <Sparkles size={38} />
                  </div>
                  <h3>你的作品会出现在这里</h3>
                  <p>在左边写下画面，然后按下生成。</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="history-section" id="history">
          <div className="history-head">
            <div><span>最近创作</span><small>仅你自己可见</small></div>
            <History size={19} />
          </div>
          {history.length ? (
            <div className="history-grid">
              {history.map((item) => (
                <article key={item.id}>
                  <div className="history-thumb">
                    {item.status === "completed" ? (
                      <img src={`/api/images/${item.id}`} alt={item.prompt} />
                    ) : (
                      <ImageIcon size={24} />
                    )}
                  </div>
                  <div>
                    <p>{item.prompt}</p>
                    <small>{item.plan} · {item.size} · {item.price}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="history-empty">第一张图，就从今天开始。</div>
          )}
        </section>
      </section>
    </div>
  );
}
