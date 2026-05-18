const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Mundus Trade
        </h1>
        <p className="text-muted-foreground text-sm">
          Platform Loading
        </p>
      </div>
    </div>
  );
};

export default Index;
