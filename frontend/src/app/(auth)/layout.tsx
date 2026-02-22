export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(52, 70, 90, 0.12) 0%, var(--cozy-bg-deep) 35%, var(--cozy-bg-deep) 100%)",
      }}
    >
      <div
        className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style={{ backgroundColor: "var(--cozy-border)" }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[100px] opacity-30"
        style={{ backgroundColor: "var(--cozy-positive)" }}
      />

      <div className="mb-8 text-center relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight pixel-font" style={{ color: "var(--cozy-border)" }}>
          Fitconomy
        </h1>
        <p className="mt-2 text-sm pixel-body" style={{ color: "var(--cozy-muted)" }}>
          把减肥变成你最好的投资
        </p>
      </div>
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </main>
  );
}
