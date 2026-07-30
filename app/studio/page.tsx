import { Suspense } from "react";
import { getAppEnv, getOrCreateUser, getPricing, money } from "../../db/runtime";
import { requireChatGPTUser } from "../chatgpt-auth";
import { StudioClient } from "../components/studio-client";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="page-loading">正在打开创作台…</div>}>
      <StudioContent />
    </Suspense>
  );
}

async function StudioContent() {
  const identity = await requireChatGPTUser("/studio");
  const { DB } = getAppEnv();
  const user = await getOrCreateUser(
    DB,
    identity.email,
    identity.displayName,
  );
  const pricing = await getPricing(DB);
  const history = await DB.prepare(
    `SELECT id, prompt, plan, size, price_cents, status, created_at
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
      size: string;
      price_cents: number;
      status: string;
      created_at: string;
    }>();

  return (
    <StudioClient
      displayName={identity.displayName}
      initialBalanceCents={user.balanceCents}
      prices={{
        standard: pricing.standardPriceCents,
        pro: pricing.proPriceCents,
      }}
      history={(history.results ?? []).map((item: {
        id: string;
        prompt: string;
        plan: string;
        size: string;
        price_cents: number;
        status: string;
        created_at: string;
      }) => ({
        id: item.id,
        prompt: item.prompt,
        plan: item.plan,
        size: item.size,
        price: money(item.price_cents),
        status: item.status,
        createdAt: item.created_at,
      }))}
    />
  );
}
