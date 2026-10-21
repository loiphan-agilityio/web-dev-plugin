import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Page-level buttons or links, shown at the end of the row. */
  actions?: ReactNode;
}

/** The page's one `h1`, with an optional description and actions. */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="space-y-1">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);
