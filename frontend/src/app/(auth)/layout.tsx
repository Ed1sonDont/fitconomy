export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-emerald-600">Fit</span>conomy
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">把减肥变成你最好的投资</p>
      </div>
      {children}
    </main>
  );
}
