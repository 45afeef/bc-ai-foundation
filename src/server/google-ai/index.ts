import { type z } from 'zod';
import { env } from '~/env.mjs';
import { GoogleAuth } from 'google-auth-library';
import { TextServiceClient, DiscussServiceClient } from '@google-ai/generativelanguage';

import { DEFAULT_GUIDED_ATTRIBUTES, STYLE_OPTIONS } from '~/constants';
import { type aiSchema } from '~/app/api/generateDescription/schema';
import { MinimalProduct } from 'types';

const MODEL_NAME = 'models/text-bison-001';
const CHAT_MODEL_NAME = 'models/chat-bison-001';
const API_KEY = env.GOOGLE_API_KEY;

export default async function generateDescription(
  attributes: z.infer<typeof aiSchema>
): Promise<string> {
  const input = prepareInput(attributes);
  const productAttributes = prepareProductAttributes(attributes);

  const prompt = `Act as an e - commerce merchandising expert who writes product descriptions.
    Task: Based on provided input parameters, write a product description
    ${input}
    ${productAttributes}`;

  try {
    const client = new TextServiceClient({
      authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const response = await client.generateText({
      model: MODEL_NAME,
      prompt: { text: prompt },
    });

    if (response && response[0] && response[0].candidates) {
      return response[0].candidates[0]?.output || 'No response from Google AI';
    }
  } catch (error) {
    console.error(error);
  }

  return 'No response from Google AI';
}

const prepareInput = (attributes: z.infer<typeof aiSchema>): string => {
  if ('customPrompt' in attributes) {
    return `Instruction: ${attributes.customPrompt}`;
  } else if ('style' in attributes) {
    const style =
      STYLE_OPTIONS.find((option) => option.value === attributes.style)
        ?.content || '';

    return `Style of writing: ["${style}"]
        Brand tone: ["${attributes.brandVoice}"]
        Word limit: [${attributes.wordCount}]
        SEO optimized: ["${attributes.optimizedForSeo ? 'yes' : 'no'}"]
        Additional product attributes: ["${attributes.additionalAttributes}"]
        Additional keywords: ["${attributes.keywords}"]
        Additional instructions: ["${attributes.instructions}"]`;
  } else {
    return `Style of writing: ["${DEFAULT_GUIDED_ATTRIBUTES.style}"]
        Word limit: [${DEFAULT_GUIDED_ATTRIBUTES.wordCount}]
        SEO optimized: ["${DEFAULT_GUIDED_ATTRIBUTES.optimizedForSeo ? 'yes' : 'no'
      }"]`;
  }
};

const prepareProductAttributes = (
  attributes: z.infer<typeof aiSchema>
): string => {
  if (attributes.product && 'type' in attributes.product) {
    return `Product attributes:
        "name": ${attributes.product.name}
        "brand": ${attributes.product.brand}
        "type": ${attributes.product.type}
        "condition": ${attributes.product.condition}
        "weight": ${attributes.product.weight}
        "height": ${attributes.product.height}
        "width": ${attributes.product.width}
        "depth": ${attributes.product.depth}
        "categories": ${attributes.product.categoriesNames}
        "videos descriptions": ${attributes.product.videosDescriptions}
        "imnages descritpions": ${attributes.product.imagesDescriptions}
        "custom_fields": ${attributes.product.custom_fields
        .map((field) => `"${field.name}": "${field.value}"`)
        .join(',')} `;
  } else {
    return `Product attributes:
        "name": ${attributes.product?.name || ''} `;
  }
};

export async function generateNextChatReplay(
  attributes//: z.infer<typeof aiSchema>
): Promise<string> {
  attributes = attributes.data
  const productInfo = prepareProductsPrompt(attributes)
  const chatHistory = prepareChatHistory(attributes);

  const prompt = `Respond to all questions As a friend.Act as an e-commerce salesman who walks along with online users throughout the user journey and try to sell the following products like a expert saleman. Always talk in friendly manner. Never promote any other companies product. Always try to make sales. Make the User always happy even if they are not buying ask them whether they cameback to this store. Keep each conversation minimum and bellow 50 words
   ${productInfo}`;

  try {
    const client = new DiscussServiceClient({
      authClient: new GoogleAuth().fromAPIKey(API_KEY),
    });

    const response = await client.generateMessage({
      model: CHAT_MODEL_NAME, // Required. The model to use to generate the result.
      temperature: 0.5, // Optional. Value `0.0` always uses the highest-probability result.
      candidateCount: 1, // Optional. The number of candidate results to generate.
      prompt: {
        // optional, preamble context to prime responses
        context: prompt,
        // Required. Alternating prompt/response messages.
        messages: chatHistory,
      },
    });

    if (response && response[0] && response[0].candidates) {
      return response[0].candidates[0]?.content || 'Hey buddy, I lost my mind. Will you try later?';
    }
  } catch (error) {
    console.error(error);
  }

  return 'Hey buddy, I lost my mind. Will you try later?';
}


function removeTagsAndSpecialCharacters(description) {
  const pattern = /<[^>]*>|&[^;]*;|\n/g;
  return description.replace(pattern, '');
}

const prepareProduct = (product: MinimalProduct): string => {
  return `"id":${product.id}
            "name":"${product.name}"
            "description":"${removeTagsAndSpecialCharacters(product.description)}"
            "add_to_cart_url":"${product.addToCartUrl}"`
}

const prepareProductsPrompt = (attributes): string => {
  if ("currentProduct" in attributes) {
    return `
        Product attributes:
        ${prepareProduct(attributes.currentProduct)}
        "Related Products": ${attributes.currentProduct.relatedProducts.map(p => prepareProduct(p)).join(',')}
    `;
  } else if ("storeProducts" in attributes) {
    return `
        "Best Selling Products": ${attributes.storeProducts.bestSellingProducts.map(p => prepareProduct(p)).join(',')}
        "Featured Products": ${attributes.storeProducts.featuredProducts.map(p => prepareProduct(p)).join(',')}
        "Newest Products": ${attributes.storeProducts.newestProducts.map(p => prepareProduct(p)).join(',')}
    `;
  }

  return ""
}

const prepareChatHistory = (attributes): { author: string, content: string }[] => {
  return attributes.chatHistory.map(({ name, message }) => {
    return { author: name == "AI-Salesman" ? 0 : 1, content: message }
  })
}