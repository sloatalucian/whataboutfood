export default function ProLockOverlay({ navigate }) {
  return (
    <div style={{ marginTop: 16 }}>
      <style>{`
                  @keyframes proShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                  @keyframes proLockBounce { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-6px) scale(1.1)} 60%{transform:translateY(-3px) scale(1.05)} }
                  @keyframes proFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                  @keyframes proPulseRing { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.1)} }
                `}</style>

      {/* Performanta per ospatar - continut blur */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          border: "1px solid #1e1a14",
        }}
      >
        {/* Continut real vizibil in spate */}
        <div
          style={{
            padding: 16,
            filter: "blur(3px)",
            pointerEvents: "none",
            userSelect: "none",
            opacity: 0.6,
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            👨‍🍳 Performanță per ospătar
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { l: "Ospătari activi", v: "3" },
              { l: "Comenzi totale", v: "26" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  flex: 1,
                  background: "#161210",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#f0ebe3",
                    fontFamily: "'Fraunces',serif",
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b6050",
                    marginTop: 2,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
          {[
            { n: "Ospătar 1", c: "14 comenzi", v: "1.240 lei" },
            { n: "Ospătar 2", c: "8 comenzi", v: "724 lei" },
            { n: "Ospătar 3", c: "4 comenzi", v: "257 lei" },
          ].map((o) => (
            <div
              key={o.n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "#161210",
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#c0622f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {o.n.charAt(o.n.length - 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f0ebe3",
                  }}
                >
                  {o.n}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050" }}>{o.c}</div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#c0622f",
                }}
              >
                {o.v}
              </div>
            </div>
          ))}

          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 12,
            }}
          >
            📅 Rata no-show rezervări
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[
              { l: "Rezervări luna aceasta", v: "12" },
              { l: "No-show", v: "3", red: true },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  flex: 1,
                  background: "#161210",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: s.red ? "#e05050" : "#f0ebe3",
                    fontFamily: "'Fraunces',serif",
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b6050",
                    marginTop: 2,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#161210",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, color: "#8a7a6a" }}>
                Rata no-show
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#e05050",
                }}
              >
                25%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#1e1a14",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "25%",
                  background: "#e05050",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        </div>

        {/* Overlay gradient + lacăt */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(13,10,7,0.05) 0%, rgba(13,10,7,0.6) 35%, rgba(13,10,7,0.95) 65%, #0d0a07 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 24,
          }}
        >
          <div style={{ position: "relative", marginBottom: 10 }}>
            <div
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "1px solid rgba(192,98,47,0.3)",
                animation: "proPulseRing 2s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(192,98,47,0.12)",
                border: "1.5px solid rgba(192,98,47,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                animation: "proLockBounce 2.5s ease-in-out infinite",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg,transparent,rgba(192,98,47,0.25),transparent)",
                  animation: "proShimmer 2s ease infinite",
                }}
              />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c0622f"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 700,
              color: "#f0ebe3",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Funcție{" "}
            <span style={{ color: "#c0622f", fontStyle: "italic" }}>Pro</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#8a7a6a",
              textAlign: "center",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Performanță ospătari, rata no-show,
            <br />
            ocupare mese și rating clienți
          </div>
          <button
            style={{
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 22,
              padding: "10px 24px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              animation: "proFloat 2s ease-in-out infinite",
            }}
          >
            Upgrade la Pro →
          </button>
        </div>
      </div>
    </div>
  );
}
