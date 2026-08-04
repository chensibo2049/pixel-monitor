import { notFound } from "next/navigation";
import { getAppEnv, initializeDatabase, points } from "../../../db/runtime";
import { Brand } from "../../components/brand";
import { ArrowRight, BadgeCheck, GraduationCap, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubsitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const site = await DB.prepare(
    `SELECT slug, campus_name, brand_name, standard_price_cents, pro_price_cents, standard_pack_price_cents, pro_pack_price_cents
     FROM agent_sites WHERE slug = ? AND status = 'active'`,
  )
    .bind(slug)
    .first<{
      slug: string;
      campus_name: string;
      brand_name: string;
      standard_price_cents: number;
      pro_price_cents: number;
      standard_pack_price_cents: number;
      pro_pack_price_cents: number;
  }>();
  if (!site) notFound();
  const siteSlug = site.slug;

  const recipes = [
    {
      style: "新中式水墨",
      title: "国风文化讲座",
      prompt: "为千序言文化大学设计竖版 3:4 中国风讲座海报，主题【身后是历史的风景】，主讲人【刘定一教授】，主持人【林清老师】，时间【2026年9月18日 19:00】，地点【明德楼一层报告厅】，主办【千序言文化大学人文学院】。左上角使用千序言文化大学校名与圆形校徽，宣纸留白、淡墨远山、崖上古松和一叶扁舟，文字信息自然融入画面，真实可发布的完整正视海报，无样机、无水印、无二维码。",
    },
    {
      style: "2.5D 青春",
      title: "秋季社团招新",
      prompt: "为千序言文化大学设计竖版 3:4 秋季社团招新海报，主题【一起创造新校园】，时间【2026年9月12日 10:00—17:00】，地点【青春广场】，主持人【校学生会陈屿】，主办【千序言文化大学校团委】。顶部放置千序言文化大学校徽与校名，60度侧视的2.5D校园建筑、社团帐篷、舞台和学生角色，明快钴蓝、珊瑚橙与柠檬黄，信息栅格清晰，完整正视海报。",
    },
    {
      style: "巨物美学",
      title: "校园音乐节",
      prompt: "为千序言文化大学设计竖版 3:4 校园音乐节海报，主题【声浪越过教学楼】，主持人【周野】，演出时间【2026年10月16日 18:30】，地点【东区田径场】，主办【千序言文化大学学生艺术中心】。画面中央是一只超巨型透明耳机横跨校园建筑，学生像微缩人物在耳机下聚集，电影级夕阳、强烈尺度反差、超现实巨物美学；顶部规范展示千序言文化大学校徽与校名，底部活动信息清晰，真实可发布的完整正视海报。",
    },
  ];

  function claimPath(returnTo: string) {
    return `/api/subsite/claim?site=${encodeURIComponent(siteSlug)}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <main className="subsite-page">
      <header className="simple-nav">
        <Brand />
        <span className="campus-edition"><GraduationCap size={17} /> {site.campus_name}专属站</span>
      </header>
      <section className="subsite-hero">
        <div className="subsite-copy">
          <span>由校园代理运营 · 平台提供技术服务</span>
          <h1>{site.brand_name}</h1>
          <p>一句话生成社团海报、课程配图、毕设概念和自媒体封面。按次付费，失败自动退回。</p>
          <div className="subsite-prices">
            <div><small>标准高清</small><strong>{points(site.standard_price_cents)}</strong><span>/ 次</span></div>
            <div><small>Pro 4K</small><strong>{points(site.pro_price_cents)}</strong><span>/ 次</span></div>
            <div><small>标准四图包</small><strong>{points(site.standard_pack_price_cents)}</strong><span>/ 4 张</span></div>
            <div><small>Pro 四图包</small><strong>{points(site.pro_pack_price_cents)}</strong><span>/ 4 张</span></div>
          </div>
          <a className="button button-acid" href={claimPath(`/studio?site=${site.slug}`)}>
            <Sparkles size={19} /> 开始生成 <ArrowRight size={18} />
          </a>
          <a className="subsite-recipes-link" href={claimPath(`/?from=${site.slug}#recipes`)}>
            先看看校园海报案例与风格配方 <ArrowRight size={16} />
          </a>
          <div className="subsite-quick-recipes">
            <span>可直接复用的校园案例</span>
            <div>
              {recipes.map((recipe) => (
                <a
                  key={recipe.title}
                  href={claimPath(`/studio?site=${site.slug}&prompt=${encodeURIComponent(recipe.prompt)}`)}
                >
                  <small>{recipe.style}</small>
                  <strong>{recipe.title}</strong>
                  <ArrowRight size={15} />
                </a>
              ))}
            </div>
          </div>
          <div className="subsite-proof">
            <span><BadgeCheck size={15} /> 服务端安全调用</span>
            <span><BadgeCheck size={15} /> 原图私密存储</span>
            <span><BadgeCheck size={15} /> 按次透明计费</span>
          </div>
        </div>
        <div className="subsite-poster">
          <div className="subsite-sticker">CAMPUS<br />CREATIVE</div>
          <span>让灵感<br />按时交稿</span>
          <i />
          <b>{site.campus_name}</b>
        </div>
      </section>
    </main>
  );
}
