import { gql } from 'apollo-server-express';

export const addProductMutation = gql`
  mutation AddProduct($addProductInput: ProductInput!) {
    addProduct(addProductInput: $addProductInput) {
      id
      name
      image
      rating
      price
    }
  }
`;

export const deleteProductMutation = gql`
  mutation DeleteProduct($productId: String!) {
    deleteProduct(productId: $productId) {
      message
    }
  }
`;

export const updateProductMutation = gql`
  mutation UpdateProduct($productBody: ProductInput!, $productId: String!) {
    updateProduct(productBody: $productBody, productId: $productId) {
      id
      name
      image
      rating
      price
    }
  }
`;
