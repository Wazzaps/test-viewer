import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ArtifactsDropdown } from './ArtifactsDropdown';
import type { Artifact, WorkflowRun } from './types';

interface TestsPageHeaderProps {
  org: string;
  repo: string;
  selectedRun: WorkflowRun | null;
  artifacts: Artifact[];
  loadingArtifacts: boolean;
  onNavigateBack: () => void;
  onDownloadArtifact: (artifact: Artifact) => void;
}

export function TestsPageHeader({
  org,
  repo,
  selectedRun,
  artifacts,
  loadingArtifacts,
  onNavigateBack,
  onDownloadArtifact,
}: TestsPageHeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onNavigateBack}>
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
                <ArtifactsDropdown artifacts={artifacts} loading={loadingArtifacts} onDownload={onDownloadArtifact} />
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
  );
}
