import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  Cog,
  CircleDot,
  Car,
  Lightbulb,
  Thermometer,
  Droplets,
  Settings,
  Zap,
  Circle,
  Armchair,
  Music,
  Shield,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Cog,
  CircleDot,
  Car,
  Lightbulb,
  Thermometer,
  Droplets,
  Settings,
  Zap,
  Circle,
  Armchair,
  Music,
  Shield,
};

interface CategoryOrbProps {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

export default function CategoryOrb({ id, name, icon }: CategoryOrbProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [iconShift, setIconShift] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function onMouseMove(e: React.MouseEvent) {
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -14, y: dx * 14 });
    setIconShift({ x: dx * 10, y: dy * 10 });
  }

  function onMouseLeave() {
    setTilt({ x: 0, y: 0 });
    setIconShift({ x: 0, y: 0 });
    setIsHovered(false);
  }

  const IconComponent = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : Cog;

  return (
    <Link href={`/products?categoryId=${id}`} className="no-underline">
      <div
        className="category-orb-wrapper"
        onMouseMove={onMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={onMouseLeave}
      >
        <div
          ref={shellRef}
          className="orb-shell"
          style={{
            transform: `perspective(500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "scale(1.08)" : "scale(1)"}`,
          }}
        >
          <div
            className="flex items-center justify-center w-full h-full relative z-[1]"
            style={{
              transform: `translate(${iconShift.x}px, ${iconShift.y}px)`,
            }}
          >
            <IconComponent className="w-5 h-5 text-primary/70" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }} />
          </div>
        </div>
        <span className="orb-label">{name}</span>
      </div>
    </Link>
  );
}
