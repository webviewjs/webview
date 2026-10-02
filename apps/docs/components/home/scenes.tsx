export function HeroScene() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 h-full w-full [background:linear-gradient(90deg,rgb(3_3_3_/_0.36),transparent_62%),linear-gradient(0deg,rgb(3_3_3_/_0.34),transparent_72%),#030303_url('/images/home-hero.webp')_center_center/cover_no-repeat] min-[700px]:max-[800px]:bg-[length:auto_280px] min-[700px]:max-[800px]:bg-[position:center_bottom] max-[700px]:bg-[length:auto_260px] max-[700px]:bg-[position:right_bottom]"
      aria-hidden="true"
    />
  );
}

export function ClosingScene() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-[#030303] bg-[url('/images/home-cta.webp')] bg-cover bg-center bg-no-repeat max-[700px]:bg-[length:auto_230px] max-[700px]:bg-[position:45%_bottom]"
      aria-hidden="true"
    />
  );
}
