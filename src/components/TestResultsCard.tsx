import { useState } from 'react';
import { FlaskConicalOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TestResultItem } from './TestResultItem';
import type { TestResult } from './types';

interface TestResultsCardProps {
  testResults: TestResult[];
  loading: boolean;
  error: string | null;
  expandedTests: Set<string>;
  onToggleTestExpansion: (testName: string) => void;
}

const FILTERED_OUT = ' opacity-60 line-through';

export function TestResultsCard({
  testResults,
  loading,
  error,
  expandedTests,
  onToggleTestExpansion,
}: TestResultsCardProps) {
  const stats = {
    passed: testResults.filter((t) => t.status === 'passed').length,
    failed: testResults.filter((t) => t.status === 'failed').length,
    skipped: testResults.filter((t) => t.status === 'skipped').length,
  };
  const [statusesToShow, setStatusesToShow] = useState<Record<TestResult['status'], boolean>>({
    passed: true,
    failed: true,
    skipped: true,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Test Results</h3>
          {testResults.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={
                    stats.failed > 0
                      ? 'text-red-600 dark:text-red-400' + (!statusesToShow.failed ? FILTERED_OUT : '')
                      : 'text-gray-400 dark:text-gray-500'
                  }
                  onClick={() =>
                    setStatusesToShow((prevStatusesToShow) => ({
                      ...prevStatusesToShow,
                      failed: !prevStatusesToShow.failed,
                    }))
                  }
                >
                  {stats.failed} failed
                </span>
                <span
                  className={
                    stats.passed > 0
                      ? 'text-green-600 dark:text-green-400' + (!statusesToShow.passed ? FILTERED_OUT : '')
                      : 'text-gray-400 dark:text-gray-500'
                  }
                  onClick={() =>
                    setStatusesToShow((prevStatusesToShow) => ({
                      ...prevStatusesToShow,
                      passed: !prevStatusesToShow.passed,
                    }))
                  }
                >
                  {stats.passed} passed
                </span>
                <span
                  className={
                    stats.skipped > 0
                      ? 'text-yellow-600 dark:text-yellow-400' + (!statusesToShow.skipped ? FILTERED_OUT : '')
                      : 'text-gray-400 dark:text-gray-500'
                  }
                  onClick={() =>
                    setStatusesToShow((prevStatusesToShow) => ({
                      ...prevStatusesToShow,
                      skipped: !prevStatusesToShow.skipped,
                    }))
                  }
                >
                  {stats.skipped} skipped
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading test results...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <FlaskConicalOff className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : testResults.length > 0 ? (
            testResults
              .filter((test) => statusesToShow[test.status])
              .map((test) => (
                <TestResultItem
                  key={test.id}
                  test={test}
                  isExpanded={expandedTests.has(test.id)}
                  onToggleExpansion={() => onToggleTestExpansion(test.id)}
                />
              ))
          ) : (
            <div className="text-center py-8">
              <FlaskConicalOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No test results available for this workflow run</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
