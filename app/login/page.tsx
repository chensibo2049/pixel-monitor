import { redirect } from "next/navigation";
import { getSessionUser, safeRelativeReturnPath } from "../auth";
import { LoginClient } from "../components/login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeRelativeReturnPath((await searchParams).returnTo ?? "/studio");
  if (await getSessionUser()) redirect(returnTo);
  return <LoginClient returnTo={returnTo} />;
}
