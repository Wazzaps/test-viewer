import { AlertCircle, FlaskConicalOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TestResultsCard } from '@/components/TestResultsCard';
import { TestsPageHeader } from '@/components/TestsPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WorkflowRunsSidebar } from '@/components/WorkflowRunsSidebar';
import { useTestsPage } from '@/hooks/useTestsPage';

export default function TestsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const org = params.org as string;
  const repo = params.repo as string;

  const {
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
    loadingSpecificRun,

    // Actions
    handleRunSelect,
    toggleTestExpansion,
    toggleTestErrorExpansion,
    downloadArtifact,
    setFilterMyRuns,
    fetchWorkflowRuns,
  } = useTestsPage(org, repo);

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

      <main className="container mx-auto px-4 py-8">
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
          />

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
                <TestResultsCard
                  testResults={testResults}
                  loading={loadingTests}
                  error={error}
                  expandedTests={expandedTests}
                  expandedTestErrors={expandedTestErrors}
                  onToggleTestExpansion={toggleTestExpansion}
                  onToggleTestErrorExpansion={toggleTestErrorExpansion}
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
    </div>
  );
}
