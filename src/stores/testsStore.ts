import * as zip from '@zip.js/zip.js';
import { create } from 'zustand';
import type {
  Artifact,
  CoverageTree,
  GitHubArtifact,
  GitHubWorkflowRun,
  TestResult,
  WorkflowRun,
} from '@/components/types';

interface TestsState {
  // State
  workflowRuns: WorkflowRun[];
  selectedRun: WorkflowRun | null;
  testResults: TestResult[];
  coverageTrees: Record<string, CoverageTree>;
  artifacts: Artifact[];
  loading: boolean;
  expandedTests: Set<string>;
  error: string | null;
  loadingTests: boolean;
  loadingArtifacts: boolean;
  filterMyRuns: boolean;
  loadingSpecificRun: boolean;
  loadedTestResults: Set<string>;

  // Actions
  setWorkflowRuns: (runs: WorkflowRun[]) => void;
  setSelectedRun: (run: WorkflowRun | null) => void;
  setTestResults: (results: TestResult[]) => void;
  addCoverageTree: (name: string, coverageTree: CoverageTree) => void;
  setArtifacts: (artifacts: Artifact[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoadingTests: (loading: boolean) => void;
  setLoadingArtifacts: (loading: boolean) => void;
  setFilterMyRuns: (filter: boolean) => void;
  setLoadingSpecificRun: (loading: boolean) => void;
  setLoadedTestResults: (results: Set<string>) => void;

  // Test expansion actions
  toggleTestExpansion: (testName: string) => void;

  // Reset actions
  resetTestResults: () => void;
  resetArtifacts: () => void;
  resetLoadedTestResults: () => void;
  resetCoverageTrees: () => void;

  // Utility actions
  addTestResults: (results: TestResult[]) => void;
  addLoadedTestResult: (resultId: string) => void;
}

export const useTestsStore = create<TestsState>((set) => ({
  // Initial state
  workflowRuns: [],
  selectedRun: null,
  testResults: [],
  artifacts: [],
  loading: false,
  expandedTests: new Set(),
  error: null,
  loadingTests: false,
  loadingArtifacts: false,
  filterMyRuns: false,
  loadingSpecificRun: false,
  loadedTestResults: new Set(),
  coverageTrees: {},

  // Setters
  setWorkflowRuns: (runs) => set({ workflowRuns: runs }),
  setSelectedRun: (run) => set({ selectedRun: run }),
  setTestResults: (results) => set({ testResults: results }),
  setArtifacts: (artifacts) => set({ artifacts }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLoadingTests: (loading) => set({ loadingTests: loading }),
  setLoadingArtifacts: (loading) => set({ loadingArtifacts: loading }),
  setFilterMyRuns: (filter) => set({ filterMyRuns: filter }),
  setLoadingSpecificRun: (loading) => set({ loadingSpecificRun: loading }),
  setLoadedTestResults: (results) => set({ loadedTestResults: results }),
  addCoverageTree: (name, coverageTree) =>
    set((state) => ({ coverageTrees: { ...state.coverageTrees, [name]: coverageTree } })),

  // Test expansion actions
  toggleTestExpansion: (testName) => {
    set((state) => {
      const newExpanded = new Set(state.expandedTests);
      if (newExpanded.has(testName)) {
        newExpanded.delete(testName);
      } else {
        newExpanded.add(testName);
      }
      return { expandedTests: newExpanded };
    });
  },

  // Reset actions
  resetTestResults: () => set({ testResults: [] }),
  resetArtifacts: () => set({ artifacts: [] }),
  resetLoadedTestResults: () => set({ loadedTestResults: new Set() }),
  resetCoverageTrees: () => set({ coverageTrees: {} }),

  // Utility actions
  addTestResults: (results) => {
    set((state) => {
      const combinedResults = [...state.testResults, ...results].sort((a, b) => {
        // First sort by status: failed, skipped, passed
        const statusOrder = { failed: 0, skipped: 1, passed: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;

        // Then sort by id (suite + name)
        return a.id.localeCompare(b.id);
      });
      return { testResults: combinedResults };
    });
  },

  addLoadedTestResult: (resultId) => {
    set((state) => {
      const newLoadedResults = new Set(state.loadedTestResults);
      newLoadedResults.add(resultId);
      return { loadedTestResults: newLoadedResults };
    });
  },
}));

// Helper functions for API calls
export const fetchWorkflowRuns = async (org: string, repo: string) => {
  const store = useTestsStore.getState();
  store.setLoading(true);
  store.setError(null);

  const token = localStorage.getItem('github_token');
  if (!token) {
    store.setError('No authentication token found. Please sign in again.');
    store.setLoading(false);
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
        store.setError('Authentication failed. Your token may have expired. Please sign in again.');
        localStorage.removeItem('github_token');
        return;
      }
      if (response.status === 404) {
        store.setError("Repository not found or you don't have access to it.");
        return;
      }
      if (response.status === 403) {
        store.setError("Access denied. You may not have permission to view this repository's actions.");
        return;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const runs: WorkflowRun[] = data.workflow_runs.map((run: GitHubWorkflowRun) => ({
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

    store.setWorkflowRuns(runs);
  } catch (error) {
    console.error('Failed to fetch workflow runs:', error);
    store.setError('Failed to fetch workflow runs. Please try again.');
  } finally {
    store.setLoading(false);
  }
};

export const fetchWorkflowRunById = async (org: string, repo: string, runId: string): Promise<WorkflowRun | null> => {
  const store = useTestsStore.getState();
  const token = localStorage.getItem('github_token');
  if (!token) {
    store.setError('No authentication token found. Please sign in again.');
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        store.setError('Authentication failed. Your token may have expired. Please sign in again.');
        localStorage.removeItem('github_token');
        return null;
      }
      if (response.status === 404) {
        store.setError('Workflow run not found.');
        return null;
      }
      if (response.status === 403) {
        store.setError('Access denied. You may not have permission to view this workflow run.');
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const run: GitHubWorkflowRun = await response.json();

    return {
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
      isNotRecent: true, // Flag to indicate this run was fetched individually
    };
  } catch (error) {
    console.error('Failed to fetch workflow run:', error);
    store.setError('Failed to fetch workflow run. Please try again.');
    return null;
  }
};

interface TestViewerConfig {
  junit?: string[];
  html_coverage?: string;
}

export const processTestResultsArtifact = async (artifact: Artifact, blob: Blob, runId: number) => {
  console.log('---- Processing test results artifact:', artifact.name);
  const store = useTestsStore.getState();
  const zipReader = new zip.ZipReader(new zip.BlobReader(blob));
  const entries = await zipReader.getEntries();

  let junitPatterns: string[] = ['**.xml']; // Default pattern
  let htmlCoverageIndex: string | null = null;
  let htmlCoverageDir: string | null = null;

  const llvmCovEntry = entries.find((entry) => entry.filename === 'llvm-cov/html/index.html');
  if (llvmCovEntry) {
    htmlCoverageIndex = 'llvm-cov/html/index.html';
    htmlCoverageDir = 'llvm-cov/html';
  }

  // Look for test-viewer.json configuration file
  const configEntry = entries.find((entry) => entry.filename === 'test-viewer.json');
  if (configEntry) {
    try {
      const configContent = await configEntry.getData!(new zip.TextWriter());
      const config: TestViewerConfig = JSON.parse(configContent);
      if (config.junit && Array.isArray(config.junit)) {
        junitPatterns = config.junit;
      }
      if (config.html_coverage) {
        htmlCoverageIndex = config.html_coverage;
        if (htmlCoverageIndex.includes('/')) {
          htmlCoverageDir = htmlCoverageIndex.split('/').slice(0, -1).join('/');
        } else {
          htmlCoverageDir = '';
        }
      }
    } catch (error) {
      console.warn('Failed to parse test-viewer.json, using default pattern:', error);
    }
  }

  // Convert glob patterns to regex patterns
  const regexPatterns = junitPatterns.map((pattern) => {
    // Convert glob pattern to regex
    // ** matches any number of directories
    // * matches any characters except path separators
    const regexStr = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '[^/]*') // * becomes [^/]* (matches anything except slashes)
      .replace(/\[\^\/\]\*\[\^\/\]\*/g, '.*'); // ** becomes .* (matches anything including slashes)

    return new RegExp(`^${regexStr}$`);
  });

  const coverageTree: CoverageTree = {
    name: artifact.name,
    files: {},
    indexPath: htmlCoverageIndex || '',
  };
  const htmlCoveragePrefix = htmlCoverageDir ? htmlCoverageDir + '/' : '';
  for (const entry of entries) {
    console.log('-- Processing entry in', artifact.name, ':', entry.filename);
    if (htmlCoverageDir !== null && entry.filename.startsWith(htmlCoveragePrefix)) {
      console.log('Coverage file found:', artifact.name, ':', entry.filename);
      coverageTree.files[entry.filename] = await entry.getData!(new zip.TextWriter());
    }

    // Check if the entry matches any of the junit patterns
    if (regexPatterns.some((regex) => regex.test(entry.filename))) {
      console.log('JUnit file found:', artifact.name, ':', entry.filename);
      const content = await entry.getData!(new zip.TextWriter());
      const xml = new DOMParser().parseFromString(content, 'application/xml');
      const testSuites = xml.getElementsByTagName('testsuite');
      const newTestResults: TestResult[] = [];

      for (const testSuite of testSuites) {
        const testSuiteName = testSuite.getAttribute('name');
        const testCases = testSuite.getElementsByTagName('testcase');

        Array.from(testCases).forEach((testCase, index) => {
          const testcaseName = testCase.getAttribute('name');
          const testcaseClassName = testCase.getAttribute('classname');
          const testcaseDuration = testCase.getAttribute('time');
          const testcaseSystemOut = testCase.getElementsByTagName('system-out')[0]?.textContent;
          const testcaseSystemErr = testCase.getElementsByTagName('system-err')[0]?.textContent;
          const testcaseFailure =
            testCase.getElementsByTagName('failure')[0] || testCase.getElementsByTagName('error')[0];
          const testcaseFailureMessage = testcaseFailure?.getAttribute('message');
          const testcaseFailureType = testcaseFailure?.getAttribute('type');
          const testcaseFailureContent = testcaseFailure?.textContent;
          const testcaseSkipped = testCase.getElementsByTagName('skipped')[0];
          const testcaseSkippedMessage = testcaseSkipped?.getAttribute('message');

          newTestResults.push({
            // JUnit doesn't require uniqueness, and we want to be able to toggle every test separately
            id: `${artifact.name}-${testSuiteName}-${testcaseClassName}-${testcaseName}-${index}`,
            name: [testcaseClassName !== testSuiteName ? testcaseClassName : '', testcaseName]
              .filter((name) => name && name.trim())
              .join(' > '),
            suite: [testSuiteName, artifact.name].filter((name) => name && name.trim()).join(' • '),
            status: testcaseFailure ? 'failed' : testcaseSkipped ? 'skipped' : 'passed',
            duration: testcaseDuration ? parseFloat(testcaseDuration) : 0,
            stdout: (testcaseSystemOut || '').trim(),
            stderr: (testcaseSystemErr || '').trim(),
            errorMessage: testcaseFailureMessage || undefined,
            errorType: testcaseFailureType || undefined,
            errorContent: testcaseFailureContent || undefined,
            skippedMessage: testcaseSkippedMessage || undefined,
          });
        });
      }

      const fullArtifactId = `${runId}-${artifact.id}-${entry.filename}`;
      const currentState = useTestsStore.getState();

      if (currentState.selectedRun?.id !== runId || currentState.loadedTestResults.has(fullArtifactId)) {
        return;
      }

      store.addLoadedTestResult(fullArtifactId);
      store.addTestResults(newTestResults);
      if (coverageTree.indexPath) {
        store.addCoverageTree(artifact.name, coverageTree);
      }
    }
    store.setLoadingTests(false);
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

export const fetchTestResultsArtifact = async (org: string, repo: string, artifact: Artifact, runId: number) => {
  // Skip artifacts larger than 2.5MB
  if (artifact.size_in_bytes > 2.5 * 1024 * 1024) return;
  // TODO Toast/show a banner about this artifact being ignored, and allow overriding (for this runId only, for this repo/org, for everything

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
  for (;;) {
    const totalSizeWithNewItem = Object.entries(localStorage).filter(([k]) => k !== cacheKey).flat().map(kOrV => kOrV.length).reduce((val, total) => total + val, 0) + cacheKey.length + base64.length;
    if (totalSizeWithNewItem < 5*1024*1024) {
      break;
    }

    const existingItemsBySize = Object.entries(localStorage).map(([k, v]) => [k, k.length + v.length]).sort((a, b) => b[1] - a[1]);
    const keyToRemove = existingItemsBySize[0][0];
    console.log("Removing key", keyToRemove, "to free", localStorage.getItem(keyToRemove)!.length + keyToRemove.length, "bytes");
    localStorage.removeItem(keyToRemove);
  }
  try {
      localStorage.setItem(cacheKey, base64);
  } catch {
      // Ignore
  }
  // TODO Handle quota of localStorage - remove old caches of artifacts, and retry to write
  // const currentUsedBytes = Object.entries(localStorage).flat().map(x => x.length).reduce((val, total) => total + val, 0);
  // localStorage.setItem() will fail if currentUsedBytes + key.length + value.length > 5*1024*1024.
  // in this case, we should clear old artifacts (lowest number?) until there's enough room for the item to set,
  // and maybe keep some extra empty space for small settings and state.
  // We might also use some compression function.
  // Maybe if value is long enough, try to compress, and if the compression made it smaller, save it compressed.
  // The value (or key?) then should have some prefix do indicate compressed/uncompressed.
  // new LocalStorageFiles({ maxFilesStorage: 4.5 * 1024 * 1024 }). readFile, writeFile, fileExists, removeFile
  // TODO Build LocalStorageFiles based on IndexedDB (mind that this must be async, as IndexedDB is async)

  await processTestResultsArtifact(artifact, blob, runId);
};

export const processArtifactsList = async (org: string, repo: string, run: WorkflowRun, artifacts: Artifact[]) => {
  const store = useTestsStore.getState();

  // Sort artifacts by name
  const sortedArtifacts = [...artifacts].sort((a, b) => a.name.localeCompare(b.name));
  store.setArtifacts(sortedArtifacts);

  if (run.conclusion) {
    localStorage.setItem(`run_artifacts_${run.id}`, JSON.stringify(sortedArtifacts));
  }

  // Automatically download and log test artifacts
  const testArtifacts = sortedArtifacts.filter(
    (artifact) => artifact.name.toLowerCase().includes('junit') || artifact.name.toLowerCase().includes('test'),
  );

  for (const artifact of testArtifacts) {
    try {
      console.log(`Downloading test artifact: ${artifact.name}`, artifact);
      await fetchTestResultsArtifact(org, repo, artifact, run.id);
    } catch (error) {
      console.error(`Error processing test artifact ${artifact.name}:`, error);
    }
  }

  if (testArtifacts.length === 0) {
    store.setLoadingTests(false);
  }
};

export const fetchArtifacts = async (org: string, repo: string, run: WorkflowRun) => {
  const store = useTestsStore.getState();
  const token = localStorage.getItem('github_token');
  if (!token) return;

  store.setLoadingArtifacts(true);
  store.setLoadingTests(true);
  store.setError(null);
  store.resetArtifacts();
  store.resetTestResults();
  store.resetLoadedTestResults();
  store.resetCoverageTrees();

  const cachedArtifacts = localStorage.getItem(`run_artifacts_${run.id}`);
  if (cachedArtifacts) {
    const artifacts: Artifact[] = JSON.parse(cachedArtifacts);
    await processArtifactsList(org, repo, run, artifacts);
    store.setLoadingArtifacts(false);
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
        store.setError('Authentication failed. Your token may have expired. Please sign in again.');
        localStorage.removeItem('github_token');
        return;
      }
      if (response.status === 404) {
        store.setError('Artifacts not found for this workflow run.');
        return;
      }
      if (response.status === 403) {
        store.setError('Access denied. You may not have permission to view artifacts.');
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

    await processArtifactsList(org, repo, run, artifacts);
  } catch (error) {
    console.error('Failed to fetch artifacts:', error);
    store.setError('Failed to fetch artifacts. Please try again.');
    store.resetArtifacts();
  } finally {
    store.setLoadingArtifacts(false);
  }
};

export const downloadArtifact = async (org: string, repo: string, artifact: Artifact) => {
  const store = useTestsStore.getState();
  const token = localStorage.getItem('github_token');
  if (!token) {
    store.setError('No authentication token found. Please sign in again.');
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
        store.setError('Authentication failed. Your token may have expired. Please sign in again.');
        localStorage.removeItem('github_token');
        return;
      }
      if (response.status === 404) {
        store.setError('Artifact not found or has expired.');
        return;
      }
      if (response.status === 403) {
        store.setError('Access denied. You may not have permission to download this artifact.');
        return;
      }
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
    store.setError('Failed to download artifact. Please try again.');
  }
};
