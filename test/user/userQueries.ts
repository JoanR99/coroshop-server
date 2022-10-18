import { gql } from 'apollo-server-express';

export const getUserProfileQuery = gql`
  query GetUserProfile {
    getUserProfile {
      id
      name
      email
      isAdmin
    }
  }
`;

export const getUsersQuery = gql`
  query getUsers($getUsersInput: GetItemsInput!) {
    getUsers(getUsersInput: $getUsersInput) {
      users {
        id
        name
        email
        isAdmin
      }
      page
      pages
    }
  }
`;

export const getUserQuery = gql`
  query GetUser($userId: String!) {
    getUser(userId: $userId) {
      id
      name
      email
      isAdmin
    }
  }
`;
