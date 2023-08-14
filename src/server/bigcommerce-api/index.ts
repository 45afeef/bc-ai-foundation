import { type Product, type MinimalProduct,type StoreProducts } from 'types';
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

export const fetchProductsByPageType = async (
  storeUrl: string,
  pageUrl: string,
  accessToken: string,
  storeHash: string,
): Promise<MinimalProduct | StoreProducts> => {

  // Get the bearer token that expires at one minute
  var bearerToken = await createCustomerImpersonationToken(storeHash, accessToken)

  const response = await fetchGraphQL(storeUrl, bearerToken, getPageTypeByUrlQuery(pageUrl))

  const parsedResponse = await response.json();
  var pageType = parsedResponse.data.site.route.node?.__typename
  if (pageType == "Product") {
    var resProduct = parsedResponse.data.site.route.node;
    var product: MinimalProduct = {
      ...resProduct,
      relatedProducts: resProduct.relatedProducts.edges.map(({ node }) => node)
    }
    delete product['__typename'];

    return product
  } else {
    const storeProductsResponse = await fetchGraphQL(storeUrl, bearerToken, getStoreProductsQuery())

    const parsedStoreProductsResponse = await storeProductsResponse.json()

    const storeProducts: StoreProducts = {
      bestSellingProducts: parsedStoreProductsResponse.data.site.bestSellingProducts.edges.map(({ node }) => node),
      featuredProducts: parsedStoreProductsResponse.data.site.featuredProducts.edges.map(({ node }) => node),
      newestProducts: parsedStoreProductsResponse.data.site.newestProducts.edges.map(({ node }) => node),
    }

    return storeProducts
  }
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
        id:entityId
        name
        description
      }`,
  variables: {
    urlPath: urlPath,
  },
});

const getStoreProductsQuery = () => ({
  query: `
    query {
      site {
        bestSellingProducts{
          edges{
            ...MinimalProduct
          }
        }
        featuredProducts{
          edges{
            ...MinimalProduct
          }
        }
        newestProducts{
          edges{
            ...MinimalProduct
          }
        }
      }
    }
    fragment MinimalProduct on ProductEdge{
      node{
        id:entityId
        name
        description
      }
    }`,
})

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

const fetchGraphQL = async (storeUrl, bearerToken, query) => await fetch(
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
)