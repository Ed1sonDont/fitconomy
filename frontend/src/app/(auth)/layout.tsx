export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-chart-5/5 p-4 relative overflow-hidden">
      {/* Soft gradient orbs */}
      <div className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full bg-chart-5/8 blur-[100px]" />

      <div className="mb-8 text-center relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Fitconomy
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          把减肥变成你最好的投资
        </p>
      </div>
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </main>
  );
}
