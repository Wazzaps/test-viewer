import * as zip from '@zip.js/zip.js';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  CircleHelp,
  Clock,
  Download,
  ExternalLink,
  Filter,
  FlaskConicalOff,
  Github,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  workflow_id: number;
  workflow_name: string;
  run_number: number;
  actor: {
    login: string;
  };
}

interface TestResult {
  id: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  errorType?: string;
  errorContent?: string;
  skippedMessage?: string;
}

interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

// GitHub API response types
interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  workflow_id: number;
  workflow_name: string;
  run_number: number;
  actor: {
    login: string;
  };
  path: string;
}

interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export default function TestsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const org = params.org as string;
  const repo = params.repo as string;

  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadedTestResults, setLoadedTestResults] = useState<Set<string>>(new Set());
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [expandedTestErrors, setExpandedTestErrors] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [filterMyRuns, setFilterMyRuns] = useState(false);
  const currentUser = localStorage.getItem('github_user_login');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('github_token');
    if (!token) {
      setError('No authentication token found. Please sign in to view test results.');
      return;
    }

    fetchWorkflowRuns();
  }, [org, repo]);

  useEffect(() => {
    if (workflowRuns.length > 0) {
      // Check if there's a run ID in the URL
      const runIdFromUrl = searchParams.get('run');

      if (runIdFromUrl) {
        // Find the run with the ID from URL
        const runFromUrl = workflowRuns.find((run) => run.id.toString() === runIdFromUrl);
        if (runFromUrl) {
          setSelectedRun(runFromUrl);
          return;
        }
      }

      // If no run in URL or run not found, select the first run and update URL
      if (!selectedRun) {
        const firstRun = workflowRuns[0];
        setSelectedRun(firstRun);
        setSearchParams({ run: firstRun.id.toString() });
        fetchArtifacts(firstRun);
      }
    }
  }, [workflowRuns, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedRun) {
      fetchArtifacts(selectedRun);
    }
  }, [selectedRun]);

  const fetchWorkflowRuns = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('github_token');
    if (!token) {
      setError('No authentication token found. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${org}/${repo}/actions/runs?per_page=100`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Your token may have expired. Please sign in again.');
          localStorage.removeItem('github_token');
          navigate('/');
          return;
        }
        if (response.status === 404) {
          setError("Repository not found or you don't have access to it.");
          return;
        }
        if (response.status === 403) {
          setError("Access denied. You may not have permission to view this repository's actions.");
          return;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const runs: WorkflowRun[] = data.workflow_runs
        .filter((run: GitHubWorkflowRun) => run.path.includes('test'))
        .map((run: GitHubWorkflowRun) => ({
          id: run.id,
          name: run.name || run.workflow_id.toString(),
          head_branch: run.head_branch,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
          workflow_id: run.workflow_id,
          workflow_name: run.name || `Workflow ${run.workflow_id}`,
          run_number: run.run_number,
          actor: {
            login: run.actor.login,
          },
        }));

      setWorkflowRuns(runs);
    } catch (error) {
      console.error('Failed to fetch workflow runs:', error);
      setError('Failed to fetch workflow runs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processTestResultsArtifact = async (artifact: Artifact, blob: Blob, runId: number) => {
    const zipReader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await zipReader.getEntries();
    for (const entry of entries) {
      if (entry.filename.endsWith('.xml')) {
        const content = await entry.getData!(new zip.TextWriter());
        const xml = new DOMParser().parseFromString(content, 'application/xml');
        const testSuites = xml.getElementsByTagName('testsuite');
        const newTestResults: TestResult[] = [];
        for (const testSuite of testSuites) {
          const testSuiteName = testSuite.getAttribute('name');
          const testCases = testSuite.getElementsByTagName('testcase');
          for (const testCase of testCases) {
            const testcaseName = testCase.getAttribute('name');
            const testcaseDuration = testCase.getAttribute('time');
            const testcaseSystemOut = testCase.getElementsByTagName('system-out')[0]?.textContent;
            const testcaseSystemErr = testCase.getElementsByTagName('system-err')[0]?.textContent;
            const testcaseFailure = testCase.getElementsByTagName('failure')[0];
            const testcaseFailureMessage = testcaseFailure?.getAttribute('message');
            const testcaseFailureType = testcaseFailure?.getAttribute('type');
            const testcaseFailureContent = testcaseFailure?.textContent;
            const testcaseSkipped = testCase.getElementsByTagName('skipped')[0];
            const testcaseSkippedMessage = testcaseSkipped?.getAttribute('message');
            newTestResults.push({
              id: `${artifact.name}-${testSuiteName}-${testcaseName}`,
              // name: `${artifact.name}/${entry.filename}/${testSuiteName}/${testcaseName}`,
              name: testcaseName!,
              suite: `${testSuiteName} • ${artifact.name}`,
              status: testcaseFailure ? 'failed' : testcaseSkipped ? 'skipped' : 'passed',
              duration: testcaseDuration ? parseFloat(testcaseDuration) : 0,
              stdout: (testcaseSystemOut || '').trim(),
              stderr: (testcaseSystemErr || '').trim(),
              errorMessage: testcaseFailureMessage || undefined,
              errorType: testcaseFailureType || undefined,
              errorContent: testcaseFailureContent || undefined,
              skippedMessage: testcaseSkippedMessage || undefined,
            });
          }
        }
        const fullArtifactId = `${runId}-${artifact.id}-${entry.filename}`;
        setLoadedTestResults((prev) => {
          if (selectedRun?.id !== runId || prev.has(fullArtifactId)) {
            return prev;
          }
          prev.add(fullArtifactId);
          setTestResults((prev) =>
            [...prev, ...newTestResults].sort((a, b) => {
              // First sort by status: failed, skipped, passed
              const statusOrder = { failed: 0, skipped: 1, passed: 2 };
              const statusDiff = statusOrder[a.status] - statusOrder[b.status];
              if (statusDiff !== 0) return statusDiff;

              // Then sort by id (suite + name)
              return a.id.localeCompare(b.id);
            }),
          );
          setLoadingTests(false);
          return prev;
        });
      }
    }
  };

  const blobToBase64 = (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise<string>((resolve) => {
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
    });
  };

  const fetchTestResultsArtifact = async (artifact: Artifact, runId: number) => {
    // Skip artifacts larger than 1MB
    if (artifact.size_in_bytes > 1024 * 1024) return;

    const token = localStorage.getItem('github_token');
    if (!token) return;

    // Check for cached blob
    const cacheKey = `artifact_${artifact.id}`;
    const cachedBlob = localStorage.getItem(cacheKey);

    if (cachedBlob) {
      console.log(`Using cached artifact: ${artifact.name}`);
      // Convert base64 back to blob
      const response = await fetch(cachedBlob);
      const blob = await response.blob();
      await processTestResultsArtifact(artifact, blob, runId);
      return;
    }

    // Get the download URL for the artifact
    const downloadResponse = await fetch(
      `https://api.github.com/repos/${org}/${repo}/actions/artifacts/${artifact.id}/zip`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (!downloadResponse.ok) {
      console.error(`Failed to download artifact ${artifact.name}: ${downloadResponse.status}`);
      return;
    }

    // Create a blob from the response
    const blob = await downloadResponse.blob();
    console.log(`Artifact "${artifact.name}" downloaded`);

    // Cache the blob as base64
    const base64 = await blobToBase64(blob);
    localStorage.setItem(cacheKey, base64);

    await processTestResultsArtifact(artifact, blob, runId);
  };

  const processArtifactsList = async (run: WorkflowRun, artifacts: Artifact[]) => {
    setArtifacts(artifacts);
    if (run.conclusion) {
      localStorage.setItem(`run_artifacts_${run.id}`, JSON.stringify(artifacts));
    }

    // Automatically download and log test artifacts
    const testArtifacts = artifacts.filter(
      (artifact) =>
        artifact.name.toLowerCase().includes('test-artifacts') || artifact.name.toLowerCase().includes('test-results'),
    );

    for (const artifact of testArtifacts) {
      try {
        console.log(`Downloading test artifact: ${artifact.name}`, artifact);
        fetchTestResultsArtifact(artifact, run.id);
      } catch (error) {
        console.error(`Error processing test artifact ${artifact.name}:`, error);
      }
    }

    if (testArtifacts.length === 0) {
      setLoadingTests(false);
    }
  };

  const fetchArtifacts = async (run: WorkflowRun) => {
    const token = localStorage.getItem('github_token');
    if (!token) return;

    setLoadingArtifacts(true);
    setLoadingTests(true);
    setError(null);
    setArtifacts([]);
    setTestResults([]);
    setLoadedTestResults(new Set());

    const cachedArtifacts = localStorage.getItem(`run_artifacts_${run.id}`);
    if (cachedArtifacts) {
      const artifacts: Artifact[] = JSON.parse(cachedArtifacts);
      await processArtifactsList(run, artifacts);
      setLoadingArtifacts(false);
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${org}/${repo}/actions/runs/${run.id}/artifacts`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Your token may have expired. Please sign in again.');
          localStorage.removeItem('github_token');
          navigate('/');
          return;
        }
        if (response.status === 404) {
          setError('Artifacts not found for this workflow run.');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. You may not have permission to view artifacts.');
          return;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const artifacts: Artifact[] = data.artifacts.map((artifact: GitHubArtifact) => ({
        id: artifact.id,
        name: artifact.name,
        size_in_bytes: artifact.size_in_bytes,
      }));
      processArtifactsList(run, artifacts);
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
      setError('Failed to fetch artifacts. Please try again.');
      setArtifacts([]);
    } finally {
      setLoadingArtifacts(false);
    }
  };

  const handleRunSelect = (run: WorkflowRun) => {
    setSelectedRun(run);
    setError(null);
    setTestResults([]);
    setArtifacts([]);
    setLoadedTestResults(new Set());
    // Update URL with the selected run ID
    setSearchParams({ run: run.id.toString() });
    fetchArtifacts(run);
  };

  const toggleTestExpansion = (testName: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedTests(newExpanded);
  };

  const toggleTestErrorExpansion = (testName: string) => {
    const newExpanded = new Set(expandedTestErrors);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedTestErrors(newExpanded);
  };

  const getStatusIcon = (status: string, conclusion?: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />;
      if (conclusion === 'failure') return <XCircle className="h-5 w-5 mt-0.5 text-red-500" />;
      if (conclusion === 'cancelled') return <Ban className="h-5 w-5 mt-0.5 text-gray-500 dark:text-gray-450" />;
    }
    return <Clock className="h-5 w-5 mt-0.5 text-blue-500" />;
  };

  const downloadArtifact = async (artifact: Artifact) => {
    const token = localStorage.getItem('github_token');
    if (!token) {
      setError('No authentication token found. Please sign in again.');
      return;
    }

    try {
      // Get the download URL for the artifact
      const response = await fetch(`https://api.github.com/repos/${org}/${repo}/actions/artifacts/${artifact.id}/zip`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Your token may have expired. Please sign in again.');
          localStorage.removeItem('github_token');
          navigate('/');
          return;
        }
        if (response.status === 404) {
          setError('Artifact not found or has expired.');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. You may not have permission to download this artifact.');
          return;
        }
        throw new Error(`Failed to download artifact: ${response.status}`);
      }

      // Create a blob from the response and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download artifact:', error);
      setError('Failed to download artifact. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const stats = {
    total: testResults.length,
    passed: testResults.filter((t) => t.status === 'passed').length,
    failed: testResults.filter((t) => t.status === 'failed').length,
    skipped: testResults.filter((t) => t.status === 'skipped').length,
  };

  const filteredWorkflowRuns =
    filterMyRuns && currentUser ? workflowRuns.filter((run) => run.actor.login === currentUser) : workflowRuns;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Github className="h-6 w-6" />
              <h1 className="text-xl font-semibold">
                {org}/{repo}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedRun && (
              <>
                {artifacts.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loadingArtifacts}>
                        <Download className="h-4 w-4" />
                        {loadingArtifacts ? 'Loading...' : 'Artifacts'}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {loadingArtifacts ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-xs text-muted-foreground">Loading artifacts...</p>
                        </div>
                      ) : artifacts.length > 0 ? (
                        artifacts.map((artifact) => (
                          <DropdownMenuItem
                            key={artifact.id}
                            onClick={() => downloadArtifact(artifact)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{artifact.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(artifact.size_in_bytes)}
                                </p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted-foreground">No artifacts available</p>
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const url = `https://github.com/${org}/${repo}/actions/runs/${selectedRun.id}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  View on GitHub
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Workflow Runs Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-semibold">Workflow Runs</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={filterMyRuns ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterMyRuns(!filterMyRuns)}
                    title={filterMyRuns ? 'Show all runs' : 'Show only my runs'}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchWorkflowRuns}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea
                className="lg:h-[calc(100vh-160px)] h-[60vh]"
                style={{ marginRight: '-1rem', paddingRight: '1rem' }}
              >
                <div className="space-y-2 p-1">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-16 bg-secondary rounded animate-pulse"></div>
                    ))
                  ) : filteredWorkflowRuns.length > 0 ? (
                    filteredWorkflowRuns.map((run) => (
                      <Card
                        key={run.id}
                        className={`cursor-pointer transition-colors fast-click ${
                          selectedRun?.id === run.id ? 'ring-2 ring-primary' : 'hover:bg-primary-foreground/50'
                        }`}
                        onClick={() => handleRunSelect(run)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {getStatusIcon(run.status, run.conclusion)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{run.workflow_name}</p>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(new Date(run.created_at))} ago
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 mb-3">by {run.actor.login}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  #{run.run_number}
                                </Badge>
                                <Badge variant="outline" className="text-xs max-w-[180px]" title={run.head_branch}>
                                  <span className="truncate block">{run.head_branch}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FlaskConicalOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {filterMyRuns ? 'No workflow runs found for your account' : 'No workflow runs found'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Error</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => navigate('/')}>Back to Home</Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedRun ? (
              <div className="space-y-6">
                {/* Test Results */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Test Results</h3>
                      {testResults.length > 0 && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span
                              className={
                                stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
                              }
                            >
                              {stats.failed} failed
                            </span>
                            <span
                              className={
                                stats.passed > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-400 dark:text-gray-500'
                              }
                            >
                              {stats.passed} passed
                            </span>
                            <span
                              className={
                                stats.skipped > 0
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-gray-400 dark:text-gray-500'
                              }
                            >
                              {stats.skipped} skipped
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-0">
                      {loadingTests ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading test results...</p>
                        </div>
                      ) : error ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                      ) : testResults.length > 0 ? (
                        testResults.map((test) => (
                          <Collapsible key={test.id} open={expandedTests.has(test.id)} className="test-result-row">
                            <CollapsibleTrigger
                              className="w-full flex items-center justify-between p-1 border hover:bg-primary-foreground/50 transition-colors"
                              onClick={() => toggleTestExpansion(test.id)}
                            >
                              {expandedTests.has(test.id) ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-3 flex-1 min-w-0 ml-1">
                                {test.status === 'passed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : test.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                ) : test.status === 'skipped' ? (
                                  <CircleDashed className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                ) : (
                                  <CircleHelp className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className="text-sm font-medium truncate">{test.name}</span>
                                  <span className="text-xs text-muted-foreground ml-1.5">{test.duration}s</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate text-right flex-1 mr-1">
                                  {test.suite}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-3 pb-3">
                              {test.errorMessage && (
                                <Alert
                                  variant="destructive"
                                  className="mt-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <AlertTitle>{test.errorMessage}</AlertTitle>
                                      <AlertDescription>{test.errorType}</AlertDescription>
                                    </div>

                                    {test.errorContent && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hover:bg-red-100 dark:hover:bg-red-900"
                                        onClick={() => toggleTestErrorExpansion(test.name)}
                                      >
                                        {expandedTestErrors.has(test.name) ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                  </div>

                                  {test.errorContent && (
                                    <Collapsible
                                      open={expandedTestErrors.has(test.name)}
                                      onOpenChange={() => toggleTestErrorExpansion(test.name)}
                                    >
                                      <CollapsibleContent>
                                        <hr className="my-2 border-red-300 dark:border-red-800" />
                                        <pre className="text-xs bg-red-50 dark:bg-red-950 rounded overflow-x-auto text-red-700 dark:text-red-300">
                                          {test.errorContent}
                                        </pre>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </Alert>
                              )}
                              {test.skippedMessage && (
                                <Alert className="mt-4 bg-yellow-50 dark:bg-[#2c241e] text-yellow-700 dark:text-yellow-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <AlertTitle>Skip reason</AlertTitle>
                                      <AlertDescription>
                                        <pre className="text-xs overflow-x-auto mt-2">{test.skippedMessage}</pre>
                                      </AlertDescription>
                                    </div>
                                  </div>
                                </Alert>
                              )}
                              <div className="mt-3 space-y-3 mb-3">
                                {test.stdout && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Stdout</h4>
                                    <pre className="text-xs bg-muted/60 p-2 rounded-lg overflow-x-auto">
                                      {test.stdout}
                                    </pre>
                                  </div>
                                )}
                                {test.stderr && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Stderr</h4>
                                    <pre className="text-xs bg-muted/60 p-3 rounded-lg overflow-x-auto">
                                      {test.stderr}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <FlaskConicalOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No test results available for this workflow run
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
                <h3 className="text-lg font-semibold mb-2">Loading workflow runs...</h3>
              </div>
            ) : (
              <div className="text-center py-12">
                <FlaskConicalOff className="h-24 w-24 text-muted-foreground mx-auto mb-2 opacity-20" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
