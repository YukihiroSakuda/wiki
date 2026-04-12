import { redirect } from "next/navigation";

interface Props {
  searchParams: { q?: string; tag?: string };
}

export default function SearchPage({ searchParams }: Props) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.tag) params.set("tag", searchParams.tag);
  const qs = params.toString();
  redirect(qs ? `/pages?${qs}` : "/pages");
}
