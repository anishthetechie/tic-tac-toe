import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';

const MATCHMAKING_KEY_PREFIX = 'ttt:matchmaking:';
const MATCHMAKING_TTL_SEC = 300; // 5 minutes

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/find-opponent', async (c) => {
  try {
    const subredditName = context.subredditName ?? 'reddit';
    const key = `${MATCHMAKING_KEY_PREFIX}${subredditName}`;

    const existingPostId = await redis.get(key);

    if (existingPostId) {
      await redis.del(key);
      return c.json<UiResponse>(
        {
          navigateTo: `https://reddit.com/r/${subredditName}/comments/${existingPostId}/`,
          showToast: "You've been matched! Opening game...",
        },
        200
      );
    }

    const post = await createPost();
    await redis.set(key, post.id);
    await redis.expire(key, MATCHMAKING_TTL_SEC);

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}/`,
        showToast: 'Waiting for opponent... Share the link or ask a friend to click "Find opponent"!',
      },
      200
    );
  } catch (error) {
    console.error(`Error in find opponent: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to find opponent. Please try again.',
      },
      400
    );
  }
});
