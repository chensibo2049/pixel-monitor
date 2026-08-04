import { Suspense } from "react";
import { getAppEnv, getAttributedSubsite, getOrCreateUser, getPricing, getUserBrandProfile, points } from "../../db/runtime";
import { getClaimedSubsiteSlug, requireSessionUser } from "../auth";
import { StudioClient } from "../components/studio-client";

export const dynamic = "force-dynamic";

export default function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; prompt?: string; plan?: string }>;
}) {
  return (
    <Suspense fallback={<div className="page-loading">正在打开创作台…</div>}>
      <StudioContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StudioContent({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; prompt?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const requestedSite = params.site?.trim() ?? "";
  const claimedSite = await getClaimedSubsiteSlug();
  const returnParams = new URLSearchParams();
  if (requestedSite) returnParams.set("site", requestedSite);
  if (params.prompt) returnParams.set("prompt", params.prompt.slice(0, 1200));
  if (params.plan === "image-2-Pro") returnParams.set("plan", params.plan);
  const returnTo = returnParams.size ? `/studio?${returnParams}` : "/studio";
  const identity = await requireSessionUser(returnTo);
  const { DB } = getAppEnv();
  const user = await getOrCreateUser(
    DB,
    identity.email,
    identity.displayName,
  );
  const pricing = await getPricing(DB);
  const brandProfile = getUserBrandProfile(DB, user.id);
  const attributedSite = getAttributedSubsite(DB, user.id, claimedSite);
  const subsiteContext = attributedSite
    ? {
        slug: attributedSite.slug,
        brand_name: attributedSite.brandName,
        campus_name: attributedSite.campusName,
        permanent: attributedSite.permanent,
      }
    : null;
  const history = await DB.prepare(
    `SELECT id, prompt, plan, operation, image_count, size, price_cents, status, created_at
     FROM generations
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 12`,
  )
    .bind(user.id)
    .all<{
      id: string;
      prompt: string;
      plan: string;
      operation: string;
      image_count: number;
      size: string;
      price_cents: number;
      status: string;
      created_at: string;
    }>();

  return (
    <StudioClient
      displayName={identity.displayName}
      subsiteContext={subsiteContext}
      initialBalanceCents={user.balanceCents}
      initialBrandProfile={{
        hasLogo: brandProfile.hasLogo,
        logoUrl: brandProfile.hasLogo ? `/api/brand-profile/logo?v=${encodeURIComponent(brandProfile.updatedAt ?? "initial")}` : null,
        defaultPrompt: brandProfile.defaultPrompt,
        defaultPosition: brandProfile.defaultPosition,
        useByDefault: brandProfile.useByDefault,
      }}
      prices={{
        standard: pricing.standardPriceCents,
        pro: pricing.proPriceCents,
        standardPack: pricing.standardPackPriceCents,
        proPack: pricing.proPackPriceCents,
        editDiscount: pricing.editDiscountPercent,
      }}
      history={(history.results ?? []).map((item: {
        id: string;
        prompt: string;
        plan: string;
        operation: string;
        image_count: number;
        size: string;
        price_cents: number;
        status: string;
        created_at: string;
      }) => ({
        id: item.id,
        prompt: item.prompt,
        plan: item.plan,
        operation: item.operation,
        imageCount: item.image_count,
        size: item.size,
        price: points(item.price_cents),
        status: item.status,
        createdAt: item.created_at,
      }))}
    />
  );
}
