import { prisma } from "@/lib/prisma";
import { MainLayout } from "@/components/layout/main-layout";
import { QuestionsClient } from "@/components/questions/questions-client";

async function getQuestions() {
  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.question.count(),
  ]);
  return { questions, total };
}

export default async function QuestionsPage() {
  const { questions, total } = await getQuestions();

  return (
    <MainLayout>
      <QuestionsClient
        initialQuestions={questions.map((q: (typeof questions)[number]) => ({
          id: q.id,
          title: q.title,
          content: q.content,
          status: q.status,
          bestAnswerId: q.bestAnswerId,
          answerCount: q._count.answers,
          author: q.author,
          createdAt: q.createdAt.toISOString(),
        }))}
        total={total}
      />
    </MainLayout>
  );
}
