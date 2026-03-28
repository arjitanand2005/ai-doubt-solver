import React, { useState } from "react";
import { auth, provider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";

const FloatingParticle = ({ style }) => (
  <div style={{
    position: "absolute",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    animation: "float linear infinite",
    ...style
  }} />
);

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: Math.random() * 80 + 20,
      left: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.15 + 0.05,
    }))
  );

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Animated background orbs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)", top: "-20%", left: "-10%", animation: "pulse 8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)", bottom: "-20%", right: "-10%", animation: "pulse 10s ease-in-out infinite reverse" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,126,234,0.1) 0%, transparent 70%)", top: "40%", right: "20%", animation: "pulse 6s ease-in-out infinite" }} />

      {/* Floating particles */}
      {particles.map(p => (
        <FloatingParticle key={p.id} style={{
          width: p.size,
          height: p.size,
          left: `${p.left}%`,
          bottom: "-100px",
          opacity: p.opacity,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}

      {/* Grid lines */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(102,126,234,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.05) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Main card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: 440,
        padding: "0 20px",
        animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "48px 40px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 20px",
              boxShadow: "0 8px 32px rgba(102,126,234,0.4)",
              animation: "iconPulse 3s ease-in-out infinite",
            }}>🎓</div>

            <h1 style={{
              fontSize: 28, fontWeight: 800, margin: "0 0 8px",
              background: "linear-gradient(135deg, #ffffff, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>AI Doubt Solver</h1>

            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: 0 }}>
              Your personal AI tutor, available 24/7
            </p>
          </div>

          {/* Features list */}
          <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "⚡", text: "Instant step-by-step solutions" },
              { icon: "📷", text: "Upload images & PDFs of questions" },
              { icon: "🧠", text: "Powered by advanced AI models" },
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.06)",
                animation: `slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * (i + 1)}s both`,
              }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: "rgba(231,76,60,0.15)",
              border: "1px solid rgba(231,76,60,0.3)",
              borderRadius: 10, padding: "10px 14px",
              color: "#ff6b6b", fontSize: 13, marginBottom: 16, textAlign: "center"
            }}>{error}</div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: loading ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
              boxShadow: loading ? "none" : "0 4px 20px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(255,255,255,0.18)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(102,126,234,0.3)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  animation: "spin 0.8s linear infinite"
                }} />
                Signing in...
              </>
            ) : (
              <>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  style={{ width: 22, height: 22 }}
                />
                Continue with Google
              </>
            )}
          </button>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 20, marginBottom: 0 }}>
            Free to use • No credit card required
          </p>
        </div>

        {/* Bottom glow */}
        <div style={{
          position: "absolute", bottom: -2, left: "10%", right: "10%",
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(102,126,234,0.6), transparent)",
        }} />
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes iconPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(102,126,234,0.4); }
          50% { box-shadow: 0 8px 48px rgba(102,126,234,0.7); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}