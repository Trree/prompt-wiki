import { AuthForm } from "./AuthForm";
import { isOwnerTokenConfigured } from "../../lib/auth";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next || "/";

  return <AuthForm nextPath={nextPath} tokenConfigured={isOwnerTokenConfigured()} />;
}
