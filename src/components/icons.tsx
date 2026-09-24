import type { CategoryId } from "@/domain/product";

type IconProps = { size?: number; className?: string };

function stroke(size: number, className: string | undefined, width = 1.6) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

/** Chincol en línea: sello de la marca (reemplazable por el logo real). */
export function ChincolBird({ size = 24, className, withLegs = false, strokeWidth = 3 }: IconProps & { withLegs?: boolean; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M30 11c-1-4-3-5-6-4.5" />
      <path d="M18 21c0-8 6-12 12-9.5 6 2.5 10 8 10 15 0 8-3 14-8 17l12 7-10-1" />
      <path d="M34 50c-6 1-12-2-15-7-3-5-4-14-1-22" />
      <path d="M18 21l-8 2 7 3" />
      <path d="M26 28c4-1 8 1 10 5-2 4-6 6-10 5" />
      {withLegs ? (
        <>
          <path d="M27 45v7" />
          <path d="M33 45l-2 7" />
          <path d="M10 54h44" />
        </>
      ) : (
        <circle cx="24" cy="20" r="1.8" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}

/** Cenefa de aves en vuelo, separador decorativo. */
export function BirdsOrnament({ className }: { className?: string }) {
  return (
    <svg width="46" height="11" viewBox="0 0 46 11" fill="none" className={className} aria-hidden>
      <path d="M1.5 8c2.7 0 4.2-5.2 5.1-5.2S9 8 11.7 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M15.5 5.4c1.9 0 2.9-3.5 3.5-3.5s1.6 3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M26.5 8.6c1.5 0 2.3-2.8 2.8-2.8s1.3 2.8 2.8 2.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

export const CartIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M6 8h12l-1.2 11.2A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.8L6 8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const SearchIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </svg>
);

export const MenuIcon = ({ size = 22, className }: IconProps) => (
  <svg {...stroke(size, className, 1.7)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const CloseIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className, 2)}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

export const ArrowRightIcon = ({ size = 18, className }: IconProps) => (
  <svg {...stroke(size, className, 1.8)}>
    <path d="M5 12h13" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 22, className }: IconProps) => (
  <svg {...stroke(size, className, 1.8)}>
    <path d="M19 12H6" />
    <path d="M11 6l-6 6 6 6" />
  </svg>
);

export const FilterIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M4 7h16" />
    <path d="M7 12h10" />
    <path d="M10 17h4" />
  </svg>
);

export const WhatsappIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M20.5 11.7a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.5-4.6A8.4 8.4 0 1 1 20.5 11.7z" />
  </svg>
);

export const ChatIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M20.5 11.4c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20l1.4-3.6A6.9 6.9 0 0 1 3.5 11.4C3.5 7.4 7.3 4.2 12 4.2s8.5 3.2 8.5 7.2z" />
  </svg>
);

export const InstagramIcon =({ size = 18, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const StarIcon = ({ size = 24, className }: IconProps) => (
  <svg {...stroke(size, className, 1.5)}>
    <path d="M12 3l2.4 5.2 5.6.7-4.1 4 1 5.6L12 15.8 7.1 18.5l1-5.6-4.1-4 5.6-.7z" />
  </svg>
);

export const ShieldIcon = ({ size = 24, className }: IconProps) => (
  <svg {...stroke(size, className, 1.5)}>
    <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
    <path d="M9.2 12.2l2 2 3.6-3.8" />
  </svg>
);

export const PencilIcon = ({ size = 24, className }: IconProps) => (
  <svg {...stroke(size, className, 1.5)}>
    <path d="M4 18.5L15.3 7.2a2.4 2.4 0 0 1 3.4 3.4L7.4 21.9 3 23z" />
    <path d="M13.6 8.9l3.4 3.4" />
  </svg>
);

export const HomeIcon = ({ size = 21, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M4 11l8-6.5 8 6.5" />
    <path d="M6.5 10v9h11v-9" />
  </svg>
);

export const GridIcon = ({ size = 21, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <rect x="4" y="4" width="7" height="7" rx="1.4" />
    <rect x="13" y="4" width="7" height="7" rx="1.4" />
    <rect x="4" y="13" width="7" height="7" rx="1.4" />
    <rect x="13" y="13" width="7" height="7" rx="1.4" />
  </svg>
);

export const TableIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.6" />
    <path d="M3.5 9.5h17" />
    <path d="M3.5 14.5h17" />
    <path d="M9.5 9.5v10" />
  </svg>
);

export const TrashIcon =({ size = 18, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M5 7h14" />
    <path d="M9 7V5h6v2" />
    <path d="M7 7l1 12h8l1-12" />
  </svg>
);

export const PlusIcon = ({ size = 18, className }: IconProps) => (
  <svg {...stroke(size, className, 2)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const CalendarIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const PercentIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M19 5 5 19" />
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
);

export const UsersIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
  </svg>
);

export const TagIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M12.4 3.5H20v7.6l-8.6 8.6a2 2 0 0 1-2.8 0l-4.8-4.8a2 2 0 0 1 0-2.8z" />
    <circle cx="16.3" cy="7.7" r="1.2" />
  </svg>
);

export const BoxIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M3.5 7.5l8.5-4 8.5 4v9l-8.5 4-8.5-4z" />
    <path d="M3.5 7.5l8.5 4 8.5-4" />
    <path d="M12 11.5V20" />
  </svg>
);

export const CalculatorIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8.5 7.5h7" />
    <path d="M9 12h.01" />
    <path d="M12 12h.01" />
    <path d="M15 12h.01" />
    <path d="M9 16h.01" />
    <path d="M12 16h3" />
  </svg>
);

export const StoreIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M4 9.5L5.5 4h13L20 9.5" />
    <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
    <path d="M5.5 12v8h13v-8" />
  </svg>
);

export const LogoutIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h10" />
  </svg>
);

export const CheckIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className, 2)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const CameraIcon = ({ size = 22, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const AlertIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const HammerIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className)}>
    <path d="M13 7l4-4 4 4-4 4" />
    <path d="M15 9L5 19a1.4 1.4 0 0 1-2-2L13 7" />
  </svg>
);

export const MoreIcon = ({ size = 20, className }: IconProps) => (
  <svg {...stroke(size, className, 2)}>
    <circle cx="5.5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18.5" cy="12" r="1.2" />
  </svg>
);

/** Silueta por categoría, usada mientras no hay fotos. */
export function CategoryGlyph({ category, size = 52, className }: IconProps & { category: CategoryId }) {
  const props = stroke(size, className, 1.2);
  switch (category) {
    case "billeteras":
      return (
        <svg {...props}>
          <rect x="3.5" y="7.5" width="17" height="11" rx="2" />
          <path d="M3.5 12h17" strokeDasharray="2 2.4" />
          <circle cx="16" cy="14.6" r="1.2" />
        </svg>
      );
    case "bolsos":
      return (
        <svg {...props}>
          <path d="M4 8.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
          <path d="M9 8.5V6.5a3 3 0 0 1 6 0v2" />
          <path d="M10.5 13.5h3" />
        </svg>
      );
    case "cinturones":
      return (
        <svg {...props}>
          <path d="M3 10.5h18v3H3z" />
          <path d="M6.5 10.5V9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1.5" />
          <circle cx="8.2" cy="12" r="0.9" />
        </svg>
      );
    case "mochilas":
      return (
        <svg {...props}>
          <path d="M6 9h12l1 11H5z" />
          <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />
          <path d="M9.5 13.5h5" />
        </svg>
      );
    case "accesorios":
      return (
        <svg {...props}>
          <rect x="5" y="4.5" width="14" height="15" rx="2" />
          <path d="M8.5 9h7" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 16h4" />
        </svg>
      );
  }
}
