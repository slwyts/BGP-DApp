import React from "react";
import ClientAnnouncementDetail from "./client-page";

const articles = {
  "welcome-to-belachain": {},
  "airdrop-program-launch": {},
  "level-system-update": {},
};

export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({
    slug,
  }));
}

export default function AnnouncementDetailPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  return <ClientAnnouncementDetail slug={params.slug} />;
}