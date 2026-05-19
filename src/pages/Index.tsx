import { Logo } from "@/components/Logo";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo size="lg" />
        <p className="text-muted-foreground text-sm">
          Platform Loading
        </p>
      </div>
    </div>
  );
};

export default Index;
