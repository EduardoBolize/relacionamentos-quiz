import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { quizCookieName } from '@/server/cookies';
import { findSessionByToken } from '@/server/services/quiz-service';

/** "Meu resultado": usa o cookie deste navegador para encontrar o último teste. */
export default async function MyResultPage() {
  const token = (await cookies()).get(quizCookieName())?.value;
  const session = await findSessionByToken(token);
  if (session?.status === 'completed' && token) redirect(`/resultado/${token}`);
  if (session) redirect('/quiz');
  redirect('/recuperar');
}
