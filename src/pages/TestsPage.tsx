import { AlertCircle, FlaskConicalOff, Github, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoverageFrameModal } from '@/components/CoverageFrameModal';
import { TestResultsCard } from '@/components/TestResultsCard';
import { TestsPageHeader } from '@/components/TestsPageHeader';
import type { CoverageTree } from '@/components/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WorkflowRunsSidebar } from '@/components/WorkflowRunsSidebar';
import { useTestsPage } from '@/hooks/useTestsPage';
import { config } from '@/config';

export default function TestsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const org = params.org as string;
  const repo = params.repo as string;
  const [selectedCoverageTree, setSelectedCoverageTree] = useState<CoverageTree | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isWideMode, setIsWideMode] = useState(false);

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
    currentUser,
    loadingSpecificRun,
    coverageTrees,

    // Actions
    handleRunSelect,
    toggleTestExpansion,
    downloadArtifact,
    setFilterMyRuns,
    fetchWorkflowRuns,
  } = useTestsPage(org, repo);

  const handleOpenCoverage = (coverageTree: CoverageTree) => {
    setSelectedCoverageTree(coverageTree);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCoverageTree(null);
  };

  // Helper function to check if an error is an authentication error
  const isAuthenticationError = (errorMessage: string | null): boolean => {
    if (!errorMessage) return false;
    return (
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('token may have expired') ||
      errorMessage.includes('No authentication token')
    );
  };

  const signInWithGitHub = () => {
    setAuthLoading(true);

    const state =
      Math.random().toString(36).substring(7) +
      Math.random().toString(36).substring(7) +
      Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);

    // Store the current URL to redirect back after authentication
    localStorage.setItem('github_oauth_redirect', window.location.href);

    const authUrl = `${config.GITHUB_OAUTH_BASE}/authorize?client_id=${config.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=repo&state=${state}`;
    window.location.href = authUrl;
  };

  const coverageTreeNames = Object.keys(coverageTrees).sort((a, b) =>
    coverageTrees[a].name.localeCompare(coverageTrees[b].name),
  );

  return (
    <div className="min-h-screen bg-background">
      <TestsPageHeader
        org={org}
        repo={repo}
        selectedRun={selectedRun}
        artifacts={artifacts}
        loadingArtifacts={loadingArtifacts}
        onNavigateBack={() => navigate('/')}
        onDownloadArtifact={downloadArtifact}
      />

      <main className={'container px-4 py-8 ' + (isWideMode ? 'max-w-[calc(100%-4rem)]' : 'mx-auto')}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Workflow Runs Sidebar */}
          <WorkflowRunsSidebar
            workflowRuns={workflowRuns}
            selectedRun={selectedRun}
            loading={loading || loadingSpecificRun}
            filterMyRuns={filterMyRuns}
            currentUser={currentUser}
            onRunSelect={handleRunSelect}
            onFilterToggle={() => setFilterMyRuns(!filterMyRuns)}
            onRefresh={fetchWorkflowRuns}
            onWideModeToggle={() => setIsWideMode(!isWideMode)}
            isWideMode={isWideMode}
          />

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {isAuthenticationError(error) ? 'Authentication Required' : 'Error'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {isAuthenticationError(error) ? 'Your GitHub session has expired. Please sign in again.' : error}
                    </p>
                    {isAuthenticationError(error) ? (
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => navigate('/')}>
                          Back to Home
                        </Button>
                        <Button onClick={signInWithGitHub} disabled={authLoading}>
                          {authLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Authenticating...
                            </>
                          ) : (
                            <>
                              <Github className="h-4 w-4 mr-2" />
                              Sign in with GitHub
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => navigate('/')}>Back to Home</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : selectedRun ? (
              <div className="space-y-6">
                {/* Coverage Reports */}
                {coverageTreeNames.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Coverage Reports</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coverageTreeNames.map((name) => (
                          <Button
                            key={name}
                            variant="secondary"
                            className="h-auto p-2 flex items-center gap-2"
                            onClick={() => handleOpenCoverage(coverageTrees[name])}
                          >
                            <span className="text-sm font-medium">{coverageTrees[name].name}</span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Test Results */}
                <TestResultsCard
                  key={selectedRun.id}
                  testResults={testResults}
                  loading={loadingTests}
                  error={error}
                  expandedTests={expandedTests}
                  onToggleTestExpansion={toggleTestExpansion}
                />
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

      {/* Coverage Frame Modal */}
      <CoverageFrameModal coverageTree={selectedCoverageTree} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
