import { createAdminClient } from "@/lib/supabase/admin";

const API_BASE = "https://api.twitter.com/2";

export interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author?: { id: string; name: string; username: string };
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("TWITTER_CLIENT_ID/SECRET manquant");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok)
    throw new Error(`Twitter token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

async function getValidAccessToken(): Promise<string> {
  const admin = createAdminClient();

  const { data: stored } = await admin
    .from("twitter_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .single();

  // Use stored token if it won't expire in the next 5 min
  if (
    stored &&
    new Date(stored.expires_at) > new Date(Date.now() + 5 * 60_000)
  ) {
    return stored.access_token;
  }

  const refreshToken =
    stored?.refresh_token ?? process.env.TWITTER_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("Aucun refresh_token disponible");

  const tokens = await refreshAccessToken(refreshToken);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await admin.from("twitter_tokens").upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  });

  return tokens.access_token;
}

export async function postTweet(text: string): Promise<string> {
  const accessToken = await getValidAccessToken();

  const res = await fetch(`${API_BASE}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`postTweet failed: ${await res.text()}`);
  const data = (await res.json()) as { data: { id: string } };
  return data.data.id;
}

export async function searchRecentTweets(
  query: string,
  maxResults = 20,
): Promise<TwitterTweet[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) throw new Error("TWITTER_BEARER_TOKEN manquant");

  const params = new URLSearchParams({
    query: `${query} -is:retweet`,
    max_results: String(Math.max(10, Math.min(maxResults, 100))),
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  const res = await fetch(`${API_BASE}/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!res.ok)
    throw new Error(`searchRecentTweets failed: ${await res.text()}`);
  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      text: string;
      created_at?: string;
      author_id?: string;
      public_metrics?: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
      };
    }>;
    includes?: {
      users?: Array<{ id: string; name: string; username: string }>;
    };
  };

  if (!data.data) return [];

  const usersMap = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));

  return data.data.map((t) => ({
    id: t.id,
    text: t.text,
    created_at: t.created_at,
    author: t.author_id ? usersMap.get(t.author_id) : undefined,
    public_metrics: t.public_metrics,
  }));
}
