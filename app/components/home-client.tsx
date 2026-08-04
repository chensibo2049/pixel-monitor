"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Filter,
  GraduationCap,
  Image as ImageIcon,
  Layers3,
  Megaphone,
  MousePointer2,
  Palette,
  Sparkles,
  Store,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { homeInspirationCases } from "../data/home-cases";

const promptIdeas = [
  "社团招新海报",
  "毕设概念图",
  "小红书封面",
  "校园活动 KV",
];

const caseRecipes = [
  {
    id: "film-club",
    category: "社团宣传",
    title: "春日放映计划",
    subtitle: "摄影社招新海报",
    image: "/cases/film-club.jpg",
    plan: "image-2" as const,
    styles: ["瑞士排版", "孔版印刷", "胶片颗粒"],
    fields: { logo: "上传摄影社 / 学校校徽 PNG", time: "05月18日 19:00", place: "大学生活动中心", host: "主持人：林同学", organizer: "主办：校团委 · 摄影社" },
    prompt:
      "为【摄影社名称】设计一张竖版 3:4 招新海报。左上角预留【学校校徽 PNG】位置，主标题“春日放映计划”，副标题“摄影社招新”。信息区必须清晰包含：时间【05月18日 19:00】、地点【大学生活动中心】、主持人【林同学】、主办【校团委 · 摄影社】。画面包含抽象叠放的胶片框、校园草坪日落，以及一位拿胶片相机的学生剪影。采用当代中文编辑设计、瑞士栅格与孔版印刷风格，群青、珊瑚橙、米白、近黑配色，高对比、强层级，带纸张和半调颗粒。输出完整正视海报，不要墙面样机、手持场景、水印和二维码。",
  },
  {
    id: "music-festival",
    category: "校园活动",
    title: "草地声浪",
    subtitle: "校园音乐节主视觉",
    image: "/cases/music-festival.jpg",
    plan: "image-2-Pro" as const,
    styles: ["Y2K 金属", "霓虹撞色", "动感字体"],
    fields: { logo: "上传学生会 / 学校校徽 PNG", time: "05月24日 18:30", place: "东区体育场草坪", host: "主持人：周同学", organizer: "主办：校学生会" },
    prompt:
      "设计一张竖版 3:4 校园户外音乐节海报。左上角预留【学校校徽 PNG】位置，主标题“草地声浪”，副标题“校园音乐节”。底部信息栅格清晰包含：时间【05月24日 18:30】、地点【东区体育场草坪】、主持人【周同学】、主办【校学生会】。蓝调时刻的校园草坪上出现巨型液态金属扬声器，周围有声波涟漪、扬声器锥体和年轻观众剪影。风格是 Y2K 编辑设计与当代音乐节品牌视觉，钴蓝、荧光黄绿、暖银和近黑配色，高对比、具有速度感。输出完整正视海报，不要夜店俗套、假学校 Logo、水印和二维码。",
  },
  {
    id: "grad-show",
    category: "毕业设计",
    title: "未完待续",
    subtitle: "毕业设计展海报",
    image: "/cases/grad-show.jpg",
    plan: "image-2-Pro" as const,
    styles: ["建筑极简", "瑞士字体", "空间叙事"],
    fields: { logo: "上传学院 Logo PNG", time: "06月10日—06月20日", place: "美术馆一号厅", host: "开幕主持：李老师", organizer: "主办：设计学院" },
    prompt:
      "设计一张竖版 3:4 毕业设计展海报。顶部预留【学院 Logo PNG】位置，主标题“未完待续”，副标题“毕业设计展”。信息区清晰包含：展期【06月10日—06月20日】、地点【美术馆一号厅】、开幕主持【李老师】、主办【设计学院】。将干净的建筑展厅变成不可能的纸模型空间：漂浮的白色楼梯、半透明钴蓝亚克力平面、朱红太阳圆盘，一位学生走入空间。采用艺术院校编辑设计、建筑可视化和精确瑞士排版，暖白、钴蓝、朱红、炭黑配色，克制、概念化、具有博物馆柔光和纸张颗粒。输出完整正视海报，不要企业汇报风、水印和二维码。",
  },
  {
    id: "sports-day",
    category: "校园活动",
    title: "破风少年",
    subtitle: "校园运动会海报",
    image: "/cases/sports-day.jpg",
    plan: "image-2" as const,
    styles: ["运动拼贴", "丝网印刷", "动态摄影"],
    fields: { logo: "上传学校校徽 PNG", time: "04月27日 08:30", place: "中心田径场", host: "主持人：体育部老师", organizer: "主办：体育学院" },
    prompt:
      "设计一张竖版 3:4 校园运动会海报。左上角预留【学校校徽 PNG】位置，主标题“破风少年”，副标题“校园运动会”。信息区清晰包含：时间【04月27日 08:30】、地点【中心田径场】、主持人【体育部老师】、主办【体育学院】。用极低机位拍摄红色跑道，一位学生短跑运动员沿对角线冲过画面，人物面部不可识别，仅四肢和背景带运动模糊，加入夸张跑道数字、速度线和太阳圆盘。风格为运动编辑摄影与丝网印刷拼贴，朱红、太阳黄、天蓝、白和近黑配色，硬质晨光，热烈、乐观、快速。输出完整正视海报，不要商业球鞋广告、假学校 Logo、水印和二维码。",
  },
  {
    id: "lecture",
    category: "校园讲座",
    title: "未来与我们",
    subtitle: "校园公开课海报",
    image: "/cases/lecture.jpg",
    plan: "image-2-Pro" as const,
    styles: ["瑞士排版", "学术视觉", "信息栅格"],
    fields: { logo: "上传学校校徽 PNG", time: "05月18日 19:00", place: "大学生活动中心", host: "主持人：林老师", organizer: "主办：学生发展中心" },
    prompt: "设计一张竖版 3:4 校园公开课海报。左上角预留【学校校徽 PNG】位置，主标题“未来与我们”，副标题“校园公开课”。信息区清晰包含：嘉宾【周教授】、时间【05月18日 19:00】、地点【大学生活动中心】、主持人【林老师】、主办【学生发展中心】。采用暖象牙白底、钴蓝几何栅格、半透明红橙球体与学术图解线，当代瑞士编辑设计，清晰、克制、有校园学术气质。输出完整正视海报，不要假学校 Logo、样机、水印和二维码。",
  },
  {
    id: "campus-talk",
    category: "校园讲座",
    title: "青春开讲",
    subtitle: "校园分享会海报",
    image: "/cases/campus-talk.jpg",
    plan: "image-2" as const,
    styles: ["青年拼贴", "丝网印刷", "高饱和撞色"],
    fields: { logo: "上传学生会 / 学校校徽 PNG", time: "06月08日 14:00", place: "图书馆报告厅", host: "主持人：陈同学", organizer: "主办：学生会" },
    prompt: "设计一张竖版 3:4 校园分享会海报。左上角预留【学校校徽 PNG】位置，主标题“青春开讲”，副标题“校园分享会”。信息区清晰包含：分享嘉宾【优秀校友姓名】、时间【06月08日 14:00】、地点【图书馆报告厅】、主持人【陈同学】、主办【学生会】。画面包含校园小舞台、演讲者剪影、抽象对话气泡和学生观众，酸性黄、紫色、珊瑚红、深海军蓝配色，青年编辑拼贴与丝网印刷质感，热烈但专业。输出完整正视海报，不要假学校 Logo、水印和二维码。",
  },
];

type CaseRecipe = (typeof caseRecipes)[number];

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
  const [caseFilter, setCaseFilter] = useState("全部");
  const [selectedCase, setSelectedCase] = useState<CaseRecipe | null>(null);
  const [copied, setCopied] = useState(false);

  const studioHref = `/studio?prompt=${encodeURIComponent(prompt)}&plan=${encodeURIComponent(plan)}`;
  const standardPrice = prices.standard;
  const proPrice = prices.pro;
  const visibleCases =
    caseFilter === "全部"
      ? caseRecipes
      : caseRecipes.filter((recipe) => recipe.category === caseFilter);

  function reuseRecipe(recipe: CaseRecipe) {
    setPrompt(recipe.prompt);
    setPlan(recipe.plan);
    setSelectedCase(null);
    document.querySelector(".generator-shell")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  async function copyRecipe(recipe: CaseRecipe) {
    await navigator.clipboard.writeText(recipe.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main>
      <header className="site-nav">
        <Brand />
        <nav aria-label="主导航">
          <a href="#recipes">案例配方</a>
          <a href="/cases">517 例灵感库</a>
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
              <strong>{standardPrice} 积分</strong>
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
              <strong>{proPrice} 积分</strong>
            </button>
          </div>

          <a className="generate-cta" href={studioHref}>
            <Sparkles size={20} fill="currentColor" />
            立即生成
            <span>{plan === "image-2" ? `${standardPrice} 积分 / 次` : `${proPrice} 积分 / 次`}</span>
          </a>
          <p className="microcopy">新同学注册即送 30 体验积分，足够体验首张图</p>
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

      <section className="showcase section-wrap" id="recipes">
        <div className="section-heading">
          <div>
            <span className="section-kicker">案例配方库</span>
            <h2>看中哪张，就复用哪套提示词。</h2>
          </div>
          <p>每张都是实际生成的案例，完整提示词、风格拆解和推荐画质全部公开，改几个关键词就能变成你的作品。</p>
        </div>

        <div className="recipe-toolbar">
          <span><Filter size={15} /> 按用途筛选</span>
          {["全部", "社团宣传", "校园活动", "校园讲座", "毕业设计"].map((filter) => (
            <button
              key={filter}
              className={caseFilter === filter ? "active" : ""}
              type="button"
              onClick={() => setCaseFilter(filter)}
            >
              {filter}
            </button>
          ))}
          <small>{visibleCases.length} 套可复用配方</small>
        </div>

        <div className="recipe-grid">
          {visibleCases.map((recipe, index) => (
            <article className="recipe-card" key={recipe.id}>
              <button
                className="recipe-image"
                type="button"
                onClick={() => setSelectedCase(recipe)}
                aria-label={`查看${recipe.title}的提示词配方`}
              >
                <img src={recipe.image} alt={`${recipe.title}——${recipe.subtitle}`} />
                <span className="case-number">0{index + 1}</span>
                <span className="view-recipe"><Eye size={16} /> 查看配方</span>
              </button>
              <div className="recipe-info">
                <div>
                  <span>{recipe.category}</span>
                  <h3>{recipe.title}</h3>
                  <p>{recipe.subtitle}</p>
                </div>
                <button type="button" onClick={() => setSelectedCase(recipe)}>
                  提示词 <ArrowRight size={15} />
                </button>
              </div>
              <div className="style-tags">
                {recipe.styles.map((style) => <span key={style}># {style}</span>)}
              </div>
            </article>
          ))}
        </div>

        <div className="mobile-swipe-hint"><ArrowRight size={15} /> 左右滑动，一次看完 6 套完整配方</div>

        <section className="inspiration-shelf" aria-labelledby="more-home-cases">
          <div className="inspiration-shelf-head">
            <div>
              <span>MORE IDEAS · 27</span>
              <h3 id="more-home-cases">首页再放 27 个，先找到你想做的那类图。</h3>
            </div>
            <small>校园宣传、课程毕设、自媒体、创业、UI、人像、插画、分镜与中国风</small>
          </div>
          <div className="inspiration-track">
            {homeInspirationCases.map((item) => (
              <a className="inspiration-mini-card" href={`/cases?case=${item.id}`} key={item.id}>
                <span className="inspiration-mini-image">
                  <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
                  <small>CASE {item.id}</small>
                </span>
                <span className="inspiration-mini-copy">
                  <small>{item.category}</small>
                  <strong>{item.title}</strong>
                  <i>{item.tags.map((tag) => `#${tag}`).join("  ")}</i>
                  <b>查看原 Prompt <ArrowRight size={13} /></b>
                </span>
              </a>
            ))}
          </div>
          <div className="inspiration-swipe-cue"><ArrowRight size={14} /> 手机左右滑动，还有更多</div>
        </section>

        <a className="full-library-cta" href="/cases">
          <span><Sparkles size={20} /><b>还没看到想要的？</b>进入按大学生用途重分类的 517 例完整灵感库</span>
          <strong>浏览全部案例 <ArrowRight size={18} /></strong>
        </a>
      </section>

      {selectedCase && (
        <div className="recipe-modal" role="dialog" aria-modal="true" aria-label={`${selectedCase.title}提示词配方`}>
          <button className="modal-backdrop" type="button" onClick={() => setSelectedCase(null)} aria-label="关闭配方" />
          <div className="recipe-dialog">
            <button className="dialog-close" type="button" onClick={() => setSelectedCase(null)} aria-label="关闭">
              <X size={20} />
            </button>
            <div className="dialog-preview">
              <img src={selectedCase.image} alt={selectedCase.title} />
              <span>实际生成案例</span>
            </div>
            <div className="dialog-content">
              <span className="section-kicker">{selectedCase.category} · 提示词配方</span>
              <h2>{selectedCase.title}</h2>
              <p className="dialog-subtitle">{selectedCase.subtitle}</p>
              <div className="dialog-tags">
                {selectedCase.styles.map((style) => <span key={style}>{style}</span>)}
                <span>{selectedCase.plan}</span>
                <span>竖版 3:4</span>
              </div>
              <div className="poster-field-grid">
                <span><small>校徽 / Logo</small><b>{selectedCase.fields.logo}</b></span>
                <span><small>时间</small><b>{selectedCase.fields.time}</b></span>
                <span><small>地点</small><b>{selectedCase.fields.place}</b></span>
                <span><small>主持人</small><b>{selectedCase.fields.host}</b></span>
                <span><small>主办方</small><b>{selectedCase.fields.organizer}</b></span>
              </div>
              <div className="prompt-recipe-box">
                <div><span>完整提示词</span><small>【】中的内容可以替换</small></div>
                <p>{selectedCase.prompt}</p>
              </div>
              <div className="recipe-tip">
                <CheckCircle2 size={17} />
                <span><b>复用建议：</b>先替换活动信息，再上传学校官方校徽作为参考图；不要让模型凭空绘制校徽。</span>
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => copyRecipe(selectedCase)}>
                  {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                  {copied ? "已复制" : "复制提示词"}
                </button>
                <button type="button" onClick={() => reuseRecipe(selectedCase)}>
                  <WandSparkles size={17} /> 套用这个配方
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <p>后台可随时调整积分价格。系统按生成请求扣除积分，失败自动退回。</p>
        </div>
        <div className="price-grid">
          <article className="price-card">
            <div className="price-head">
              <span>image-2</span>
              <ImageIcon size={28} />
            </div>
            <h3>标准高清</h3>
            <div className="big-price">{standardPrice}<small>积分 / 次</small></div>
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
            <div className="big-price">{proPrice}<small>积分 / 次</small></div>
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
