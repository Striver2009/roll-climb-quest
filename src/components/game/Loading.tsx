import mascotImg from "@/assets/mascot.png";

export function Loading({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="text-center">
        <img src={mascotImg} alt="" width={816} height={816} className="anim-float mx-auto w-28" />
        <p className="mt-3 font-display text-lg font-extrabold" aria-live="polite">
          {label}
        </p>
      </div>
    </main>
  );
}
