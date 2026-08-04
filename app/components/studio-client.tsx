"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  Eraser,
  History,
  Image as ImageIcon,
  Images,
  ImageUp,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Maximize2,
  Palette,
  ScanLine,
  Scissors,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";

// Polyfill for crypto.randomUUID in non-secure contexts (HTTP)
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  crypto.randomUUID = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "./brand";
import { MaskEditor } from "./mask-editor";
import { NotificationBell } from "./notification-bell";
import { LOGO_POSITIONS, type BrandProfile, type LogoPosition } from "../lib/brand-profile";
import { IMAGE_ASPECTS, IMAGE_SIZES, type ImageAspect, type ImagePlan } from "../lib/image-options";

type Plan = ImagePlan;
type Aspect = ImageAspect;
type Mode = "generate" | "edit" | "variation" | "remove-background";
type Operation = Mode | "reference" | "generate-logo" | "reference-logo";
type HistoryItem = {
  id: string;
  prompt: string;
  plan: string;
  operation: string;
  imageCount: number;
  size: string;
  price: string;
  status: string;
  createdAt: string;
};
type ResultAsset = { position: number; url: string };

type GenTask = {
  id: string;
  prompt: string;
  operation: Operation;
  status: "pending" | "streaming" | "completed" | "failed";
  progress: number;
  progressiveImage: string;
  startedAt: number;
  endedAt: number;
  elapsed: number;
  error: string;
  assets: ResultAsset[];
  balanceCents?: number;
  priceCents: number;
};

const operationLabels: Record<string, string> = {
  generate: "文字生图",
  "generate-stream": "文字生图",
  "generate-logo": "Logo 海报",
  reference: "参考图生成",
  "reference-logo": "参考图 + Logo",
  edit: "局部修改",
  variation: "生成类似",
  "remove-background": "一键去背景",
};

const modes: Array<{ id: Mode; label: string; copy: string; icon: typeof Sparkles }> = [
  { id: "generate", label: "AI 创作", copy: "文字或参考图都在这里", icon: Sparkles },
  { id: "edit", label: "局部修改", copy: "涂白区域再重绘", icon: ScanLine },
  { id: "variation", label: "生成类似", copy: "一键得到 4 个变体", icon: Images },
  { id: "remove-background", label: "一键去背景", copy: "透明底 PNG 素材", icon: Scissors },
];

const quickTemplates = [
  {
    label: "社团招新",
    prompt: "为【社团名称】设计竖版 3:4 招新海报，主标题【春日招新计划】，时间【05月18日 19:00】，地点【大学生活动中心】，主持人【林同学】，主办【校团委 / 社团名称】。底部使用清晰信息栅格；校园生活场景，年轻有活力，完整正视海报，不要样机、水印和二维码。",
  },
  {
    label: "校园讲座",
    prompt: "设计一张竖版 3:4 校园公开课海报，主题【未来与我们】，嘉宾【周教授】，主持人【陈老师】，时间【05月25日 14:00】，地点【图书馆报告厅】，主办【学生发展中心】。瑞士编辑排版、钴蓝和暖白配色，信息清晰可读。",
  },
  {
    label: "毕业设计展",
    prompt: "设计竖版 3:4 毕业设计展海报，主题【未完待续】，展期【06月10日—06月20日】，地点【美术馆一号厅】，开幕主持【李老师】，主办【设计学院】。概念空间装置、艺术院校编辑排版、克制高级，完整正视海报。",
  },
  {
    label: "政务宣传",
    prompt: "为【单位名称】设计竖版 3:4 政务文化宣传海报，主题【实干担当 服务为民】，时间【2026年8月18日】，地点【机关报告厅】，主办【单位名称】。采用端正宋体标题、朱砂红印章、米白宣纸、远山与松柏元素，版式庄重克制、信息准确清晰，适合机关单位正式发布，不使用娱乐化表情、夸张霓虹、水印和二维码。",
  },
];

const stylePresets = [
  { id: "", label: "自动匹配", description: "让模型按内容判断最佳视觉风格" },
  { id: "riso", label: "孔版印刷", description: "有限色、错版套印、纸张颗粒、独立杂志感" },
  { id: "swiss", label: "瑞士排版", description: "严格栅格、强字号对比、大量留白、编辑设计" },
  { id: "y2k", label: "Y2K 金属", description: "液态铬金属、钴蓝霓虹、高反射、未来感" },
  { id: "architect", label: "建筑极简", description: "空间模型、亚克力材质、克制配色、博物馆光线" },
  { id: "sports", label: "运动拼贴", description: "低机位摄影、速度线、丝网印刷、高饱和撞色" },
  { id: "gov-guofeng", label: "国风政务", description: "宣纸米白、朱砂红、黛墨与鎏金点缀，宋体式端正标题，松柏远山和印章元素，庄重、克制、可信，适合机关事业单位正式传播" },
];

export function StudioClient({
  displayName,
  subsiteContext,
  initialBalanceCents,
  initialBrandProfile,
  prices,
  history,
}: {
  displayName: string;
  subsiteContext: { slug: string; brand_name: string; campus_name: string; permanent: boolean } | null;
  initialBalanceCents: number;
  initialBrandProfile: BrandProfile;
  prices: { standard: number; pro: number; standardPack: number; proPack: number; editDiscount: number };
  history: HistoryItem[];
}) {
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan>("image-2");
  const [aspect, setAspect] = useState<Aspect>("portrait-34");
  const [style, setStyle] = useState("");
  const [count, setCount] = useState<1 | 4>(1);
  const [transparent, setTransparent] = useState(false);
  const [subsite, setSubsite] = useState(subsiteContext?.slug ?? "");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [maskBlob, setMaskBlob] = useState<Blob | null>(null);
  const [balance, setBalance] = useState(initialBalanceCents);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<GenTask[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const [lightbox, setLightbox] = useState<{ url: string; prompt: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [brandProfile, setBrandProfile] = useState(initialBrandProfile);
  const [brandPrompt, setBrandPrompt] = useState(initialBrandProfile.defaultPrompt);
  const [brandDefaultPosition, setBrandDefaultPosition] = useState<LogoPosition>(initialBrandProfile.defaultPosition);
  const [brandUseByDefault, setBrandUseByDefault] = useState(initialBrandProfile.useByDefault);
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState(initialBrandProfile.logoUrl ?? "");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMessage, setBrandMessage] = useState("");
  const [useLogo, setUseLogo] = useState(initialBrandProfile.hasLogo && initialBrandProfile.useByDefault);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(initialBrandProfile.defaultPosition);
  const [logoRequirements, setLogoRequirements] = useState("");
  const [logoExpanded, setLogoExpanded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get("prompt");
    if (initialPrompt) setPrompt(initialPrompt.slice(0, 1200));
    if (params.get("plan") === "image-2-Pro") setPlan("image-2-Pro");
    // A permanently attributed account must never be visually downgraded by a
    // missing or forged query string. The API enforces the same precedence.
    setSubsite(subsiteContext?.slug ?? params.get("site") ?? "");
    // URL 带 prompt 时默认用文字生图模式
    if (initialPrompt) setMode("generate");
  }, [subsiteContext?.slug]);

  useEffect(() => () => { if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);
  useEffect(() => () => { if (brandLogoPreview.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview); }, [brandLogoPreview]);

  const effectiveCount = mode === "variation" ? 4 : count;
  const singlePrice = plan === "image-2-Pro" ? prices.pro : prices.standard;
  const packPrice = plan === "image-2-Pro" ? prices.proPack : prices.standardPack;
  const selectedPrice = mode === "edit" || mode === "remove-background"
    ? Math.max(1, Math.ceil((singlePrice * prices.editDiscount) / 100))
    : effectiveCount === 4 ? packPrice : singlePrice;
  const aspectOption = useMemo(() => IMAGE_ASPECTS.find((item) => item.id === aspect) ?? IMAGE_ASPECTS[0], [aspect]);
  const aspectLabel = `${aspectOption.ratio} · ${IMAGE_SIZES[plan][aspect]}`;
  const logoActive = mode === "generate" && brandProfile.hasLogo && useLogo;

  // Timer for elapsed time display
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTasks((prev) => {
        const now = Date.now();
        let changed = false;
        const next = prev.map((t) => {
          if (t.status === "pending" || t.status === "streaming") {
            changed = true;
            return { ...t, elapsed: Math.floor((now - t.startedAt) / 1000) };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function pickSource(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) return;
    if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceFile(next);
    setSourceUrl(URL.createObjectURL(next));
    setMaskBlob(null);
    setError("");
  }

  function clearSource() {
    if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl("");
    setMaskBlob(null);
  }

  function pickBrandLogo(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) return;
    if (brandLogoPreview.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview);
    setBrandLogoFile(next);
    setBrandLogoPreview(URL.createObjectURL(next));
    setUseLogo(false);
    setBrandMessage("新 Logo 待保存");
  }

  async function saveBrandSettings() {
    setBrandSaving(true);
    setBrandMessage("");
    try {
      const form = new FormData();
      if (brandLogoFile) form.set("logo", brandLogoFile);
      form.set("defaultPrompt", brandPrompt);
      form.set("defaultPosition", brandDefaultPosition);
      form.set("useByDefault", String(brandUseByDefault));
      const response = await fetch("/api/brand-profile", { method: "POST", body: form });
      const text = await response.text();
      let data: { error?: string; profile?: BrandProfile };
      try {
        data = JSON.parse(text) as { error?: string; profile?: BrandProfile };
      } catch {
        throw new Error(response.status === 401 ? "请先登录后再保存。" : "服务器返回了无效的响应。");
      }
      if (!response.ok || !data.profile) throw new Error(data.error ?? "品牌设置保存失败。");
      if (brandLogoPreview.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview);
      setBrandProfile(data.profile);
      setBrandPrompt(data.profile.defaultPrompt);
      setBrandDefaultPosition(data.profile.defaultPosition);
      setBrandUseByDefault(data.profile.useByDefault);
      setBrandLogoPreview(data.profile.logoUrl ?? "");
      setBrandLogoFile(null);
      setLogoPosition(data.profile.defaultPosition);
      setUseLogo(data.profile.hasLogo && data.profile.useByDefault);
      setBrandMessage(data.profile.hasLogo ? "已保存到当前账号，后续无需重复上传" : "默认说明已保存");
      setLogoExpanded(false);
    } catch (requestError) {
      setBrandMessage(requestError instanceof Error ? requestError.message : "品牌设置保存失败。");
    } finally {
      setBrandSaving(false);
    }
  }

  async function deleteBrandLogo() {
    setBrandSaving(true);
    setBrandMessage("");
    try {
      const response = await fetch("/api/brand-profile", { method: "DELETE" });
      const data = (await response.json()) as { error?: string; profile?: BrandProfile };
      if (!response.ok || !data.profile) throw new Error(data.error ?? "Logo 移除失败。");
      if (brandLogoPreview.startsWith("blob:")) URL.revokeObjectURL(brandLogoPreview);
      setBrandProfile(data.profile);
      setBrandPrompt(data.profile.defaultPrompt);
      setBrandDefaultPosition(data.profile.defaultPosition);
      setBrandUseByDefault(data.profile.useByDefault);
      setBrandLogoPreview("");
      setBrandLogoFile(null);
      setUseLogo(false);
      setBrandMessage("Logo 已从当前账号移除");
    } catch (requestError) {
      setBrandMessage(requestError instanceof Error ? requestError.message : "Logo 移除失败。");
    } finally {
      setBrandSaving(false);
    }
  }

  function updateTask(taskId: string, patch: Partial<GenTask>) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  async function generate() {
    if (mode !== "remove-background" && mode !== "variation" && prompt.trim().length < 4) {
      setError("先写一句你想生成或修改的画面吧。");
      return;
    }
    if (mode !== "generate" && !sourceFile) {
      setError("请先上传一张参考图或原图。");
      return;
    }
    if (mode === "edit" && !maskBlob) {
      setError("请在原图上涂白需要重绘的区域。");
      return;
    }
    setError("");
    const styleDescription = stylePresets.find((p) => p.id === style)?.description;
    const generationPrompt = styleDescription
      ? `${prompt}\n风格要求：${styleDescription}`.slice(0, 1200)
      : prompt.slice(0, 1200);
    const taskId = crypto.randomUUID();
    const operation: Operation = mode === "generate"
      ? logoActive
        ? sourceFile ? "reference-logo" : "generate-logo"
        : sourceFile ? "reference" : "generate"
      : mode;
    const task: GenTask = {
      id: taskId,
      prompt: prompt.slice(0, 60),
      operation,
      status: "pending",
      progress: 0,
      progressiveImage: "",
      startedAt: Date.now(),
      endedAt: 0,
      elapsed: 0,
      error: "",
      assets: [],
      priceCents: selectedPrice,
    };
    setTasks((prev) => [task, ...prev]);

    try {
      let data: { error?: string; id?: string; imageUrl?: string; images?: ResultAsset[]; balanceCents?: number };
      if (mode === "generate" && !sourceFile && count === 1) {
        data = await submitStreamingGenerate(taskId, generationPrompt);
      } else {
        updateTask(taskId, { status: "streaming", progress: 10 });
        const response = mode === "generate" && sourceFile
          ? await submitImageTool(generationPrompt, "reference")
          : mode === "generate"
            ? await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: generationPrompt,
              plan,
              aspect,
              subsite,
              count,
              transparent,
              useLogo: logoActive,
              logoPosition,
              logoRequirements,
            }),
          })
            : await submitImageTool(generationPrompt, mode);
        data = (await response.json()) as typeof data;
        if (!response.ok) throw new Error(data.error ?? "生成失败，请稍后再试。");
      }
      if (!data.id || !data.imageUrl) throw new Error(data.error ?? "生成失败，请稍后再试。");
      updateTask(taskId, {
        status: "completed",
        progress: 100,
        endedAt: Date.now(),
        elapsed: Math.floor((Date.now() - task.startedAt) / 1000),
        assets: data.images?.length ? data.images : [{ position: 0, url: data.imageUrl }],
        balanceCents: data.balanceCents,
      });
      if (typeof data.balanceCents === "number") setBalance(data.balanceCents);
    } catch (err) {
      updateTask(taskId, {
        status: "failed",
        endedAt: Date.now(),
        error: err instanceof Error ? err.message : "生成失败，请稍后再试。",
      });
    }
  }

  async function submitStreamingGenerate(taskId: string, generationPrompt: string) {
    const response = await fetch("/api/generate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: generationPrompt,
        plan,
        aspect,
        transparent,
        subsite,
        useLogo: logoActive,
        logoPosition,
        logoRequirements,
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "流式生成启动失败。");
    }
    if (!response.body) throw new Error("浏览器无法读取流式结果。");
    updateTask(taskId, { status: "streaming", progress: 5 });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let partialCount = 0;
    let completed: { id?: string; imageUrl?: string; images?: ResultAsset[]; balanceCents?: number; error?: string } | null = null;
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let event: { type: string; image?: string; error?: string; id?: string; imageUrl?: string; images?: ResultAsset[]; balanceCents?: number };
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type === "partial" && event.image) {
          partialCount++;
          const progress = Math.min(90, 10 + partialCount * 20);
          updateTask(taskId, { progressiveImage: event.image, progress });
        }
        if (event.type === "error") throw new Error(event.error ?? "流式生成中断。");
        if (event.type === "completed") completed = event;
      }
      if (done) break;
    }
    if (!completed) throw new Error("流式服务未返回最终结果。");
    return completed;
  }

  async function submitImageTool(generationPrompt: string, action: Operation) {
    const form = new FormData();
    form.set("action", action);
    form.set("image", sourceFile as File);
    form.set("prompt", generationPrompt);
    form.set("plan", plan);
    form.set("aspect", aspect);
    form.set("count", String(effectiveCount));
    form.set("transparent", String(transparent));
    if (action === "reference") {
      form.set("useLogo", String(logoActive));
      form.set("logoPosition", logoPosition);
      form.set("logoRequirements", logoRequirements);
    }
    if (subsite) form.set("subsite", subsite);
    if (action === "edit" && maskBlob) form.set("mask", maskBlob, "mask.png");
    return fetch("/api/image-tools", { method: "POST", body: form });
  }

  function handleResultAs(nextMode: "reference" | "edit" | "variation", asset: ResultAsset) {
    fetch(asset.url)
      .then((r) => { if (!r.ok) throw new Error(`加载失败 (${r.status})`); return r.blob(); })
      .then((blob) => {
        const file = new File([blob], `generated-${asset.position}.webp`, { type: blob.type || "image/webp" });
        if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
        const nextUrl = URL.createObjectURL(file);
        setSourceFile(file);
        setSourceUrl(nextUrl);
        setMaskBlob(null);
        setMode(nextMode === "reference" ? "generate" : nextMode);
        if (nextMode === "edit") setPrompt("把我涂白的区域改成【夜景 / 新背景 / 新物体】，其他区域保持不变");
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "无法加载图片。"));
  }

  function formatElapsed(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  }

  function removeTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function pickFromHistory(item: HistoryItem) {
    if (item.status !== "completed") return;
    const url = `/api/images/${item.id}`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `history-${item.id}.webp`, { type: blob.type || "image/webp" });
      if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      setSourceFile(file);
      setSourceUrl(URL.createObjectURL(file));
      setMaskBlob(null);
      setShowPicker(false);
      setError("");
    } catch {
      setError("无法加载该图片。");
    }
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand compact />
        <nav>
          <a className="active" href="/studio"><WandSparkles size={18} /> AI 生图</a>
          <a href="/works"><History size={18} /> 我的作品</a>
          <a href="/#recipes"><BookOpenCheck size={18} /> 案例配方库</a>
          <a href="/agent"><LayoutGrid size={18} /> 校园分站</a>
          <a href="/"><ArrowLeft size={18} /> 返回首页</a>
        </nav>
        <div className="sidebar-user">
          <NotificationBell />
          <span><UserRound size={17} /></span>
          <div><b>{displayName}</b><small>学生创作者</small></div>
          <a href="/api/auth/logout?returnTo=/" aria-label="退出登录"><LogOut size={16} /></a>
        </div>
      </aside>

      <section className="studio-main">
        <header className="studio-header">
          <div><span className="studio-mobile-brand"><Brand compact /></span><h1>AI 生图工作台</h1><p>从生成到局部修改，都在同一个创作流程里。</p></div>
          <div className="balance-pill"><span>可用积分</span><strong>{balance} 积分</strong></div>
        </header>
        {subsiteContext && (
          <div className="subsite-order-banner">
            <LayoutGrid size={17} />
            <span>当前通过 <b>{subsiteContext.brand_name}</b> 下单</span>
            <small>{subsiteContext.campus_name}校园分站 · {subsiteContext.permanent ? "账号已永久归属该分站" : "本单自动计入代理分佣"}</small>
          </div>
        )}

        <div className="studio-mode-grid">
          {modes.map(({ id, label, copy, icon: Icon }) => (
            <button key={id} className={mode === id ? "selected" : ""} type="button" onClick={() => { setMode(id); setError(""); setTransparent(false); }}>
              <Icon size={19} /><span><b>{label}</b><small>{copy}</small></span>
            </button>
          ))}
        </div>

        <div className="studio-grid">
          <div className="studio-controls">
            <section className="control-card brand-asset-card">
              <div className="brand-asset-heading" onClick={() => setLogoExpanded(!logoExpanded)} style={{ cursor: "pointer" }}>
                <div className="brand-asset-title"><span><Building2 size={18} /></span><div><h2>账号 Logo</h2><p>{brandMessage || (brandProfile.hasLogo ? "已配置 Logo，点击展开设置" : "上传一次，之后每张海报都能直接复用")}</p></div></div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <b className={brandProfile.hasLogo ? "brand-status saved" : "brand-status"}>
                    {brandProfile.hasLogo ? <><CheckCircle2 size={13} /> 已保存</> : "未上传"}
                  </b>
                  {logoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {logoExpanded && (
                <>
                  <div className="brand-asset-grid">
                    <label className={brandLogoPreview ? "brand-logo-upload has-logo" : "brand-logo-upload"}>
                      {brandLogoPreview
                        ? <img src={brandLogoPreview} alt="当前账号 Logo" />
                        : <><ImageUp size={25} /><b>上传 Logo</b><small>透明 PNG 效果最佳</small></>}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickBrandLogo} />
                      {brandLogoPreview && <em>{brandLogoFile ? "待保存" : "点击可替换"}</em>}
                    </label>
                    <div className="brand-defaults">
                      <label>
                        <span>默认 Logo 说明</span>
                        <textarea aria-label="默认 Logo 说明" value={brandPrompt} maxLength={500} onChange={(event) => setBrandPrompt(event.target.value)} />
                        <small>{brandPrompt.length} / 500 · 用来告诉模型如何为 Logo 留版位</small>
                      </label>
                      <div className="brand-default-row">
                        <label><span>默认摆放位置</span><select aria-label="默认摆放位置" value={brandDefaultPosition} onChange={(event) => setBrandDefaultPosition(event.target.value as LogoPosition)}>{LOGO_POSITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                        <label className="brand-default-toggle"><input type="checkbox" checked={brandUseByDefault} onChange={(event) => setBrandUseByDefault(event.target.checked)} /><span><b>默认自动使用</b><small>单次任务仍可关闭</small></span></label>
                      </div>
                    </div>
                  </div>
                  <div className="brand-actions">
                    <button className="brand-save" type="button" onClick={saveBrandSettings} disabled={brandSaving}>
                      {brandSaving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />} 保存品牌设置
                    </button>
                    {brandProfile.hasLogo && <button className="brand-delete" type="button" onClick={() => { if (window.confirm("确定从当前账号移除已保存的 Logo 吗？")) void deleteBrandLogo(); }} disabled={brandSaving}><Trash2 size={14} /> 移除 Logo</button>}
                    {brandMessage && <span className="brand-message">{brandMessage}</span>}
                  </div>
                </>
              )}
            </section>

            <section className="control-card source-card">
                <div className="control-title"><span>01</span><div><h2>{mode === "generate" ? "添加参考图（可选）" : "上传原图"}</h2><p>{mode === "generate" ? "不上传就是文字生图；上传后自动参考它的风格或内容" : "PNG / JPG / WebP，最大 12MB"}</p></div></div>
                <label className={sourceUrl ? "source-upload has-image" : "source-upload"}>
                  {sourceUrl ? <img src={sourceUrl} alt={mode === "generate" ? "参考图" : "待处理原图"} /> : <><ImageUp size={28} /><b>{mode === "generate" ? "上传参考图" : "点击选择图片"}</b><small>PNG / JPG / WebP · 最大 12MB</small></>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickSource} />
                </label>
                <div className="source-actions">
                  <button type="button" className="picker-trigger" onClick={() => setShowPicker(true)}>
                    <History size={14} /> 从我的作品选择
                  </button>
                  {sourceFile && <button type="button" className="source-clear" onClick={clearSource}><X size={13} /> 移除图片</button>}
                </div>
                {mode === "edit" && sourceUrl && <MaskEditor imageUrl={sourceUrl} onMaskChange={setMaskBlob} />}
            </section>

            {mode !== "remove-background" && mode !== "variation" && (
              <section className="control-card">
                <div className="control-title"><span>02</span><div><h2>{mode === "edit" ? "描述涂白区域" : "描述你的画面"}</h2><p>{mode === "generate" && sourceFile ? "说明参考图里哪些要保留、哪些要改变" : "把主体、文字、时间地点和风格写具体"}</p></div></div>
                <label className="studio-prompt">
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：校园公开课海报，主题、时间、地点、主持人、主办方，左上角预留校徽…" maxLength={1200} />
                  <span>{prompt.length} / 1200</span>
                </label>
                {mode === "generate" && <div className="template-line"><span>模板：</span>{quickTemplates.map((template) => <button key={template.label} type="button" onClick={() => setPrompt(template.prompt)}>{template.label}</button>)}</div>}
                {mode === "generate" && brandProfile.hasLogo && (
                  <div className={useLogo ? "logo-task-options active" : "logo-task-options"}>
                    <label className="logo-task-toggle"><input type="checkbox" checked={useLogo} onChange={(event) => setUseLogo(event.target.checked)} /><span><b>本次使用账号 Logo</b><small>最终成图会精确叠加原始 Logo，不由模型重画</small></span></label>
                    {useLogo && <div className="logo-task-fields">
                      <label><span>本次位置</span><select aria-label="本次 Logo 位置" value={logoPosition} onChange={(event) => setLogoPosition(event.target.value as LogoPosition)}>{LOGO_POSITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                      <label><span>其他要求</span><input aria-label="本次 Logo 其他要求" value={logoRequirements} maxLength={300} onChange={(event) => setLogoRequirements(event.target.value)} placeholder="例如：与主标题对齐、周围多留白" /></label>
                    </div>}
                    {sourceFile && useLogo && <small className="logo-source-hint">参考图如果已经带有 Logo，建议关闭本次叠加，避免重复。</small>}
                  </div>
                )}
              </section>
            )}

            {mode === "generate" && (
              <section className="control-card compact-card">
                <div className="control-title"><span>03</span><div><h2>视觉风格</h2><p>一键附加稳定的设计语言</p></div></div>
                <div className="style-preset-grid">{stylePresets.map((preset) => <button key={preset.id || "auto"} className={style === preset.id ? "selected" : ""} type="button" title={preset.description} onClick={() => setStyle(preset.id)}><Palette size={15} /><span>{preset.label}</span></button>)}</div>
              </section>
            )}

            <section className="control-card">
              <div className="control-title"><span>04</span><div><h2>分辨率与张数</h2><p>选择标准或 Pro；实际像素随下方比例联动</p></div></div>
              <div className="studio-plan-grid">
                <button className={plan === "image-2" ? "studio-plan selected" : "studio-plan"} type="button" onClick={() => setPlan("image-2")}><ImageIcon size={21} /><div><b>标准高清</b><small>2K 以下 · 快速出图</small></div><strong>{prices.standard} 积分</strong></button>
                <button className={plan === "image-2-Pro" ? "studio-plan selected" : "studio-plan"} type="button" onClick={() => setPlan("image-2-Pro")}><Sparkles size={21} /><div><b>Pro 超清</b><small>最高 4K · 精细交稿</small></div><strong>{prices.pro} 积分</strong></button>
              </div>
              {mode !== "edit" && mode !== "remove-background" && mode !== "variation" && (
                <div className="count-row">
                  <button className={count === 1 ? "selected" : ""} type="button" onClick={() => setCount(1)}>出 1 张 <small>按单张价</small></button>
                  <button className={count === 4 ? "selected" : ""} type="button" onClick={() => setCount(4)}>出 4 张 <small>{plan === "image-2-Pro" ? prices.proPack : prices.standardPack} 积分</small></button>
                </div>
              )}
              {mode === "variation" && <div className="feature-callout"><Images size={17} /> 固定生成 4 个相似变体，使用四图打包价。</div>}
            </section>

            {mode !== "remove-background" && (
              <section className="control-card compact-card">
                <div className="control-title"><span>05</span><div><h2>画面比例</h2><p>当前输出 {IMAGE_SIZES[plan][aspect]} 像素</p></div></div>
                <div className="aspect-row">{IMAGE_ASPECTS.map((item) => <button key={item.id} className={aspect === item.id ? "selected" : ""} type="button" onClick={() => setAspect(item.id)}><i className={`ratio-shape ratio-${item.orientation}`} /><span><b>{item.ratio}</b><small>{item.label}</small><em>{IMAGE_SIZES[plan][item.id]}</em></span></button>)}</div>
                {mode === "generate" && <label className="transparent-toggle"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} /><span><Eraser size={16} /><b>透明背景</b><small>输出 PNG，适合贴纸和素材</small></span></label>}
              </section>
            )}

            {error && <div className="inline-error">{error}</div>}
            <button className="studio-generate" type="button" onClick={generate} disabled={tasks.some((t) => t.status === "pending" || t.status === "streaming")}>
              <Sparkles size={21} fill="currentColor" />
              {modes.find((item) => item.id === mode)?.label}
              <span>本次 {selectedPrice} 积分</span>
            </button>
            <p className="studio-note"><Clock3 size={14} /> 支持同时生成多个；失败自动退款 · WebP 自动压缩</p>
          </div>

          <div className="result-panel">
            <div className="result-toolbar"><span>生成队列</span><small>{tasks.length > 0 ? `${tasks.length} 个任务` : aspectLabel}</small></div>
            <div className={`result-canvas result-${aspectOption.orientation}`}>
              {tasks.length === 0 ? (
                <div className="empty-result"><div className="empty-art"><span>YOUR<br />IDEA</span><i /><Sparkles size={38} /></div><h3>你的作品会出现在这里</h3><p>可生成、参考、圈选重绘、出变体或去背景。支持同时提交多个任务。</p></div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <div key={task.id} className={`task-card task-${task.status}`}>
                      <div className="task-header">
                        <span className="task-mode">{operationLabels[task.operation] ?? "图片创作"}</span>
                        <span className="task-prompt" title={task.prompt}>{task.prompt}</span>
                        <span className="task-timer">{formatElapsed(task.elapsed)}</span>
                        {(task.status === "completed" || task.status === "failed") && (
                          <button className="task-close" type="button" onClick={() => removeTask(task.id)}>&times;</button>
                        )}
                      </div>
                      {task.status === "pending" && (
                        <div className="task-progress-wrap">
                          <div className="task-progress-bar"><i style={{ width: "5%" }} /></div>
                          <span className="task-status-text">正在提交…</span>
                        </div>
                      )}
                      {task.status === "streaming" && (
                        <>
                          {task.progressiveImage ? (
                            <div className="task-preview">
                              <img src={task.progressiveImage} alt="正在生成" />
                              <div className="task-progress-wrap">
                                <div className="task-progress-bar"><i style={{ width: `${task.progress}%` }} /></div>
                                <span className="task-status-text">正在细化 · {task.elapsed}s</span>
                              </div>
                            </div>
                          ) : (
                            <div className="task-progress-wrap">
                              <div className="task-progress-bar"><i style={{ width: `${task.progress}%` }} /></div>
                              <span className="task-status-text">正在构图 · {task.elapsed}s</span>
                            </div>
                          )}
                        </>
                      )}
                      {task.status === "completed" && (
                        <div className="task-result">
                          <div className="task-assets">
                            {task.assets.map((asset) => (
                              <article key={asset.position}>
                                <img src={asset.url} alt={`${task.prompt} ${asset.position + 1}`} onClick={() => setLightbox({ url: asset.url, prompt: task.prompt })} style={{ cursor: "zoom-in" }} />
                                <div className="result-actions">
                                  <a href={asset.url} download={`pixel-${task.id}-${asset.position}.png`}><Download size={14} /> 下载</a>
                                  <a href={asset.url} target="_blank" rel="noreferrer"><Maximize2 size={14} /> 原图</a>
                                  <button type="button" onClick={() => handleResultAs("edit", asset)}><ScanLine size={14} /> 修改</button>
                                  <button type="button" onClick={() => handleResultAs("reference", asset)}><ImageUp size={14} /> 参考</button>
                                  <button type="button" onClick={() => handleResultAs("variation", asset)}><Images size={14} /> 类似</button>
                                </div>
                              </article>
                            ))}
                          </div>
                          <span className="task-meta">用时 {formatElapsed(task.elapsed)} · {task.priceCents} 积分</span>
                        </div>
                      )}
                      {task.status === "failed" && (
                        <div className="task-error">
                          <p>{task.error}</p>
                          <span className="task-meta">用时 {formatElapsed(task.elapsed)} · 费用已退回</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="history-section" id="history">
          <div className="history-head"><div><span>最近创作</span><small>仅你自己可见</small></div><a href="/works" className="see-all-link">查看全部 <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} /></a></div>
          {history.length ? <div className="history-grid">{history.map((item) => <article key={item.id} onClick={() => item.status === "completed" && setLightbox({ url: `/api/images/${item.id}`, prompt: item.prompt })}><div className="history-thumb">{item.status === "completed" ? <img src={`/api/images/${item.id}`} alt={item.prompt} /> : <ImageIcon size={24} />}</div><div><span className="history-operation">{operationLabels[item.operation] ?? "图片创作"}{item.imageCount > 1 ? ` · ${item.imageCount} 张` : ""}</span><p>{item.prompt}</p><small>{item.plan} · {item.size} · {item.price}</small></div></article>)}</div> : <div className="history-empty">第一张图，就从今天开始。</div>}
        </section>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" type="button" onClick={() => setLightbox(null)}><X size={24} /></button>
            <img src={lightbox.url} alt={lightbox.prompt} />
            <div className="lightbox-prompt">
              <p>{lightbox.prompt}</p>
              <div className="lightbox-actions">
                <button type="button" onClick={() => { setPrompt(lightbox.prompt); setLightbox(null); }}><Copy size={14} /> 引用到输入框</button>
                <button type="button" onClick={() => { navigator.clipboard.writeText(lightbox.prompt); }}><Copy size={14} /> 复制提示词</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History picker modal */}
      {showPicker && (
        <div className="lightbox-overlay" onClick={() => setShowPicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h2>从我的作品选择</h2>
              <button type="button" onClick={() => setShowPicker(false)}><X size={20} /></button>
            </div>
            <div className="picker-grid">
              {history.filter((h) => h.status === "completed").map((item) => (
                <button key={item.id} type="button" className="picker-item" onClick={() => pickFromHistory(item)}>
                  <img src={`/api/images/${item.id}`} alt={item.prompt} />
                  <small>{item.prompt.slice(0, 30)}</small>
                </button>
              ))}
              {history.filter((h) => h.status === "completed").length === 0 && (
                <div className="picker-empty">暂无已完成的作品</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
