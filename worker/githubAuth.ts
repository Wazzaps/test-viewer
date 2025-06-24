const WHITELISTED_REDIRECT_URIS = ['https://test-viewer.wazzaps.net', 'http://localhost:5173', 'http://localhost:4173'];

interface AuthRequest {
  code: string;
  redirect_uri?: string;
}

export async function githubAuth(request: Request, env: Env) {
  // Parse the request body
  const requestData = (await request.json()) as AuthRequest;
  const code = requestData.code;
  const redirectUri = requestData.redirect_uri || WHITELISTED_REDIRECT_URIS[0];

  if (!WHITELISTED_REDIRECT_URIS.includes(redirectUri)) {
    console.error('Invalid redirect URI', redirectUri);
    return new Response(
      JSON.stringify({
        error: 'invalid_redirect_uri',
        error_description: 'Invalid redirect URI',
      }),
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      },
    );
  }

  // Validate required parameters
  if (!code) {
    return new Response(
      JSON.stringify({
        error: 'missing_code',
        error_description: 'Authorization code is required',
      }),
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      },
    );
  }

  // Parse client_id and client_secret from the secret
  const credentials = await env.TEST_VIEWER_KEY.get();
  if (!credentials) {
    throw new Error('TEST_VIEWER_KEY not found');
  }
  const [client_id, client_secret] = credentials.split(':');
  if (!client_id || !client_secret) {
    throw new Error('Invalid TEST_VIEWER_KEY format. Expected CLIENT_ID:CLIENT_SECRET');
  }

  // Make the request to GitHub's token endpoint
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: client_id,
      client_secret: client_secret,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  // Return the token response to the client
  return new Response(await tokenResponse.text(), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
