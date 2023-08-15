import jwt from 'jsonwebtoken';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as db from '~/lib/db';
import { env } from '~/env.mjs';
import { createAppExtension } from '~/lib/appExtensions';
import { BIGCOMMERCE_LOGIN_URL } from '~/constants';
import { createCustomerImpersonationToken, fetchGraphQL } from '~/utils/bigcommerce';
import { createScript } from '~/server/bigcommerce-api/client';

const queryParamSchema = z.object({
  code: z.string(),
  scope: z.string(),
  context: z.string(),
});

const oauthResponseSchema = z.object({
  access_token: z.string(),
  scope: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
  }),
  context: z.string(),
  account_uuid: z.string(),
});

export async function GET(req: NextRequest) {
  const parsedParams = queryParamSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );

  if (!parsedParams.success) {
    return new NextResponse('Invalid query parameters', { status: 400 });
  }

  const oauthResponse = await fetch(`${BIGCOMMERCE_LOGIN_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      code: parsedParams.data.code,
      context: parsedParams.data.context,
      scope: parsedParams.data.scope,
      grant_type: 'authorization_code',
      redirect_uri: env.AUTH_CALLBACK,
    }),
  });

  const parsedOAuthResponse = oauthResponseSchema.safeParse(
    await oauthResponse.json()
  );

  if (!parsedOAuthResponse.success) {
    return new NextResponse('Invalid access token response', { status: 500 });
  }

  const {
    access_token: accessToken,
    context,
    scope,
    user: oauthUser,
  } = parsedOAuthResponse.data;

  const storeHash = context.split('/')[1];

  const storeUrlQuery = () => ({
    query: `
      query{
        site{
          settings{
            url{
              vanityUrl
            }
          }
        }
      }
    `,
  })

  var bearerToken = await createCustomerImpersonationToken(storeHash!, accessToken)

  var parsedstoreUrlResponse = await fetchGraphQL(`store-${storeHash}.mybigcommerce.com`, bearerToken, storeUrlQuery())

  await db.setStore({
    access_token: accessToken,
    context,
    scope,
    user: oauthUser,
    storeUrl: parsedstoreUrlResponse.data.site.settings.url.vanityUrl
  });
  await db.setUser(oauthUser);
  await db.setStoreUser({
    access_token: accessToken,
    context,
    scope,
    user: oauthUser,
  });

  /**
   * For stores that do not have the app installed yet, create App Extensions when app is
   * installed.
   */
  const isAppExtensionsScopeEnabled = scope.includes(
    'store_app_extensions_manage'
  );
  if (isAppExtensionsScopeEnabled && storeHash) {
    await createAppExtension({ accessToken, storeHash });
  } else {
    console.warn(
      'WARNING: App extensions scope is not enabled yet. To register app extensions update the scope in Developer Portal: https://devtools.bigcommerce.com'
    );
  }

  /**
   * For sotres that do not have the app install yet, create and inject the Chat UI script 
   * using the BigCommerce ScriptAPI
   */
  const isContentScopeEnabled = scope.includes('store_v2_content') && scope.includes('store_content_checkout');
  if (isContentScopeEnabled && storeHash) {
    await createScript(accessToken, storeHash);
  } else {
    console.warn(
      'WARNING: Both "Content Scope" and "Checkout Content Scope" are required. To inject the script to your frontend update the scope in Developer Portal: https://devtools.bigcommerce.com'
    );
  }



  const clientToken = jwt.sign(
    { userId: oauthUser.id, storeHash },
    env.JWT_KEY,
    { expiresIn: 3600 }
  );

  return NextResponse.redirect(env.APP_ORIGIN, {
    status: 302,
    statusText: 'Found',
    headers: {
      'set-cookie': `ai-app-foundation-token=${clientToken}; SameSite=None; Secure; Path=/; Partitioned; HttpOnly; Max-Age=3600;`,
    },
  });
}
