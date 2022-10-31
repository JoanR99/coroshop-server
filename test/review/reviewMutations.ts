import { gql } from 'apollo-server-express';

export const addReviewMutation = gql`
  mutation AddReview($productId: String!, $reviewBody: ReviewInput!) {
    addReview(productId: $productId, reviewBody: $reviewBody) {
      message
    }
  }
`;
