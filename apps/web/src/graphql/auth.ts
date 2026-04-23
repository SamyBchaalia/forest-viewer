import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        lastLng
        lastLat
        lastZoom
        lastFilters
        lastActiveLayers
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      lastLng
      lastLat
      lastZoom
      lastFilters
      lastActiveLayers
    }
  }
`;

export const UPDATE_MAP_STATE = gql`
  mutation UpdateMapState($input: MapStateInput!) {
    updateMapState(input: $input) {
      id
      lastLng
      lastLat
      lastZoom
      lastFilters
      lastActiveLayers
    }
  }
`;