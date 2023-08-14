import { z } from 'zod';


export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  brand: z.string(),
  type: z.string(),
  condition: z.string(),
  weight: z.number(),
  height: z.number(),
  width: z.number(),
  depth: z.number(),
  categoriesNames: z.string(),
  videosDescriptions: z.string(),
  imagesDescriptions: z.string(),
  custom_fields: z.object({ name: z.string(), value: z.string() }).array(),
});

const newProductSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const minimalProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description:z.string(),
})

export const chatHistorySchema = z.object({
  url: z.string().nullable(),
  chat: z.object({ 
    name: z.string(), 
    message: z.string(),
  }).array(),
});

export const aiChatSchema = z.object({
  chatHistory: z.object({ name: z.string(), message: z.string() }).array(),
  products: z.union([minimalProductSchema, newProductSchema]).array().nullable(),
})