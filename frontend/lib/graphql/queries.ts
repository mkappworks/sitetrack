// All GraphQL query/mutation strings in one place.
// In a larger app, split by domain. Here centralised for clarity.

// List query: select materialCount (one batched COUNT query per request via
// DataLoader) instead of the full materials array. The list view only needs
// the badge "📦 N materials" — selecting the array would pull every material
// for every project on the page, which scales linearly with project count
// AND materials per project. Detail page (PROJECT_QUERY) still selects them.
export const PROJECTS_QUERY = `
  query Projects($limit: Int!, $offset: Int!) {
    projects(limit: $limit, offset: $offset) {
      items {
        id
        name
        description
        status
        location
        startDate
        endDate
        createdAt
        updatedAt
        manager {
          id
          name
          email
        }
        materialCount
      }
      total
      limit
      offset
    }
  }
`;

export const PROJECT_QUERY = `
  query Project($id: ID!) {
    project(id: $id) {
      id
      name
      description
      status
      location
      startDate
      endDate
      createdAt
      updatedAt
      manager {
        id
        name
        email
      }
      materials {
        id
        name
        quantity
        unit
        status
      }
    }
  }
`;

export const CREATE_PROJECT_MUTATION = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      status
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      status
      updatedAt
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      name
      email
      role
    }
  }
`;

export const USERS_QUERY = `
  query Users($limit: Int!, $offset: Int!) {
    users(limit: $limit, offset: $offset) {
      items {
        id
        name
        email
        role
        createdAt
      }
      total
      limit
      offset
    }
  }
`;

export const CREATE_MATERIAL_MUTATION = `
  mutation CreateMaterial($input: CreateMaterialInput!) {
    createMaterial(input: $input) {
      id
      name
      quantity
      unit
      status
    }
  }
`;

export const UPDATE_MATERIAL_MUTATION = `
  mutation UpdateMaterial($id: ID!, $input: UpdateMaterialInput!) {
    updateMaterial(id: $id, input: $input) {
      id
      status
    }
  }
`;

// Subscription — used in Client Components with graphql-ws
export const PROJECT_UPDATED_SUBSCRIPTION = `
  subscription ProjectUpdated {
    projectUpdated {
      id
      name
      status
      updatedAt
    }
  }
`;

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
    }
  }
`;

