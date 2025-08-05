import { Filter, FlaskConicalOff, RefreshCw, Expand, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { WorkflowRun } from './types';
import { WorkflowRunCard } from './WorkflowRunCard';

interface WorkflowRunsSidebarProps {
  workflowRuns: WorkflowRun[];
  selectedRun: WorkflowRun | null;
  loading: boolean;
  filterMyRuns: boolean;
  currentUser: string | null;
  onRunSelect: (run: WorkflowRun) => void;
  onFilterToggle: () => void;
  onRefresh: () => void;
  onWideModeToggle: () => void;
  isWideMode: boolean;
}

export function WorkflowRunsSidebar({
  workflowRuns,
  selectedRun,
  loading,
  filterMyRuns,
  currentUser,
  onRunSelect,
  onFilterToggle,
  onRefresh,
  onWideModeToggle,
  isWideMode,
}: WorkflowRunsSidebarProps) {
  const filteredWorkflowRuns =
    filterMyRuns && currentUser ? workflowRuns.filter((run) => run.actor.login === currentUser) : workflowRuns;

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Workflow Runs</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={filterMyRuns ? 'default' : 'outline'}
              size="sm"
              onClick={onFilterToggle}
              title={filterMyRuns ? 'Show all runs' : 'Show only my runs'}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onWideModeToggle}>
              {isWideMode ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
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
              filteredWorkflowRuns.map((run, index) => (
                <div key={run.id}>
                  <WorkflowRunCard
                    run={run}
                    isSelected={selectedRun?.id === run.id}
                    onSelect={() => onRunSelect(run)}
                  />
                  {index === 0 && run.isNotRecent && (
                    <div className="my-3">
                      <Separator />
                      <div className="text-xs text-muted-foreground text-center mt-2 mb-1">Recent Runs</div>
                    </div>
                  )}
                </div>
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
  );
}
