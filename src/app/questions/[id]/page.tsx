import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MainLayout } from "@/components/layout/main-layout";
import { QuestionDetail } from "@/components/questions/question-detail";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

async function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      answers: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export default async function QuestionPage({ params }: Props) {
  const [question, session] = await Promise.all([
    getQuestion(params.id),
    getServerSession(authOptions),
  ]);

  if (!question) notFound();

  return (
    <MainLayout>
      <QuestionDetail
        question={{
          id: question.id,
          title: question.title,
          content: question.content,
          status: question.status,
          bestAnswerId: question.bestAnswerId,
          author: question.author,
          createdAt: question.createdAt.toISOString(),
          answers: question.answers.map((a: (typeof question.answers)[number]) => ({
            id: a.id,
            content: a.content,
            author: a.author,
            createdAt: a.createdAt.toISOString(),
          })),
        }}
        currentUserId={session?.user?.id ?? null}
      />
    </MainLayout>
  );
}
