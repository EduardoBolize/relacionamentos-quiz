import type { Metadata } from 'next';
import { QuizRunner } from '@/components/quiz/QuizRunner';

export const metadata: Metadata = {
  title: 'Quiz',
  robots: { index: false },
};

export default async function QuizPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { novo } = await searchParams;
  return <QuizRunner startFresh={novo === '1'} />;
}
