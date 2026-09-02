import { Assistant } from "./assistant";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string | string[] }>;
}) {
  const thread = (await searchParams).thread;
  return <Assistant initialThreadId={typeof thread === "string" ? thread : undefined} />;
}
