import { githubAuth } from './githubAuth';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/github-auth') {
      return checkPost(request) || (await githubAuth(request, env));
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function checkPost(request: Request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  }
}
