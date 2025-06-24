import { ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Artifact } from './types';

interface ArtifactsDropdownProps {
  artifacts: Artifact[];
  loading: boolean;
  onDownload: (artifact: Artifact) => void;
}

export function ArtifactsDropdown({ artifacts, loading, onDownload }: ArtifactsDropdownProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? 'Loading...' : 'Artifacts'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Loading artifacts...</p>
          </div>
        ) : artifacts.length > 0 ? (
          artifacts.map((artifact) => (
            <DropdownMenuItem
              key={artifact.id}
              onClick={() => onDownload(artifact)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{artifact.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(artifact.size_in_bytes)}</p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No artifacts available</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
