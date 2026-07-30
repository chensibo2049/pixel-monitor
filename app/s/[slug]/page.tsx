import { notFound } from "next/navigation";
import { getAppEnv, initializeDatabase, money } from "../../../db/runtime";
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
    `SELECT slug, campus_name, brand_name, standard_price_cents, pro_price_cents
     FROM agent_sites WHERE slug = ? AND status = 'active'`,
  )
    .bind(slug)
    .first<{
      slug: string;
      campus_name: string;
      brand_name: string;
      standard_price_cents: number;
      pro_price_cents: number;
    }>();
  if (!site) notFound();

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
            <div><small>标准高清</small><strong>{money(site.standard_price_cents)}</strong><span>/ 次</span></div>
            <div><small>Pro 4K</small><strong>{money(site.pro_price_cents)}</strong><span>/ 次</span></div>
          </div>
          <a className="button button-acid" href={`/studio?site=${site.slug}`}>
            <Sparkles size={19} /> 开始生成 <ArrowRight size={18} />
          </a>
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
