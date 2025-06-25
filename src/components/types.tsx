import { Ban, CheckCircle, Clock, XCircle } from 'lucide-react';

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  workflow_id: number;
  workflow_name: string;
  run_number: number;
  actor: {
    login: string;
  };
  isNotRecent?: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  errorType?: string;
  errorContent?: string;
  skippedMessage?: string;
}

export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

// GitHub API response types
export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  workflow_id: number;
  workflow_name: string;
  run_number: number;
  actor: {
    login: string;
  };
  path: string;
}

export interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
}

export const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export const getStatusIcon = (status: string, conclusion?: string | null) => {
  if (status === 'completed') {
    if (conclusion === 'success') return <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />;
    if (conclusion === 'failure') return <XCircle className="h-5 w-5 mt-0.5 text-red-500" />;
    if (conclusion === 'cancelled') return <Ban className="h-5 w-5 mt-0.5 text-gray-500 dark:text-gray-450" />;
  }
  return <Clock className="h-5 w-5 mt-0.5 text-blue-500" />;
};
