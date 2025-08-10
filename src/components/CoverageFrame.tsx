import { useEffect, useRef, useState } from 'react';
import type { CoverageTree } from './types';

interface CoverageFrameProps {
  coverageTree: CoverageTree;
  onClose: () => void;
}

// Helper function to resolve relative paths, handling '..' segments
function resolveRelativePath(basePath: string, relativePath: string): string {
  // Split paths into segments
  const baseSegments = basePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '');
  const relativeSegments = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '');

  // Remove the filename from base path to get directory
  const baseDirSegments = baseSegments.slice(0, -1);

  // Process relative segments
  const resultSegments = [...baseDirSegments];

  for (const segment of relativeSegments) {
    if (segment === '..') {
      // Go up one directory level
      if (resultSegments.length > 0) {
        resultSegments.pop();
      }
    } else if (segment !== '.' && segment !== '') {
      // Add the segment to the path
      resultSegments.push(segment);
    }
  }

  return resultSegments.join('/');
}

export function CoverageFrame({ coverageTree, onClose }: CoverageFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>(coverageTree.indexPath);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigationHistoryRef = useRef<string[]>([coverageTree.indexPath]);
  const currentIndexRef = useRef<number>(0);

  useEffect(() => {
    setCurrentFile(coverageTree.indexPath);
  }, [coverageTree]);

  useEffect(() => {
    const htmlContent = coverageTree.files[currentFile];
    if (htmlContent) {
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Find all link elements with rel='stylesheet'
      const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');

      // Process each CSS link
      styleLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          // Resolve the CSS file path relative to the current file
          const cssFilePath = resolveRelativePath(currentFile, href);

          // Get the CSS content from coverageTree.files
          const cssContent = coverageTree.files[cssFilePath];
          if (cssContent) {
            // Create a style element with the CSS content
            const styleElement = doc.createElement('style');
            styleElement.textContent = cssContent;

            // Replace the link element with the style element
            link.parentNode?.replaceChild(styleElement, link);
          }
        }
      });

      // Find all script elements with src attribute
      const scriptTags = doc.querySelectorAll('script[src]');

      // Process each script tag
      scriptTags.forEach((script) => {
        const src = script.getAttribute('src');
        if (src) {
          // Resolve the JS file path relative to the current file
          const jsFilePath = resolveRelativePath(currentFile, src);

          // Get the JS content from coverageTree.files
          const jsContent = coverageTree.files[jsFilePath];
          if (jsContent) {
            // Create a new script element with the JS content
            const newScriptElement = doc.createElement('script');
            newScriptElement.textContent = jsContent;

            // Copy any other attributes from the original script
            Array.from(script.attributes).forEach((attr) => {
              if (attr.name !== 'src') {
                newScriptElement.setAttribute(attr.name, attr.value);
              }
            });

            // Replace the original script element with the new one
            script.parentNode?.replaceChild(newScriptElement, script);
          }
        }
      });

      // Add navigation detection script
      const navigationScript = doc.createElement('script');
      navigationScript.textContent = `
        // Override navigation methods to communicate with parent
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(state, title, url) {
          if (url && url !== window.location.pathname) {
            window.parent.postMessage({ type: 'navigation', url: url }, '*');
          }
          return originalPushState.apply(this, arguments);
        };
        
        history.replaceState = function(state, title, url) {
          if (url && url !== window.location.pathname) {
            window.parent.postMessage({ type: 'navigation', url: url }, '*');
          }
          return originalReplaceState.apply(this, arguments);
        };
        
        // Listen for clicks on links
        document.addEventListener('click', function(e) {
          // The click might be on a link, or a descendent of link
          let elem = e.target;
          let link = null;
          while (elem !== document.documentElement) {
              if (elem.tagName === 'A' && elem.href) {
                  link = elem;
                  break;
              }
              if (elem.parentNode) {
                  elem = elem.parentNode;
              } else {
                  break;
              }
          }
          if (!link) return;

          const url = elem.getAttribute('href');
          if (url && !url.startsWith('http') && !url.startsWith('mailto:') && !url.startsWith('#')) {
            e.preventDefault();
            window.parent.postMessage({ type: 'navigation', url: url }, '*');
          }
        });
      `;
      doc.head.appendChild(navigationScript);

      // Convert the modified document back to HTML string
      //   const modifiedHtml = new XMLSerializer().serializeToString(doc);
      const modifiedHtml = doc.documentElement.outerHTML;

      // Create the main HTML blob
      const blob = new Blob([modifiedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      // Cleanup function to revoke the blob URL
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [coverageTree, currentFile]);

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigation') {
        const newUrl = event.data.url;
        // Resolve the new URL relative to the current file
        const resolvedPath = resolveRelativePath(currentFile, newUrl);

        // Check if the file exists in coverageTree.files
        if (coverageTree.files[resolvedPath]) {
          // Push a new history state to the outer window
          const state = {
            type: 'coverage-navigation',
            file: resolvedPath,
            coverageTreeName: coverageTree.name,
          };

          // Add to navigation history
          navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndexRef.current + 1);
          navigationHistoryRef.current.push(resolvedPath);
          currentIndexRef.current = navigationHistoryRef.current.length - 1;

          // Push state to outer history
          window.history.pushState(state, '', window.location.pathname);

          setCurrentFile(resolvedPath);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentFile, coverageTree.files, coverageTree.name]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.type === 'coverage-navigation') {
        // Navigate to the file from the history state
        setCurrentFile(event.state.file);

        // Update current index in navigation history
        const fileIndex = navigationHistoryRef.current.indexOf(event.state.file);
        if (fileIndex !== -1) {
          currentIndexRef.current = fileIndex;
        }
      } else if (event.state && event.state.type === 'coverage-exit') {
        onClose();
      } else {
        // If no state or different type, go back to the initial file
        setCurrentFile(coverageTree.indexPath);
        currentIndexRef.current = 0;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [coverageTree.indexPath, onClose]);

  // Initialize history state for the initial file
  useEffect(() => {
    // Replace the current state with the initial state
    window.history.replaceState(
      {
        type: 'coverage-exit',
        file: '',
        coverageTreeName: coverageTree.name,
      },
      '',
      window.location.pathname,
    );
    window.history.pushState(
      {
        type: 'coverage-navigation',
        file: coverageTree.indexPath,
        coverageTreeName: coverageTree.name,
      },
      '',
      window.location.pathname,
    );
  }, [coverageTree.indexPath, coverageTree.name]);

  if (!blobUrl) {
    return <div>Loading...</div>;
  }
  return (
    <iframe
      ref={iframeRef}
      key={blobUrl}
      src={blobUrl}
      sandbox="allow-scripts"
      className="w-full h-full rounded-lg shadow-lg"
      title={`Coverage report for ${coverageTree.name}`}
    />
  );
}
