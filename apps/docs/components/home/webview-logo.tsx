import Image from 'next/image';

export function WebviewLogo({ className }: { className: string }) {
  // Cached from https://github.com/webviewjs.png for reliable static exports.
  return (
    <Image
      src="/icon.jpg"
      alt=""
      aria-hidden="true"
      width={460}
      height={460}
      unoptimized
      className={`${className} shrink-0 rounded-[5px] border border-white/15 object-cover`}
    />
  );
}
