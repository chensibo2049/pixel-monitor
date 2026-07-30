import { getAppEnv, getPricing } from "../db/runtime";
import { getChatGPTUser } from "./chatgpt-auth";
import { HomeClient } from "./components/home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const pricing = await getPricing(getAppEnv().DB);
  return (
    <HomeClient
      userName={user?.displayName ?? null}
      prices={{
        standard: pricing.standardPriceCents,
        pro: pricing.proPriceCents,
      }}
    />
  );
}
