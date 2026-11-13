import { Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react';
import { useState } from 'react';

interface WebPreviewViewProps {
  srcDoc: string;
  renderKey: number;
  isDraggingSplit: boolean;
  onRefresh: () => void;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTH: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function WebPreviewView({
  srcDoc,
  renderKey,
  isDraggingSplit,
  onRefresh,
}: WebPreviewViewProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Preview Viewport Toolbar */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-3 py-1.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1">
          {[
            { id: 'desktop' as const, label: 'Full', icon: Monitor },
            { id: 'tablet' as const, label: '768px', icon: Tablet },
            { id: 'mobile' as const, label: '375px', icon: Smartphone },
          ].map((vp) => {
            const Icon = vp.icon;
            const active = viewport === vp.id;
            return (
              <button
                key={vp.id}
                type="button"
                onClick={() => setViewport(vp.id)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <Icon className="h-3 w-3" />
                <span>{vp.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Reload preview iframe"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reload</span>
        </button>
      </div>

      {/* Sandboxed Preview Stage */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        <div
          className="h-full transition-[width] duration-150"
          style={{
            width: VIEWPORT_WIDTH[viewport],
            maxWidth: '100%',
            borderLeft: viewport !== 'desktop' ? '1px solid var(--border-subtle)' : undefined,
            borderRight: viewport !== 'desktop' ? '1px solid var(--border-subtle)' : undefined,
          }}
        >
          <iframe
            key={renderKey}
            title="Web Sandbox Preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-modals"
            className="h-full w-full border-0 bg-white"
          />
        </div>

        {/* Prevent iframe from swallowing pointer events while dragging split pane */}
        {isDraggingSplit && <div className="absolute inset-0 z-10 bg-transparent" />}
      </div>
    </div>
  );
}
