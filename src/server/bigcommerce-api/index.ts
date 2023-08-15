import { type Product, type MinimalProduct,type StoreProducts } from 'types';
import { fetchProduct, fetchCategories, fetchBrand } from './client';
import { createCustomerImpersonationToken, fetchGraphQL } from '~/utils/bigcommerce';

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

  const parsedResponse = await fetchGraphQL(storeUrl, bearerToken, getPageTypeByUrlQuery(pageUrl))

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
    const parsedStoreProductsResponse = await fetchGraphQL(storeUrl, bearerToken, getStoreProductsQuery())

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