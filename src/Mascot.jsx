// Pip — the ScenePick popcorn buddy. A small, cheerful mascot used across
// onboarding, loading, results and empty states to give the app personality.
const MOODS = {
  idle: {
    mouth: "M84,150 Q100,164 116,150",
    browL: "M76,118 Q84,113 92,117",
    browR: "M108,117 Q116,113 124,118",
    eye: "circle",
    armsUp: false,
    bodyAnim: "mascot-float",
  },
  wave: {
    mouth: "M82,149 Q100,166 118,149",
    browL: "M75,116 Q84,110 93,115",
    browR: "M107,115 Q116,110 125,116",
    eye: "circle",
    armsUp: false,
    bodyAnim: "mascot-float",
  },
  search: {
    mouth: "M90,153 Q100,158 110,153",
    browL: "M75,120 Q84,111 94,116",
    browR: "M106,116 Q116,111 125,120",
    eye: "squint",
    armsUp: false,
    bodyAnim: "mascot-jump",
  },
  celebrate: {
    mouth: "M80,147 Q100,172 120,147 Q100,162 80,147",
    browL: "M75,113 Q84,106 93,111",
    browR: "M107,111 Q116,106 125,113",
    eye: "happy",
    armsUp: true,
    bodyAnim: "mascot-jump",
  },
  empty: {
    mouth: "M86,156 Q100,148 114,156",
    browL: "M76,119 Q85,124 93,120",
    browR: "M107,120 Q115,124 124,119",
    eye: "circle",
    armsUp: false,
    bodyAnim: "mascot-sway",
  },
};

function Eyes({ type }) {
  if (type === "squint") {
    return (
      <g className="mascot-eyes">
        <path d="M80,131 Q88,126 96,131" stroke="#2E2A33" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M104,131 Q112,126 120,131" stroke="#2E2A33" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (type === "happy") {
    return (
      <g className="mascot-eyes">
        <path d="M79,132 Q88,120 97,132" stroke="#2E2A33" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M103,132 Q112,120 121,132" stroke="#2E2A33" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g className="mascot-eyes">
      <circle cx="88" cy="130" r="7.5" fill="#2E2A33" />
      <circle cx="90.5" cy="127.5" r="2.2" fill="#FFFFFF" />
      <circle cx="112" cy="130" r="7.5" fill="#2E2A33" />
      <circle cx="114.5" cy="127.5" r="2.2" fill="#FFFFFF" />
    </g>
  );
}

export default function Mascot({ mood = "idle", size = 120, style = {} }) {
  const m = MOODS[mood] || MOODS.idle;
  return (
    <div className={`mascot ${m.bodyAnim}`} style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="193" rx="34" ry="6" fill="#2E2A33" opacity="0.08" />

        <g className="mascot-body">
          {/* back arm (rests / raises) */}
          {!m.armsUp ? (
            <path d="M142,132 Q166,140 170,158" stroke="#FF6B4A" strokeWidth="12" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M142,128 Q160,104 150,84" stroke="#FF6B4A" strokeWidth="12" fill="none" strokeLinecap="round" className="mascot-shake" />
          )}
          {!m.armsUp && (
            <ellipse cx="171" cy="160" rx="9" ry="8" fill="#FFDDC2" />
          )}
          {m.armsUp && <ellipse cx="149" cy="80" rx="9" ry="8" fill="#FFDDC2" />}

          {/* popcorn puffs */}
          <g>
            <circle cx="66" cy="90" r="19" fill="#FFF7EA" stroke="#EAD9C0" strokeWidth="2" />
            <circle cx="86" cy="74" r="23" fill="#FFF7EA" stroke="#EAD9C0" strokeWidth="2" />
            <circle cx="108" cy="68" r="24" fill="#FFF7EA" stroke="#EAD9C0" strokeWidth="2" />
            <circle cx="130" cy="76" r="22" fill="#FFF7EA" stroke="#EAD9C0" strokeWidth="2" />
            <circle cx="146" cy="92" r="18" fill="#FFF7EA" stroke="#EAD9C0" strokeWidth="2" />
            <circle cx="97" cy="82" r="18" fill="#FFFDF8" />
          </g>

          {/* bucket */}
          <defs>
            <clipPath id={`bucketClip-${mood}`}>
              <path d="M57,96 L145,96 L136,182 Q100,190 66,182 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#bucketClip-${mood})`}>
            <rect x="45" y="90" width="20" height="100" fill="#FFF7EA" />
            <rect x="65" y="90" width="20" height="100" fill="#FF6B4A" />
            <rect x="85" y="90" width="20" height="100" fill="#FFF7EA" />
            <rect x="105" y="90" width="20" height="100" fill="#FF6B4A" />
            <rect x="125" y="90" width="20" height="100" fill="#FFF7EA" />
            <rect x="145" y="90" width="20" height="100" fill="#FF6B4A" />
          </g>
          <path d="M57,96 L145,96 L136,182 Q100,190 66,182 Z" fill="none" stroke="#2E2A33" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="101" cy="96" rx="44" ry="9" fill="#FFFFFF" stroke="#2E2A33" strokeWidth="3" />

          {/* face */}
          <path d={m.browL} stroke="#2E2A33" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d={m.browR} stroke="#2E2A33" strokeWidth="4" fill="none" strokeLinecap="round" />
          <Eyes type={m.eye} />
          <circle cx="80" cy="145" r="7" fill="#FF9D82" opacity="0.55" />
          <circle cx="120" cy="145" r="7" fill="#FF9D82" opacity="0.55" />
          <path d={m.mouth} stroke="#2E2A33" strokeWidth="4.5" fill="none" strokeLinecap="round" />

          {/* front arm (wave) */}
          {!m.armsUp ? (
            <path d="M60,132 Q34,124 26,104" stroke="#FF6B4A" strokeWidth="12" fill="none" strokeLinecap="round" className="mascot-wave-arm" />
          ) : (
            <path d="M60,128 Q42,104 52,84" stroke="#FF6B4A" strokeWidth="12" fill="none" strokeLinecap="round" className="mascot-shake" />
          )}
          {!m.armsUp && <ellipse cx="25" cy="100" rx="9" ry="8" fill="#FFDDC2" className="mascot-wave-hand" />}
          {m.armsUp && <ellipse cx="51" cy="80" rx="9" ry="8" fill="#FFDDC2" />}
        </g>
      </svg>
    </div>
  );
}
