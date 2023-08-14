import { type Product, type MinimalProduct } from 'types';
import { fetchProduct, fetchCategories, fetchBrand } from './client';
import { BIGCOMMERCE_API_URL } from '~/constants';

export const fetchProductWithAttributes = async (
  id: number,
  accessToken: string,
  storeHash: string
): Promise<Product> => {
  const product = await fetchProduct(id, accessToken, storeHash);

  const { categories, brand_id } = product;

  const [categoriesPromise, brandPromise] = await Promise.allSettled([
    fetchCategories(categories, accessToken, storeHash),
    brand_id ? fetchBrand(brand_id, accessToken, storeHash) : null,
  ]);

  const categoriesNames =
    categoriesPromise.status === 'fulfilled'
      ? categoriesPromise.value.join(',')
      : [];
  const brand = brandPromise.status === 'fulfilled' ? brandPromise.value : '';

  return { ...product, id, brand, categoriesNames } as Product;
};

export const fetchPageType = async (
  storeUrl: string,
  pageUrl: string,
  accessToken: string,
  storeHash: string,
): Promise<{ pageType: String, product?: MinimalProduct }> => {

  // Get the bearer token that expires at one minute
  var bearerToken = await createCustomerImpersonationToken(storeHash, accessToken)

  const response = await fetch(
    `https://${storeUrl}/graphql`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(getPageTypeByUrlQuery(pageUrl)),
    }
  );

  const parsedResponse = await response.json();
  if (parsedResponse.data.site.route.node.__typename == "Product") {
    var resProduct = parsedResponse.data.site.route.node;
    var product: MinimalProduct = { id: resProduct.entityId, description: resProduct.description, name: resProduct.name }

    return { pageType: "Product", product: product }
  }

  return { pageType: parsedResponse.data.site.route.node.__typename as string }

}

const getPageTypeByUrlQuery = (urlPath) => ({
  query: `
      query ($urlPath:String!){
        site {
          route(path: $urlPath) {
            node {
              __typename
              ... on Product {
                ...ProductFields
                relatedProducts{
                  edges{
                    node{
                      ...ProductFields
                    }
                  }
                }
              }
            }
          }
        }
      }
      fragment ProductFields on Product{
        entityId
        name
        description
        warranty
        minPurchaseQuantity
        maxPurchaseQuantity
        prices{
          salePrice{value}
          retailPrice{value}
        }
        weight{value}
        height{value}
        width{value}
        depth{value}
      }`,
  variables: {
    urlPath: urlPath,
  },
});


const createCustomerImpersonationToken = async (storeHash: string, accessToken: string): Promise<string> => {

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