import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ADMIN_EMAILS, isAdminEmail } from "../lib/adminAuth";

// Admin access is Google-only, and only for the owner accounts listed in
// ADMIN_EMAILS. There is no password to leak or share.
export const Login = () => {
  const { user, signIn, signOut, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn();
    } catch (e: any) {
      setError(
        e?.code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled"
          : "Could not sign in with Google — try again"
      );
    } finally {
      setBusy(false);
    }
  };

  const wrongAccount = user && !isAdminEmail(user.email);

  return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:20 }}>
      <div style={{ background:"#111",padding:36,borderRadius:20,border:"1px solid #222",width:"100%",maxWidth:400,textAlign:"center" }}>
        <div style={{ width:52,height:52,background:"#e63027",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',cursive",fontSize:26,margin:"0 auto 18px" }}>
          EF
        </div>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,margin:"0 0 6px" }}>ADMIN ACCESS</h2>
        <p style={{ color:"#666",fontSize:13,margin:"0 0 26px" }}>
          {wrongAccount
            ? "This Google account isn't allowed in here."
            : "Sign in with the owner's Google account."}
        </p>

        {loading ? (
          <div style={{ color:"#555",fontSize:13 }}>Checking…</div>
        ) : wrongAccount ? (
          <>
            <div style={{ background:"#2a0a0a",border:"1px solid #e6302744",borderRadius:10,padding:"12px 14px",marginBottom:16,textAlign:"left" }}>
              <div style={{ color:"#e63027",fontSize:12,fontWeight:700,marginBottom:4 }}>⚠ Not authorised</div>
              <div style={{ color:"#888",fontSize:12 }}>
                Signed in as <b style={{ color:"#ccc" }}>{user.email}</b>. Only {ADMIN_EMAILS.join(", ")} can open the admin panel.
              </div>
            </div>
            <button
              onClick={() => signOut()}
              style={{ background:"#1a1a1a",color:"#888",border:"1px solid #333",borderRadius:10,padding:"12px 20px",cursor:"pointer",width:"100%",fontWeight:700,fontSize:14 }}
            >
              Sign out and switch account
            </button>
          </>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={busy}
            style={{ background:"#fff",color:"#111",border:"none",borderRadius:10,padding:"13px 20px",cursor:busy?"wait":"pointer",width:"100%",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}
          >
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {busy ? "Opening Google…" : "Sign in with Google"}
          </button>
        )}

        {error && <p style={{ color:"#e63027",marginTop:14,fontSize:13 }}>{error}</p>}

        <p style={{ color:"#333",fontSize:11,marginTop:26 }}>Your Editor Friend · Admin</p>
      </div>
    </div>
  );
};
