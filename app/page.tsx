import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Weather dashboard</h1>
        <p className="text-sm text-zinc-500">
          Add four places to see their weather. All numbers come from Open-Meteo.
        </p>
      </header>
      <Dashboard />
    </main>
  );
}
