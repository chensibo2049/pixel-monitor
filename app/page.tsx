import { getChatGPTUser } from "./chatgpt-auth";
import { HomeClient } from "./components/home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <HomeClient userName={user?.displayName ?? null} />;
}
