import { MAX_PET_SCALE, type PetLook } from "./pet-look";

/** At full size the pet with hat and weapon spans this much of the 200-unit box (its feet stay at y=184). */
const FULL_SIZE_FIT = 1.08;

/**
 * The challenge pet, drawn as layered SVG: body, face for the mood, then the
 * unlocked shirt, hat and weapon. It grows from its feet as the streak grows.
 */
export function PetAvatar({ look, size = 160 }: { look: PetLook; size?: number }) {
  const sleeping = look.mood === "sleeping";
  // A new pet starts small and grows until, at full size, hat and weapon just fit the box.
  const scale = (FULL_SIZE_FIT * look.scale) / MAX_PET_SCALE;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={MOOD_LABEL[look.mood]}>
      <ellipse cx="100" cy="186" rx={44 * scale} ry="7" fill="#000" opacity="0.08" />
      <g transform={`translate(100 184) scale(${scale}) translate(-100 -184)`} opacity={sleeping ? 0.85 : 1}>
        {look.weapon > 0 && <Weapon level={look.weapon} />}
        <path d="M100 70c34 0 52 24 52 60 0 34-22 54-52 54s-52-20-52-54c0-36 18-60 52-60z" fill="#7dd3c0" stroke="#2f7f72" strokeWidth="3" />
        <path d="M76 74l-6-18 18 10M124 74l6-18-18 10" fill="#7dd3c0" stroke="#2f7f72" strokeWidth="3" strokeLinejoin="round" />
        {look.shirt > 0 && <Shirt level={look.shirt} />}
        <Face mood={look.mood} />
        {look.hat > 0 && <Hat level={look.hat} />}
      </g>
      {sleeping && (
        <text x="150" y="70" fontSize="20" fontWeight="700" fill="#64748b">
          z<tspan dx="2" dy="-10" fontSize="14">z</tspan>
        </text>
      )}
    </svg>
  );
}

const MOOD_LABEL = { sleeping: "Thú cưng đang ngủ", hungry: "Thú cưng đang chờ bạn ôn bài", happy: "Thú cưng đang vui" } as const;

function Face({ mood }: { mood: PetLook["mood"] }) {
  return (
    <g stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none">
      {mood === "sleeping" ? (
        <path d="M78 112q8 6 16 0M106 112q8 6 16 0" />
      ) : (
        <>
          <circle cx="86" cy="110" r="5" fill="#1f2937" stroke="none" />
          <circle cx="114" cy="110" r="5" fill="#1f2937" stroke="none" />
          <circle cx="88" cy="108" r="1.6" fill="#fff" stroke="none" />
          <circle cx="116" cy="108" r="1.6" fill="#fff" stroke="none" />
        </>
      )}
      <circle cx="74" cy="124" r="6" fill="#fda4af" stroke="none" opacity="0.7" />
      <circle cx="126" cy="124" r="6" fill="#fda4af" stroke="none" opacity="0.7" />
      {mood === "happy" && <path d="M90 126q10 10 20 0" />}
      {mood === "hungry" && <path d="M93 130q7-5 14 0" />}
      {mood === "sleeping" && <path d="M96 128h8" />}
    </g>
  );
}

function Shirt({ level }: { level: number }) {
  const body = "M52 140c8 26 26 44 48 44s40-18 48-44c-14 6-30 9-48 9s-34-3-48-9z";
  return (
    <g stroke="#1f2937" strokeWidth="2.5">
      {level === 1 && <path d={body} fill="#60a5fa" />}
      {level === 2 && (
        <>
          <path d={body} fill="#f8fafc" />
          <path d="M60 158h80M68 172h64" stroke="#ef4444" strokeWidth="6" />
        </>
      )}
      {level >= 3 && (
        <>
          <path d={body} fill="#7c3aed" />
          <path d="M100 152l5 10 11 1-8 7 3 11-11-6-11 6 3-11-8-7 11-1z" fill="#facc15" strokeWidth="1.5" />
        </>
      )}
    </g>
  );
}

function Hat({ level }: { level: number }) {
  return (
    <g stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round">
      {level === 1 && (
        <>
          <path d="M70 76q30-30 60 0z" fill="#ef4444" />
          <path d="M120 76q22-2 30 6-18 2-30-6z" fill="#b91c1c" />
        </>
      )}
      {level === 2 && (
        <>
          <path d="M100 18l26 60H74z" fill="#6366f1" />
          <path d="M64 78h72" strokeWidth="6" stroke="#4338ca" strokeLinecap="round" />
          <circle cx="100" cy="46" r="4" fill="#facc15" />
        </>
      )}
      {level >= 3 && (
        <path d="M72 78l-4-34 18 16 14-24 14 24 18-16-4 34z" fill="#facc15" />
      )}
    </g>
  );
}

function Weapon({ level }: { level: number }) {
  return (
    <g stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {level === 1 && <path d="M156 168l18-78" strokeWidth="7" stroke="#92400e" />}
      {level === 2 && (
        <>
          <path d="M160 160l14-70 6 2-12 70z" fill="#e5e7eb" />
          <path d="M150 158l22 6" strokeWidth="6" stroke="#a16207" />
        </>
      )}
      {level >= 3 && (
        <>
          <path d="M158 170l14-74" strokeWidth="6" stroke="#7c2d12" />
          <circle cx="173" cy="88" r="11" fill="#38bdf8" />
          <circle cx="170" cy="85" r="3" fill="#fff" stroke="none" />
        </>
      )}
    </g>
  );
}
