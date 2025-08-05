import Convert from 'ansi-to-html';
import { CheckCircle, ChevronDown, ChevronRight, CircleDashed, CircleHelp, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
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
  const { theme } = useTheme();
  
  const [convert, codeColors] = useMemo(() => {
    const isDark = theme === 'dark';
    
    // Monokai theme colors
    const monokaiColors = isDark ? {
      // Dark Monokai theme
      fg: '#f8f8f2',      // Light gray
      bg: '#272822',      // Dark background
      colors: [
        '#272822',        // 0: black
        '#f92672',        // 1: red
        '#a6e22e',        // 2: green
        '#f4bf75',        // 3: yellow
        '#66d9ef',        // 4: blue
        '#ae81ff',        // 5: magenta
        '#a1efe4',        // 6: cyan
        '#f8f8f2',        // 7: white
        '#75715e',        // 8: bright black
        '#f92672',        // 9: bright red
        '#a6e22e',        // 10: bright green
        '#f4bf75',        // 11: bright yellow
        '#66d9ef',        // 12: bright blue
        '#ae81ff',        // 13: bright magenta
        '#a1efe4',        // 14: bright cyan
        '#f9f8f5'         // 15: bright white
      ]
    } : {
      // Light Monokai theme (adapted for light mode)
      fg: '#272822',      // Dark gray
      bg: '#f9f8f5',      // Light background
      colors: [
        '#f9f8f5',        // 0: white
        '#f92672',        // 1: red
        '#a6e22e',        // 2: green
        '#f4bf75',        // 3: yellow
        '#66d9ef',        // 4: blue
        '#ae81ff',        // 5: magenta
        '#a1efe4',        // 6: cyan
        '#272822',        // 7: black
        '#75715e',        // 8: gray
        '#f92672',        // 9: bright red
        '#a6e22e',        // 10: bright green
        '#f4bf75',        // 11: bright yellow
        '#66d9ef',        // 12: bright blue
        '#ae81ff',        // 13: bright magenta
        '#a1efe4',        // 14: bright cyan
        '#272822'         // 15: bright black
      ]
    };
    
    const convert = new Convert({
      fg: monokaiColors.fg,
      bg: monokaiColors.bg,
      newline: true,
      escapeXML: false,
      colors: monokaiColors.colors
    });
    return [convert, monokaiColors];
  }, [theme]);
  

  const content = [
    test.errorMessage && (
      <Alert
        key="error"
        variant="destructive"
        className="mt-4 bg-[#fff9f9] dark:bg-[#281212] text-red-700 dark:text-red-300"
      >
        <div>
          <AlertTitle>{test.errorMessage}</AlertTitle>
          <AlertDescription>{test.errorType}</AlertDescription>
        </div>

        {test.errorContent && (
          <>
            <hr className="my-2 border-red-300 dark:border-red-800" />
            <pre
              className="text-xs rounded overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: convert.toHtml(test.errorContent.replace(/\ufffd/g, '\x1b')) }}
              style={{
                color: codeColors.fg,
              }}
            />
          </>
        )}
      </Alert>
    ),
    test.skippedMessage && (
      <Alert key="skipped" className="mt-4 bg-yellow-50 dark:bg-[#2c241e] text-yellow-700 dark:text-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <AlertTitle>Skip reason</AlertTitle>
            <AlertDescription>
              <pre className="text-xs overflow-x-auto mt-2">{test.skippedMessage}</pre>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    ),
    !!(test.stdout || test.stderr) && (
      <div key="output" className="mt-3 space-y-3 mb-3">
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
    ),
  ].filter(Boolean);

  const hasContent = !!content.length;

  return (
    <Collapsible open={isExpanded} className="test-result-row">
      <CollapsibleTrigger
        className="w-full flex items-center justify-between p-1 border hover:bg-primary-foreground/50 transition-colors"
        onClick={hasContent ? onToggleExpansion : () => {}}
      >
        {hasContent ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )
        ) : (
          // No content, no Chevron
          <span className="h-4 w-4 flex-shrink-0" />
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
      <CollapsibleContent className="px-3 pb-3">{content}</CollapsibleContent>
    </Collapsible>
  );
}
