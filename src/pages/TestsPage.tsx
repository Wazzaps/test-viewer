import { AlertCircle, FlaskConicalOff } from 'lucide-react';
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

export default function TestsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const org = params.org as string;
  const repo = params.repo as string;
  const [selectedCoverageTree, setSelectedCoverageTree] = useState<CoverageTree | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
