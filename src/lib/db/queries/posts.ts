import { desc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { posts, feedFollows, NewPost } from "../schema.js";

export async function createPost(post: NewPost) {
  const [newPost] = await db
    .insert(posts)
    .values(post)
    .onConflictDoNothing()
    .returning();
  return newPost;
}

export async function getPostsForUser(userId: string, limit: number = 2) {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(feedFollows, eq(posts.feedId, feedFollows.feedId))
    .where(eq(feedFollows.userId, userId))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return result;
}
