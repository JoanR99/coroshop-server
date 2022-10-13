import { gql } from 'apollo-server-express';

export const getProductsQuery = gql`
  query GetProducts($getProductsInput: GetItemsInput!) {
    getProducts(getProductsInput: $getProductsInput) {
      page
      pages
      products {
        id
        name
        image
        rating
        price
        category
        brand
      }
    }
  }
`;

export const getProductQuery = gql`
  query GetProduct($productId: String!) {
    getProduct(productId: $productId) {
      id
      name
      image
      brand
      category
      description
      rating
      numReviews
      price
      countInStock
    }
  }
`;
