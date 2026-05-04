import { MonitorPlay } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="flex animate-pulse flex-col items-center justify-center gap-4">
        <MonitorPlay className="h-16 w-16 text-green-500" />
        <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
          Entrée sur le terrain...
        </p>
      </div>
    </div>
  );
}
