import { NextRequest, NextResponse } from 'next/server';
import {generateNextChatReplay} from '~/server/google-ai';
import { aiChatSchema, chatHistorySchema, productSchema } from './schema';

import { fetchProductsByPageType } from '~/server/bigcommerce-api';
import * as db from '~/lib/db';


// The chatUI send a replay request 
// We check if the comming req is from allowed origin
export async function POST(req: NextRequest) {
    const data: unknown = await req.json();
    const parsedParams = chatHistorySchema.safeParse(data);

    if (!parsedParams.success) {
        return new NextResponse('Invalid query parameters', { status: 400 });
    }

    // We got the context from chatUI
    // Now we need to transform that into AI-consumable context data
    // We need to find the relevent products if there is url passed
    
    var chatContextFromUI = {chatHistory : parsedParams.data.chat}

    if(parsedParams.data.url){
        // Check if the url is of a product or not
        // Get related products if the url is of a product
        // Get featured products, new products and popular products if not a product url
        
        let url = (new URL(parsedParams.data.url));
        
        const storeData = await db.getStoreByUrl(url.hostname)

        const res = await fetchProductsByPageType(url.hostname,url.pathname,storeData.accessToken,storeData.storeHash)
        
        if(res.hasOwnProperty('name')){
            chatContextFromUI['currentProduct'] = res
        }else{
            chatContextFromUI['storeProducts'] = res
        }
    }
    
    var parsedSchema =await aiChatSchema.safeParse(chatContextFromUI)
    
    const replay = await generateNextChatReplay(parsedSchema);

    return NextResponse.json({replay})

}