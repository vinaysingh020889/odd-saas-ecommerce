export function HeroSliderControls({
  count,
  current,
  onPrevious,
  onNext,
  onSelect
}: {
  count: number;
  current: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <>
      <button type="button" onClick={onPrevious} aria-label="Previous hero slide" className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-omd-brown/35 text-lg font-bold text-white shadow-sm backdrop-blur transition hover:bg-white hover:text-omd-brown sm:left-5 sm:h-11 sm:w-11">
        {"<"}
      </button>
      <button type="button" onClick={onNext} aria-label="Next hero slide" className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-omd-brown/35 text-lg font-bold text-white shadow-sm backdrop-blur transition hover:bg-white hover:text-omd-brown sm:right-5 sm:h-11 sm:w-11">
        {">"}
      </button>
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-white/20 bg-omd-brown/35 px-3 py-2 shadow-sm backdrop-blur">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Show hero slide ${index + 1}`}
            aria-current={current === index ? "true" : undefined}
            onClick={() => onSelect(index)}
            className={`h-2.5 rounded-full transition ${current === index ? "w-8 bg-omd-gold" : "w-2.5 bg-white/70 hover:bg-white"}`}
          />
        ))}
      </div>
    </>
  );
}