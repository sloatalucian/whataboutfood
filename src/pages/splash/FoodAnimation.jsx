import { useEffect } from "react";

function FoodAnimation({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#0d0a07",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes wafGlowExp {
          from { transform: translate(-50%,-50%) scale(0); opacity:0; }
          to   { transform: translate(-50%,-50%) scale(1); opacity:1; }
        }
        @keyframes wafLineL {
          from { width:0; }
          to   { width:200px; }
        }
        @keyframes wafLineR {
          from { width:0; }
          to   { width:200px; }
        }
        @keyframes wafTitleUp {
          from { opacity:0; transform:translateY(60px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes wafTerraIn {
          from { opacity:0; transform:scaleX(0.6); }
          to   { opacity:1; transform:scaleX(1); }
        }
        @keyframes wafSubIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes wafFadeOut {
          from { opacity:1; }
          to   { opacity:0; }
        }
        @keyframes wafPartFloat {
          0%   { opacity:0; transform:translate(0,0) scale(0); }
          30%  { opacity:0.8; }
          100% { opacity:0; transform:translate(var(--dx),var(--dy)) scale(1); }
        }
        .waf-splash-wrap {
          animation: wafFadeOut 0.5s ease 2.7s both;
        }
        .waf-glow {
          position:absolute;
          width:320px; height:320px;
          border-radius:50%;
          background:radial-gradient(circle, rgba(192,98,47,0.2) 0%, transparent 70%);
          top:50%; left:50%;
          animation: wafGlowExp 1s cubic-bezier(.23,1,.32,1) 0.1s both;
        }
        .waf-line-wrap {
          display:flex;
          align-items:center;
          gap:0;
          margin:14px 0 14px;
        }
        .waf-line-l {
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(192,98,47,0.7));
          width:0;
          animation: wafLineL 0.7s cubic-bezier(.23,1,.32,1) 0.8s both;
        }
        .waf-line-r {
          height:1px;
          background:linear-gradient(90deg,rgba(192,98,47,0.7),transparent);
          width:0;
          animation: wafLineR 0.7s cubic-bezier(.23,1,.32,1) 0.9s both;
        }
        .waf-dot {
          width:4px; height:4px;
          border-radius:50%;
          background:#c0622f;
          opacity:0;
          animation: wafSubIn 0.3s ease 0.8s both;
          flex-shrink:0;
        }
        .waf-title {
          font-family:'Fraunces',serif;
          font-size:52px;
          font-weight:900;
          letter-spacing:-2px;
          line-height:1;
          display:flex;
          align-items:baseline;
          gap:0;
        }
        .waf-white {
          color:#f0ebe3;
          display:inline-block;
          opacity:0;
          animation: wafTitleUp 0.9s cubic-bezier(.23,1,.32,1) 0.3s both;
        }
        .waf-terra {
          color:#c0622f;
          font-style:italic;
          display:inline-block;
          transform-origin:left center;
          opacity:0;
          animation: wafTerraIn 0.7s cubic-bezier(.23,1,.32,1) 0.85s both;
        }
        .waf-sub {
          font-family:'Plus Jakarta Sans',sans-serif;
          font-size:11px;
          font-weight:400;
          letter-spacing:4px;
          text-transform:uppercase;
          color:#8a7a6a;
          opacity:0;
          animation: wafSubIn 0.6s ease 1.2s both;
          display:flex;
          align-items:center;
          gap:10px;
        }
        .waf-sub-dot {
          width:3px; height:3px;
          border-radius:50%;
          background:#c0622f;
          opacity:0.5;
        }
        .waf-part {
          position:absolute;
          width:3px; height:3px;
          border-radius:50%;
          background:#c0622f;
          animation: wafPartFloat 1.2s ease-out both;
        }
      `}</style>

      <div
        className="waf-splash-wrap"
        style={{ textAlign: "center", position: "relative", zIndex: 2 }}
      >
        <div className="waf-title">
          <span className="waf-white">Whatabout</span>
          <span className="waf-terra">Food</span>
        </div>
        <div className="waf-line-wrap">
          <div className="waf-line-l" />
          <div className="waf-dot" />
          <div className="waf-line-r" />
        </div>
        <div className="waf-sub">
          <span>Rezervări</span>
          <div className="waf-sub-dot" />
          <span>Comenzi</span>
          <div className="waf-sub-dot" />
          <span>Plăți</span>
        </div>
      </div>

      <div className="waf-glow" />

      {/* Particule */}
      {[
        { top: "35%", left: "22%", dx: "-20px", dy: "-25px", delay: "0.6s" },
        { top: "65%", left: "28%", dx: "-15px", dy: "20px", delay: "0.75s" },
        { top: "30%", right: "24%", dx: "18px", dy: "-22px", delay: "0.7s" },
        { top: "68%", right: "22%", dx: "20px", dy: "18px", delay: "0.85s" },
        { top: "50%", left: "14%", dx: "-25px", dy: "0px", delay: "0.9s" },
        { top: "50%", right: "14%", dx: "25px", dy: "0px", delay: "0.65s" },
        { top: "40%", left: "35%", dx: "-10px", dy: "-30px", delay: "0.8s" },
        { top: "60%", right: "35%", dx: "10px", dy: "28px", delay: "0.95s" },
      ].map((p, i) => (
        <div
          key={i}
          className="waf-part"
          style={{
            top: p.top,
            left: p.left,
            right: p.right,
            "--dx": p.dx,
            "--dy": p.dy,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export default FoodAnimation;
