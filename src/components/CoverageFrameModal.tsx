import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CoverageFrame } from './CoverageFrame';
import type { CoverageTree } from './types';

interface CoverageFrameModalProps {
  coverageTree: CoverageTree | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CoverageFrameModal({ coverageTree, isOpen, onClose }: CoverageFrameModalProps) {
  if (!coverageTree) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Coverage Report: {coverageTree.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <CoverageFrame coverageTree={coverageTree} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
