import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vartime.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: appUrl, priority: 1, changeFrequency: "daily" },
    { url: `${appUrl}/en`, priority: 1, changeFrequency: "daily" },
    { url: `${appUrl}/es`, priority: 1, changeFrequency: "daily" },
    { url: `${appUrl}/de`, priority: 1, changeFrequency: "daily" },
    { url: `${appUrl}/it`, priority: 1, changeFrequency: "daily" },
    { url: `${appUrl}/rules`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${appUrl}/laws`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${appUrl}/privacy`, priority: 0.5, changeFrequency: "yearly" },
    { url: `${appUrl}/cgu`, priority: 0.5, changeFrequency: "yearly" },
    {
      url: `${appUrl}/mentions-legales`,
      priority: 0.4,
      changeFrequency: "yearly",
    },
  ];
}
