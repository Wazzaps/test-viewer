import { ArrowRight, Bird, Book, Building2, CheckCircle, FlaskConical, Github, Shapes, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { config } from '@/config';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    type: string;
  };
  private: boolean;
  description: string | null;
}

interface GitHubApiRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    type: string;
  };
  private: boolean;
  description: string | null;
}

interface User {
  login: string;
  name: string;
  avatar_url: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for authorization code in URL (OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      console.error('GitHub OAuth error:', error);
      setAuthError(`Authentication failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      // Validate state parameter for security
      const savedState = localStorage.getItem('github_oauth_state');
      if (!state || !savedState || state !== savedState) {
        console.error('OAuth state mismatch - possible CSRF attack');
        setAuthError('Authentication failed due to security validation error.');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOAuthCallback(code);
    } else {
      // Check if user is already authenticated
      const token = localStorage.getItem('github_token');
      if (token) {
        setIsAuthenticated(true);
        fetchUserData(token);
        fetchRepositories(token);
      }
    }
  }, [isAuthenticated]);

  const handleOAuthCallback = async (code: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      // Exchange authorization code for access token using worker
      const tokenResponse = await fetch('/api/github-auth', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: window.location.origin,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const accessToken = tokenData.access_token;
      localStorage.setItem('github_token', accessToken);
      setIsAuthenticated(true);

      // Fetch user data and repositories
      await fetchUserData(accessToken);
      await fetchRepositories(accessToken);

      // Check if there's a stored redirect URL (from reauth on other pages)
      const redirectUrl = localStorage.getItem('github_oauth_redirect');
      if (redirectUrl) {
        localStorage.removeItem('github_oauth_redirect');
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Failed to complete OAuth flow:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGitHub = () => {
    setAuthError(null);
    const state =
      Math.random().toString(36).substring(7) +
      Math.random().toString(36).substring(7) +
      Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);

    const authUrl = `${config.GITHUB_OAUTH_BASE}/authorize?client_id=${config.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=repo&state=${state}`;
    window.location.href = authUrl;
  };

  const signOut = () => {
    const savedTheme = localStorage.getItem('theme');
    localStorage.clear();
    if (savedTheme) {
      localStorage.setItem('theme', savedTheme);
    }
    setUser(null);
    setIsAuthenticated(false);
    setRepositories([]);
  };

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const userData = await response.json();
      const user = {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
      };
      setUser(user);

      // Store the user login in localStorage for use in other components
      localStorage.setItem('github_user_login', user.login);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If token is invalid, sign out
      if (error instanceof Error && error.message.includes('401')) {
        signOut();
      }
    }
  };

  const fetchRepositories = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&visibility=all', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const reposData = await response.json();
      const repos: Repository[] = reposData.map((repo: GitHubApiRepository) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login,
          type: repo.owner.type,
        },
        private: repo.private,
        description: repo.description,
      }));

      setRepositories(repos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      // If token is invalid, sign out
      if (error instanceof Error && error.message.includes('401')) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  // Group repositories by organization
  const groupedRepos = repositories.reduce(
    (acc, repo) => {
      const owner = repo.owner.login;
      if (!acc[owner]) {
        acc[owner] = [];
      }
      acc[owner].push(repo);
      return acc;
    },
    {} as Record<string, Repository[]>,
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div></div>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-6">
                <FlaskConical className="h-12 w-12 text-primary" />
                <h1 className="text-4xl md:text-6xl font-bold">Test Viewer for GitHub</h1>
              </div>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                View your GitHub Actions' test results with a simple interface
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                {authLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Completing authentication...</p>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="text-lg px-8 py-6"
                      onClick={() => window.open('https://github.com/Wazzaps/test-viewer/wiki', '_blank')}
                    >
                      <Book className="mr-2 h-5 w-5" />
                      Documentation
                    </Button>
                    <Button onClick={signInWithGitHub} size="lg" className="text-lg px-8 py-6">
                      <Github className="mr-2 h-5 w-5" />
                      Sign in with GitHub
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}
              </div>

              {authError && (
                <div className="max-w-md mx-auto mb-8">
                  <Alert variant="destructive">
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Screenshot Section */}
        <section className="py-10 px-4 bg-muted/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Screenshot</h2>
            </div>

            <img
              src="/screenshot.jpg"
              alt="Test results"
              className="w-full h-auto rounded-lg border border-primary/20 shadow-md"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-10 px-4 bg-muted/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Features</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Secure & Private</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Your private data never leaves your browser.</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Trivial Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Just output a JUnit XML among your artifacts.</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shapes className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Intuitive UI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Pick repository, see test results. Just like that.</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Bird className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>
                    Free &{' '}
                    <a href="https://github.com/Wazzaps/test-viewer" className="text-primary underline">
                      Open Source
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Our server costs are trivial since it's all local.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 px-4">
          <div className="container mx-auto text-center">
            <p className="text-muted-foreground">
              © 2025 Test Viewer for GitHub. Built with ❤️ by{' '}
              <a href="https://github.com/Wazzaps" className="text-primary hover:underline">
                Wazzaps
              </a>
              .
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Test Viewer for GitHub</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img
                src={user?.avatar_url || '/placeholder-user.jpg'}
                alt={user?.name}
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Repositories</h2>
          <p className="text-muted-foreground">Select a repository to view its test results</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRepos).map(([orgName, repos]) => (
              <div key={orgName}>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{orgName}</h3>
                  <Badge variant="secondary">{repos.length} repositories</Badge>
                </div>
                <div
                  className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4"
                  style={{ columnFill: 'balance' }}
                >
                  {repos.map((repo) => (
                    <div key={repo.id} className="break-inside-avoid">
                      <Link to={`/tests/${repo.owner.login}/${repo.name}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">{repo.name}</CardTitle>
                                <CardDescription className="text-sm">{repo.description}</CardDescription>
                              </div>
                              {repo.private && (
                                <Badge variant="outline" className="text-xs">
                                  Private
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && repositories.length === 0 && (
          <div className="text-center py-12">
            <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
            <p className="text-muted-foreground">You don't have access to any repositories yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
