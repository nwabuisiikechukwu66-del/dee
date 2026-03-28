// Convex library mutations - only used when Convex is configured
// App works fully without this via IndexedDB local storage

import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const addToLibrary = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    author: v.optional(v.string()),
    chapters: v.array(v.object({
      title: v.string(),
      sentences: v.array(v.string()),
      position: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("library", args)
  },
})
