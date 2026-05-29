// All GraphQL query/mutation strings in one place.
// In a larger app, split by domain. Here centralised for clarity.

// List query: select materialCount (one batched COUNT query per request via
// DataLoader) instead of the full materials array. The list view only needs
// the badge "📦 N materials" — selecting the array would pull every material
// for every project on the page, which scales linearly with project count
// AND materials per project. Detail page (PROJECT_QUERY) still selects them.
export const PROJECT_STATUS_COUNTS_QUERY = `
  query ProjectStatusCounts {
    projectStatusCounts {
      status
      count
    }
  }
`;

export const PROJECTS_QUERY = `
  query Projects($limit: Int!, $offset: Int!, $search: String) {
    projects(limit: $limit, offset: $offset, search: $search) {
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

export const CREATE_PROJECT_WITH_MATERIALS_MUTATION = `
  mutation CreateProjectWithMaterials($input: CreateProjectWithMaterialsInput!) {
    createProjectWithMaterials(input: $input) {
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
      refreshToken
      accessTokenExpiresAt
      user {
        id
        name
        email
        role
      }
    }
  }
`;

// Used by NextAuth's jwt callback when the access token is near expiry.
// Returns the same shape as login; the new refresh token replaces the old.
export const REFRESH_TOKENS_MUTATION = `
  mutation RefreshTokens($input: RefreshTokenInput!) {
    refreshTokens(input: $input) {
      accessToken
      refreshToken
      accessTokenExpiresAt
      user {
        id
        name
        email
        role
      }
    }
  }
`;

// Best-effort revocation on signOut. Failure is non-fatal — the access
// token will expire on its own and the refresh token at most lives out
// its TTL.
export const LOGOUT_MUTATION = `
  mutation Logout($input: RefreshTokenInput!) {
    logout(input: $input)
  }
`;

const SESSION_FIELDS = `
  id
  userAgent
  ipAddress
  createdAt
  expiresAt
  current
`;

export const MY_SESSIONS_QUERY = `
  query MySessions {
    mySessions { ${SESSION_FIELDS} }
  }
`;

export const USER_SESSIONS_QUERY = `
  query UserSessions($userId: ID!) {
    userSessions(userId: $userId) { ${SESSION_FIELDS} }
  }
`;

export const REVOKE_SESSION_MUTATION = `
  mutation RevokeSession($id: ID!) {
    revokeSession(id: $id)
  }
`;

export const REVOKE_USER_SESSION_MUTATION = `
  mutation RevokeUserSession($userId: ID!, $sessionId: ID!) {
    revokeUserSession(userId: $userId, sessionId: $sessionId)
  }
`;

export const REVOKE_ALL_USER_SESSIONS_MUTATION = `
  mutation RevokeAllUserSessions($userId: ID!) {
    revokeAllUserSessions(userId: $userId)
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

export const USER_BY_ID_QUERY = `
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      email
      role
    }
  }
`;

export const EQUIPMENTS_QUERY = `
  query Equipments($limit: Int!, $offset: Int!, $search: String) {
    equipments(limit: $limit, offset: $offset, search: $search) {
      items {
        id
        name
        description
        createdAt
        updatedAt
        manager {
          id
          name
          email
        }
      }
      total
      limit
      offset
    }
  }
`;

export const EQUIPMENT_QUERY = `
  query Equipment($id: ID!) {
    equipment(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      manager {
        id
        name
        email
      }
    }
  }
`;

export const CREATE_EQUIPMENT_MUTATION = `
  mutation CreateEquipment($input: CreateEquipmentInput!) {
    createEquipment(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_EQUIPMENT_MUTATION = `
  mutation UpdateEquipment($id: ID!, $input: UpdateEquipmentInput!) {
    updateEquipment(id: $id, input: $input) {
      id
      name
      description
    }
  }
`;

export const REMOVE_EQUIPMENT_MUTATION = `
  mutation RemoveEquipment($id: ID!) {
    removeEquipment(id: $id)
  }
`;

export const REMOVE_PROJECT_MUTATION = `
  mutation RemoveProject($id: ID!) {
    removeProject(id: $id)
  }
`;

export const DELETED_PROJECTS_QUERY = `
  query DeletedProjects {
    deletedProjects {
      id
      name
      status
      createdAt
      updatedAt
      deletedAt
      manager {
        id
        name
        email
      }
    }
  }
`;

export const DELETED_EQUIPMENTS_QUERY = `
  query DeletedEquipments {
    deletedEquipments {
      id
      name
      description
      createdAt
      updatedAt
      deletedAt
      manager {
        id
        name
        email
      }
    }
  }
`;

export const RESTORE_PROJECT_MUTATION = `
  mutation RestoreProject($id: ID!) {
    restoreProject(id: $id) {
      id
      name
    }
  }
`;

export const RESTORE_EQUIPMENT_MUTATION = `
  mutation RestoreEquipment($id: ID!) {
    restoreEquipment(id: $id) {
      id
      name
    }
  }
`;

export const PURGE_PROJECT_MUTATION = `
  mutation PurgeProject($id: ID!) {
    purgeProject(id: $id)
  }
`;

export const PURGE_EQUIPMENT_MUTATION = `
  mutation PurgeEquipment($id: ID!) {
    purgeEquipment(id: $id)
  }
`;

export const MANAGERS_QUERY = `
  query Managers {
    managers {
      id
      name
      email
    }
  }
`;

export const USERS_QUERY = `
  query Users($limit: Int!, $offset: Int!, $search: String) {
    users(limit: $limit, offset: $offset, search: $search) {
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

export const REMOVE_MATERIAL_MUTATION = `
  mutation RemoveMaterial($id: ID!) {
    removeMaterial(id: $id)
  }
`;

export const UPDATE_MATERIAL_MUTATION = `
  mutation UpdateMaterial($id: ID!, $input: UpdateMaterialInput!) {
    updateMaterial(id: $id, input: $input) {
      id
      name
      quantity
      unit
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

