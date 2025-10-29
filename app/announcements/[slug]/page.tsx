import type { AnnouncementArticle } from "@/lib/announcements";
import { articles } from "@/lib/announcements";
import { AnnouncementClient } from "./announcement-client";

type PageParams = {
  params: {
    slug: string;
  };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default function AnnouncementPage({ params }: PageParams) {
  const article: AnnouncementArticle | undefined = articles[params.slug];

  return <AnnouncementClient article={article ?? null} />;
}
