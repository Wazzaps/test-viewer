import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Artifact, WorkflowRun } from '@/components/types';
import {
  downloadArtifact as downloadArtifactAction,
  fetchArtifacts,
  fetchWorkflowRunById,
  fetchWorkflowRuns,
  useTestsStore,
} from '@/stores/testsStore';

export function useTestsPage(org: string, repo: string) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get state and actions from Zustand store
  const {
    // State
    workflowRuns,
    selectedRun,
    testResults,
    artifacts,
    loading,
    expandedTests,
    error,
    loadingTests,
    loadingArtifacts,
    filterMyRuns,
    loadingSpecificRun,

    // Actions
    setSelectedRun,
    setError,
    setLoadingSpecificRun,
    setFilterMyRuns,
    setWorkflowRuns,
    toggleTestExpansion,
    toggleTestErrorExpansion,
  } = useTestsStore();

  const currentUser = localStorage.getItem('github_user_login');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('github_token');
    if (!token) {
      setError('No authentication token found. Please sign in to view test results.');
      return;
    }

    fetchWorkflowRuns(org, repo);
  }, [org, repo, setError]);

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

        // If run not found in the list, fetch it individually
        if (!loadingSpecificRun) {
          setLoadingSpecificRun(true);
          fetchWorkflowRunById(org, repo, runIdFromUrl).then((fetchedRun) => {
            if (fetchedRun) {
              // Add the fetched run to the top of the list
              setWorkflowRuns([fetchedRun, ...workflowRuns]);
              setSelectedRun(fetchedRun);
            }
            setLoadingSpecificRun(false);
          });
          return;
        }
      }

      // If no run in URL or run not found, select the first run and update URL
      if (!selectedRun && !loadingSpecificRun) {
        const firstRun = workflowRuns[0];
        setSelectedRun(firstRun);
        setSearchParams({ run: firstRun.id.toString() });
        fetchArtifacts(org, repo, firstRun);
      }
    }
  }, [
    workflowRuns,
    searchParams,
    setSearchParams,
    loadingSpecificRun,
    selectedRun,
    org,
    repo,
    setSelectedRun,
    setLoadingSpecificRun,
    setWorkflowRuns,
  ]);

  useEffect(() => {
    if (selectedRun) {
      fetchArtifacts(org, repo, selectedRun);
    }
  }, [selectedRun, org, repo]);

  const handleRunSelect = useCallback(
    (run: WorkflowRun) => {
      setSelectedRun(run);
      setError(null);
      // Update URL with the selected run ID
      setSearchParams({ run: run.id.toString() });
      fetchArtifacts(org, repo, run);
    },
    [org, repo, setSelectedRun, setError, setSearchParams],
  );

  const downloadArtifact = useCallback(
    async (artifact: Artifact) => {
      await downloadArtifactAction(org, repo, artifact);
    },
    [org, repo],
  );

  const fetchWorkflowRunsAction = useCallback(() => {
    fetchWorkflowRuns(org, repo);
  }, [org, repo]);

  return {
    // State
    workflowRuns,
    selectedRun,
    testResults,
    artifacts,
    loading,
    expandedTests,
    error,
    loadingTests,
    loadingArtifacts,
    filterMyRuns,
    currentUser,
    loadingSpecificRun,

    // Actions
    handleRunSelect,
    toggleTestExpansion,
    toggleTestErrorExpansion,
    downloadArtifact,
    setFilterMyRuns,
    fetchWorkflowRuns: fetchWorkflowRunsAction,
  };
}
