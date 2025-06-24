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
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
