import { permanentRedirect } from 'next/navigation';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function ExerciseRedirect({ params }: Params) {
  const { slug } = await params;
  permanentRedirect(`/exercise/${slug}`);
}