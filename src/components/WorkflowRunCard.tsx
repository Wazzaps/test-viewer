import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime, getStatusIcon, type WorkflowRun } from './types';

interface WorkflowRunCardProps {
  run: WorkflowRun;
  isSelected: boolean;
  onSelect: () => void;
}

export function WorkflowRunCard({ run, isSelected, onSelect }: WorkflowRunCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors fast-click ${
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-primary-foreground/50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {getStatusIcon(run.status, run.conclusion)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{run.workflow_name}</p>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(new Date(run.created_at))} ago</span>
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
  );
}
