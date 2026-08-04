"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  LoaderCircle,
  Search,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "./brand";

type CaseCategory = {
  id: string;
  label: string;
  copy: string;
  count: number;
};

type LibraryCase = {
  id: number;
  title: string;
  image: string;
  category: string;
  categoryLabel: string;
  useCase: string;
  tags: string[];
  prompt: string;
  promptLanguage: string;
  plan: "image-2" | "image-2-Pro";
  sourceLabel: string;
  sourceUrl: string;
  githubUrl: string;
  featured: boolean;
};

type LibraryPayload = {
  total: number;
  categories: CaseCategory[];
  cases: LibraryCase[];
};

const PAGE_SIZE = 24;

export function CaseLibraryClient() {
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<LibraryCase | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/case-library/cases.json")
      .then((response) => {
        if (!response.ok) throw new Error("案例数据暂时无法读取。");
        return response.json() as Promise<LibraryPayload>;
      })
      .then((data) => {
        if (!active) return;
        setLibrary(data);
        const requestedId = Number(new URLSearchParams(window.location.search).get("case"));
        if (Number.isInteger(requestedId) && requestedId > 0) {
          setSelected(data.cases.find((item) => item.id === requestedId) ?? null);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "案例库加载失败。");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, query]);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [selected]);

  const filtered = useMemo(() => {
    if (!library) return [];
    const needle = query.trim().toLowerCase();
    return library.cases.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      const haystack = [
        item.title,
        item.categoryLabel,
        item.useCase,
        item.tags.join(" "),
        item.prompt,
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, library, query]);

  const activeCategory = library?.categories.find((item) => item.id === category);

  async function copyPrompt(item: LibraryCase) {
    await navigator.clipboard.writeText(item.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="library-page">
      <header className="library-nav">
        <Brand />
        <a href="/"><ArrowLeft size={16} /> 返回首页</a>
      </header>

      <section className="library-hero">
        <div>
          <span className="section-kicker">GPT-IMAGE-2 · CAMPUS EDITION</span>
          <h1>{library?.total ?? 517} 张案例，<br />按大学生活重新分好类。</h1>
          <p>不是漫无目的地刷图。找你正在做的任务，查看原始提示词，替换主题后直接进入创作台。</p>
        </div>
        <div className="library-hero-numbers">
          <span><strong>{library?.total ?? 517}</strong><small>真实案例</small></span>
          <span><strong>9</strong><small>大学生用途</small></span>
          <span><strong>100%</strong><small>原 Prompt 公开</small></span>
        </div>
      </section>

      <section className="library-controls">
        <label className="library-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜用途、风格或画面，例如：中国风、巨物、简历、UI…"
          />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="清空搜索"><X size={16} /></button>}
        </label>
        <div className="library-filter-title"><Filter size={15} /> 按大学生用途筛选</div>
        <div className="library-filters">
          <button className={category === "all" ? "active" : ""} type="button" onClick={() => setCategory("all")}>全部 <small>{library?.total ?? 517}</small></button>
          {library?.categories.map((item) => (
            <button className={category === item.id ? "active" : ""} key={item.id} type="button" onClick={() => setCategory(item.id)}>
              {item.label} <small>{item.count}</small>
            </button>
          ))}
        </div>
        <div className="library-result-line">
          <span>{activeCategory?.copy ?? "覆盖校园传播、学习交付、个人表达与创业实践"}</span>
          <b>{filtered.length} 个结果</b>
        </div>
      </section>

      {error ? (
        <div className="library-state"><ImageIcon size={28} /><b>{error}</b><span>刷新页面后重试。</span></div>
      ) : !library ? (
        <div className="library-state"><LoaderCircle className="spin" size={28} /><b>正在整理案例库…</b></div>
      ) : filtered.length === 0 ? (
        <div className="library-state"><Search size={28} /><b>没有找到匹配案例</b><span>试试“海报”“中国风”“人像”或“UI”。</span></div>
      ) : (
        <>
          <section className="library-grid" aria-live="polite">
            {filtered.slice(0, visibleCount).map((item) => (
              <article className="library-card" key={item.id}>
                <button type="button" className="library-card-image" onClick={() => setSelected(item)} aria-label={`查看${item.title}的完整提示词`}>
                  <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
                  <span>CASE {String(item.id).padStart(3, "0")}</span>
                  <i><Sparkles size={15} /> 查看原 Prompt</i>
                </button>
                <div className="library-card-copy">
                  <span>{item.categoryLabel}</span>
                  <h2>{item.title}</h2>
                  <p>{item.useCase}</p>
                  <div>{item.tags.slice(0, 4).map((tag) => <small key={tag}># {tag}</small>)}</div>
                  <button type="button" onClick={() => setSelected(item)}>打开配方 <ArrowRight size={15} /></button>
                </div>
              </article>
            ))}
          </section>
          {visibleCount < filtered.length && (
            <button className="library-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              再看 {Math.min(PAGE_SIZE, filtered.length - visibleCount)} 个案例
              <small>已显示 {Math.min(visibleCount, filtered.length)} / {filtered.length}</small>
            </button>
          )}
        </>
      )}

      <section className="library-note">
        <CheckCircle2 size={20} />
        <div><b>复用时，借方法，不照抄身份。</b><p>涉及真人、品牌、学校 Logo 或版权角色时，请替换成你有权使用的素材；案例来源保留在详情中。</p></div>
      </section>

      {selected && (
        <div className="library-modal" role="dialog" aria-modal="true" aria-label={`${selected.title}案例详情`}>
          <button type="button" className="library-modal-backdrop" onClick={() => setSelected(null)} aria-label="关闭案例" />
          <div className="library-dialog">
            <button className="library-dialog-close" type="button" onClick={() => setSelected(null)} aria-label="关闭"><X size={20} /></button>
            <div className="library-dialog-image"><img src={selected.image} alt={selected.title} /></div>
            <div className="library-dialog-content">
              <span className="section-kicker">{selected.categoryLabel} · CASE {String(selected.id).padStart(3, "0")}</span>
              <h2>{selected.title}</h2>
              <p>{selected.useCase}</p>
              <div className="library-dialog-tags">
                {selected.tags.map((tag) => <span key={tag}>{tag}</span>)}
                <span>{selected.plan === "image-2-Pro" ? "推荐 Pro 4K" : "标准高清可用"}</span>
                <span>{selected.promptLanguage}</span>
              </div>
              <div className="library-prompt">
                <div><b>原始完整 Prompt</b><small>{selected.prompt.length} 字符</small></div>
                <p>{selected.prompt}</p>
              </div>
              {selected.prompt.length > 1200 && <p className="library-prompt-tip">该案例提示词较长；进入创作台时会带入前 1200 字符，复制按钮会保留完整原文。</p>}
              <div className="library-source">
                <span>案例来源：{selected.sourceLabel}</span>
                {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">查看原发布 <ExternalLink size={13} /></a>}
              </div>
              <div className="library-dialog-actions">
                <button type="button" onClick={() => copyPrompt(selected)}>{copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}{copied ? "已复制完整 Prompt" : "复制完整 Prompt"}</button>
                <a href={studioPath(selected)}><WandSparkles size={17} /> 带入创作台</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function studioPath(item: LibraryCase) {
  const params = new URLSearchParams({
    prompt: item.prompt.slice(0, 1200),
    plan: item.plan,
  });
  return `/studio?${params.toString()}`;
}
