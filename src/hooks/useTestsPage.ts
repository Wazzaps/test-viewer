import * as zip from '@zip.js/zip.js';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Artifact, GitHubArtifact, GitHubWorkflowRun, TestResult, WorkflowRun } from '@/components/types';

export function useTestsPage(org: string, repo: string) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
        console.log(response);
        throw new Error(`Failed to download artifact: ${response.status}`);
      }

      const a = document.createElement('a');
      a.href = response.url;
      a.download = `${artifact.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download artifact:', error);
      setError('Failed to download artifact. Please try again.');
    }
  };

  return {
    // State
    workflowRuns,
    selectedRun,
    testResults,
    artifacts,
    loading,
    expandedTests,
    expandedTestErrors,
    error,
    loadingTests,
    loadingArtifacts,
    filterMyRuns,
    currentUser,

    // Actions
    handleRunSelect,
    toggleTestExpansion,
    toggleTestErrorExpansion,
    downloadArtifact,
    setFilterMyRuns,
    fetchWorkflowRuns,
  };
}
