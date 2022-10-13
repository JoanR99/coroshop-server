import { gql } from 'apollo-server-express';

export const addUser = gql`
  mutation AddUser($addUserInput: AddUserInput!) {
    addUser(addUserInput: $addUserInput) {
      id
      name
      email
      isAdmin
    }
  }
`;

export const updateUserProfile = gql`
  mutation UpdateUserProfile($updateBody: UpdateUserProfileInput!) {
    updateUserProfile(updateBody: $updateBody) {
      id
      name
      email
      isAdmin
    }
  }
`;

export const deleteUser = gql`
  mutation DeleteUser($userId: String!) {
    deleteUser(userId: $userId) {
      message
    }
  }
`;

export const updateUser = gql`
  mutation UpdateUser($updateBody: UpdateUser!, $userId: String!) {
    updateUser(updateBody: $updateBody, userId: $userId) {
      id
      name
      email
      isAdmin
    }
  }
`;
