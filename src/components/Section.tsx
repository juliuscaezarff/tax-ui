export function Separator() {
  return <div className="h-px bg-(--color-border) my-2" />;
}

export function DoubleSeparator() {
  return (
    <div className="flex flex-col gap-0.5 my-2">
      <div className="h-px bg-(--color-border)" />
      <div className="h-px bg-(--color-border)" />
    </div>
  );
}

interface SectionHeaderProps {
  children: React.ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <h2 className="text-xs text-(--color-text-muted) mt-6 mb-2">
      {children}
    </h2>
  );
}
