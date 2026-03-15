import { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const docRef = doc(db, "portfolio", "data");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (password === data.adminPassword) {
          onLogin();
        } else {
          setError("Invalid password");
        }
      }
    } catch (e) {
      setError("Error logging in");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#080808", color: "#fff" }}>
      <div style={{ background: "#111", padding: 30, borderRadius: 16, border: "1px solid #222" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, marginBottom: 20 }}>ADMIN LOGIN</h2>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          style={{ background: "#0d0d0d", border: "1px solid #333", padding: "10px", borderRadius: 8, color: "#fff", width: "100%", marginBottom: 10 }}
        />
        <button onClick={handleLogin} style={{ background: "#e63027", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", width: "100%" }}>Login</button>
        {error && <p style={{ color: "#e63027", marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
};
