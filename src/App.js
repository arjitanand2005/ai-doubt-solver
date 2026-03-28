import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./components/Auth/Login";
import ChatBox from "./components/Chat/ChatBox";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "40vh" }}>Loading...</h2>;
  if (!user) return <Login />;

  return <ChatBox user={user} onLogout={() => signOut(auth)} />;
}

export default App;