import { markFeedFetched, getNextFeedToFetch } from "./lib/db/queries/feeds.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import { setUser, readConfig } from "./config";
import {
  createUser,
  getUser,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users";
import { fetchFeed } from "./lib/rss";
import {
  createFeed,
  getFeeds,
  getFeedByUrl,
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "./lib/db/queries/feeds";
import type { User } from "./lib/db/schema";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

type CommandsRegistry = Record<string, CommandHandler>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

type MiddlewareLoggedIn = (handler: UserCommandHandler) => CommandHandler;

const middlewareLoggedIn: MiddlewareLoggedIn = (handler) => {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const userName = readConfig().currentUserName;

    if (!userName) {
      throw new Error("not logged in");
    }

    const user = await getUser(userName);

    if (!user) {
      throw new Error(`User ${userName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
};

async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("username is required");
  }

  const user = await getUser(args[0]);

  if (!user) {
    throw new Error("user does not exist");
  }

  setUser(args[0]);
  console.log(`user has been set to ${args[0]}`);
}

async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("username is required");
  }

  const existingUser = await getUser(args[0]);

  if (existingUser) {
    throw new Error("user already exists");
  }

  const user = await createUser(args[0]);
  setUser(args[0]);

  console.log(`user ${args[0]} was created`);
  console.log(user);
}

async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteAllUsers();
}

async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const users = await getUsers();
  const currentUser = readConfig().currentUserName;

  for (const user of users) {
    if (user.name === currentUser) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}



function printFeed(feed: any, user: User): void {
  console.log("Feed:");
  console.log("  ID:", feed.id);
  console.log("  Name:", feed.name);
  console.log("  URL:", feed.url);
  console.log("  User:", user.name);
}

async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("usage: addfeed <name> <url>");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`* ${feedFollow.feedName}`);
  console.log(`  ${feedFollow.userName}`);
}

async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* ${feed.name}`);
    console.log(`  ${feed.url}`);
    console.log(`  ${feed.userName}`);
  }
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("usage: follow <url>");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("feed does not exist");
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`* ${feedFollow.feedName}`);
  console.log(`  ${feedFollow.userName}`);
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

function registerCommand(
  registry: CommandsRegistry,
  name: string,
  handler: CommandHandler,
): void {
  registry[name] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}


async function handlerUnfollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error("usage: unfollow <url>");
  }
  const url = args[0];
  await deleteFeedFollow(user.id, url);
}


function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) {
    throw new Error(`Invalid duration string: ${durationStr}`);
  }
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "ms": return val;
    case "s": return val * 1000;
    case "m": return val * 60 * 1000;
    case "h": return val * 60 * 60 * 1000;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    return;
  }

  await markFeedFetched(feed.id);

  let feedData;
  try {
    feedData = await fetchFeed(feed.url);
  } catch (e) {
    console.error(`Error fetching feed ${feed.name}:`, e);
    return;
  }

  console.log(`Scraping feed "${feed.name}" (${feedData.channel.item.length} items)...`);

  for (const item of feedData.channel.item) {
    let publishedAt: Date | undefined = undefined;
    if (item.pubDate) {
      const parsed = new Date(item.pubDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    try {
      await createPost({
        title: item.title,
        url: item.link,
        description: item.description || null,
        publishedAt: publishedAt || null,
        feedId: feed.id,
      });
    } catch (e) {
      // Ignore conflict
    }
  }
}



async function handlerBrowse(cmdName: string, user: User, ...args: string[]): Promise<void> {
  let limit = 2;
  if (args.length >= 1) {
    const parsed = parseInt(args[0], 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  const posts = await getPostsForUser(user.id, limit);
  console.log(`Found ${posts.length} posts for user ${user.name}:`);
  for (const p of posts) {
    console.log(`--- ${p.title} ---`);
    console.log(`URL: ${p.url}`);
    if (p.description) {
      console.log(`Description: ${p.description.slice(0, 100)}...`);
    }
    console.log(`Published: ${p.publishedAt ?? "N/A"}`);
    console.log("");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    throw new Error("no command provided");
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(handlerFollowing),
  );
  registerCommand(
    registry,
    "unfollow",
    middlewareLoggedIn(handlerUnfollow),
  );

  await runCommand(registry, cmdName, ...cmdArgs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
