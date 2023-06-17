import { gql } from 'apollo-server-express';

export const addReviewMutation = gql`
  mutation AddReview($productId: String!, $reviewBody: ReviewInput!) {
    addReview(productId: $productId, reviewBody: $reviewBody) {
      message
    }
  }
`;

export const deleteReviewMutation = gql`
  mutation DeleteReview($reviewId: String!) {
    deleteReview(reviewId: $reviewId) {
      message
    }
  }
`;
