import { CheckCircle, ChevronDown, ChevronRight, CircleDashed, CircleHelp, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TestResult } from './types';

interface TestResultItemProps {
  test: TestResult;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    case 'skipped':
      return <CircleDashed className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    default:
      return <CircleHelp className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
  }
}

export function TestResultItem({ test, isExpanded, onToggleExpansion }: TestResultItemProps) {
  return (
    <Collapsible open={isExpanded} className="test-result-row">
      <CollapsibleTrigger
        className="w-full flex items-center justify-between p-1 border hover:bg-primary-foreground/50 transition-colors"
        onClick={onToggleExpansion}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0 ml-1">
          {getStatusIcon(test.status)}
          <div className="min-w-0">
            <span className="text-sm font-medium truncate">{test.name}</span>
            <span className="text-xs text-muted-foreground ml-1.5">{test.duration}s</span>
          </div>
          <div className="text-xs text-muted-foreground truncate text-right flex-1 mr-1">{test.suite}</div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {test.errorMessage && (
          <Alert variant="destructive" className="mt-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
            <div>
              <AlertTitle>{test.errorMessage}</AlertTitle>
              <AlertDescription>{test.errorType}</AlertDescription>
            </div>

            {test.errorContent && (
              <>
                <hr className="my-2 border-red-300 dark:border-red-800" />
                <pre className="text-xs bg-red-50 dark:bg-red-950 rounded overflow-x-auto text-red-700 dark:text-red-300">
                  {test.errorContent}
                </pre>
              </>
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
              <pre className="text-xs bg-muted/60 p-2 rounded-lg overflow-x-auto">{test.stdout}</pre>
            </div>
          )}
          {test.stderr && (
            <div>
              <h4 className="text-sm font-medium mb-2">Stderr</h4>
              <pre className="text-xs bg-muted/60 p-3 rounded-lg overflow-x-auto">{test.stderr}</pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
