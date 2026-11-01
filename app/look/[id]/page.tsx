import { notFound } from "next/navigation";
import { LookView } from "@/components/LookView";
import { SAMPLES, sampleById } from "@/lib/samples";

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export async function generateMetadata(props: PageProps<"/look/[id]">) {
  const { id } = await props.params;
  const s = sampleById(id);
  return { title: s ? `${s.name}'s complete look · Complete Look` : "Complete Look" };
}

export default async function SamplePage(props: PageProps<"/look/[id]">) {
  const { id } = await props.params;
  const look = sampleById(id);
  if (!look) notFound();
  return <LookView look={look} mode="replay" />;
}
