export const createClient = () => ({ auth: { getUser: async () => ({ data: { user: null } }), signOut: async () => ({ error: null }) } });
