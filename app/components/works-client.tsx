"use client";

import {
  ArrowLeft,
  Download,
  History,
  Image as ImageIcon,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./brand";

type WorkItem = {
  id: string;
  prompt: string;
  plan: string;
  operation: string;
  imageCount: number;
  size: string;
  price: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

const operationLabels: Record<string, string> = {
  generate: "文字生图",
  "generate-stream": "文字生图",
  reference: "参考图生成",
  edit: "局部修改",
  variation: "生成类似",
  "remove-background": "一键去背景",
};

export function WorksClient({
  displayName,
  total,
  page,
  pageSize,
  rows,
}: {
  displayName: string;
  total: number;
  page: number;
  pageSize: number;
  rows: WorkItem[];
}) {
  const [lightbox, setLightbox] = useState<{ url: string; prompt: string } | null>(null);
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setLightbox(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="works-page">
      <header className="simple-nav">
        <Brand />
        <nav>
          <a href="/studio"><Sparkles size={16} /> 生图台</a>
          <span className="nav-sep">/</span>
          <span>我的作品</span>
        </nav>
        <div>
          <span>{displayName}</span>
          <a href="/studio"><ArrowLeft size={16} /> 返回工作台</a>
        </div>
      </header>

      <section className="works-hero">
        <History size={32} />
        <div>
          <h1>我的作品</h1>
          <p>共 {total} 件创作 · 仅你自己可见</p>
        </div>
      </section>

      {rows.length ? (
        <>
          <div className="works-grid">
            {rows.map((item) => (
              <article
                key={item.id}
                className={`work-card work-${item.status}`}
                onClick={() => item.status === "completed" && setLightbox({ url: `/api/images/${item.id}`, prompt: item.prompt })}
              >
                <div className="work-thumb">
                  {item.status === "completed" ? (
                    <img src={`/api/images/${item.id}`} alt={item.prompt} />
                  ) : item.status === "failed" ? (
                    <div className="work-failed-icon"><X size={24} /></div>
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div className="work-info">
                  <span className="work-operation">{operationLabels[item.operation] ?? "图片创作"}{item.imageCount > 1 ? ` · ${item.imageCount} 张` : ""}</span>
                  <p className="work-prompt">{item.prompt}</p>
                  <div className="work-meta">
                    <span>{item.plan === "image-2-Pro" ? "Pro" : "标准"}</span>
                    <span>{item.price}</span>
                    <span>{item.createdAt.replace("T", " ").slice(0, 16)}</span>
                  </div>
                  {item.status === "failed" && item.errorMessage && (
                    <p className="work-error">{item.errorMessage}</p>
                  )}
                </div>
                {item.status === "completed" && (
                  <div className="work-actions">
                    <a href={`/api/images/${item.id}`} download={`pixel-${item.id}.png`} onClick={(e) => e.stopPropagation()}><Download size={14} /></a>
                    <a href={`/api/images/${item.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Maximize2 size={14} /></a>
                  </div>
                )}
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="works-pagination">
              {page > 1 && <a href={`/works?page=${page - 1}`}>上一页</a>}
              <span>第 {page} / {totalPages} 页</span>
              {page < totalPages && <a href={`/works?page=${page + 1}`}>下一页</a>}
            </div>
          )}
        </>
      ) : (
        <div className="works-empty">
          <Sparkles size={40} />
          <h2>还没有作品</h2>
          <p>去生图台创作你的第一张图吧。</p>
          <a href="/studio">开始创作</a>
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" type="button" onClick={() => setLightbox(null)}><X size={24} /></button>
            <img src={lightbox.url} alt={lightbox.prompt} />
            <p>{lightbox.prompt}</p>
          </div>
        </div>
      )}
    </main>
  );
}
