import * as React from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function Thead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b bg-gray-50/50', className)} {...props} />;
}

export function Tbody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-gray-100 transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50',
        className
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'p-4 align-middle text-gray-700 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}
