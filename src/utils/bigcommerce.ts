import { BIGCOMMERCE_API_URL } from "~/constants";

export const createCustomerImpersonationToken = async (storeHash: string, accessToken: string): Promise<string> => {

    var expiryTime = Math.floor(new Date().getTime() / 1000) + 60 //86400

    const response = await fetch(
        `${BIGCOMMERCE_API_URL}/stores/${storeHash}/v3/storefront/api-token-customer-impersonation`,
        {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-auth-token': accessToken,
            },
            body: JSON.stringify({ "channel_id": 1, "expires_at": expiryTime }),
        }
    );

    const parsedResponse = await response.json()

    return parsedResponse.data.token
}


export const fetchGraphQL = async (storeUrl, bearerToken, query) => await fetch(
    `https://${storeUrl}/graphql`,
    {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(query),
    }
).then(e=>e.json())