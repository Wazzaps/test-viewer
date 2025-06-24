// Configuration for GitHub OAuth and Cloudflare Worker
export const config = {
  // GitHub OAuth App Client ID
  // You need to create a GitHub OAuth App at https://github.com/settings/developers
  // and set the Authorization callback URL to your domain
  GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv23li8YuZuo7xQFuMDO',

  // GitHub API base URL
  GITHUB_API_BASE: 'https://api.github.com',

  // GitHub OAuth base URL
  GITHUB_OAUTH_BASE: 'https://github.com/login/oauth',
};
