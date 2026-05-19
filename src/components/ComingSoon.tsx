type ComingSoonProps = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-12 w-12 rounded-full bg-p050 text-p800 flex items-center justify-center text-xl font-semibold mb-4">
        ⏳
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description && (
        <p className="mt-2 text-muted-foreground text-sm max-w-md">{description}</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        This screen will be built in the next commits of the port.
      </p>
    </div>
  );
}