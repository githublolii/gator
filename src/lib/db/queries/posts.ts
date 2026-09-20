import {  desc, eq , ilike, or } from "drizzle-orm";
import { db } from "../index.js";
import {  posts, feedFollows, NewPost , bookmarks } from "../schema.js";

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

export async function searchPosts(term: string, limit: number = 10) {
  const pattern = `%${term}%`;
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(or(ilike(posts.title, pattern), ilike(posts.description, pattern)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export async function addBookmark(userId: string, postId: string) {
  const [b] = await db
    .insert(bookmarks)
    .values({ userId, postId })
    .returning();
  return b;
}

export async function getBookmarksForUser(userId: string) {
  return await db
    .select({
      bookmarkId: bookmarks.id,
      postId: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      savedAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}
