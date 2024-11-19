import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Home from "./components/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";
import Dashboard from "./components/Dashboard";
import PostBid from "./components/PostItem";
const App = () => {
  const { isAuthenticated, user, getIdTokenClaims } = useAuth0();

  useEffect(() => {
    const saveUser = async () => {
      if (isAuthenticated) {
        try {
          const token = await getIdTokenClaims();
          const userPayload = {
            auth0_id: user.sub,
            name: user.name,
            email: user.email,
            picture: user.picture,
          };
          const response = await fetch("http://localhost:8080/api/auth/user", {
            headers: {
              Authorization: `Bearer ${token.__raw}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(userPayload),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const data = await response.json();
          console.log("User saved successfully:", data);
        } catch (error) {
          console.error("Error saving user:", error);
        }
      }
    };

    saveUser();
  }, [isAuthenticated, getIdTokenClaims, user]); // Add dependencies
  return (
    <Router>
      <div>
        {/* Navigation Bar */}
        <nav style={styles.navbar}>
          <div style={styles.navLinks}>
            {!isAuthenticated && (
              <Link to="/" style={styles.link}>
                Home
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" style={styles.link}>
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/post-item" style={styles.link}>
                Post Item
              </Link>
            )}
          </div>
          <div style={styles.auth}>
            {isAuthenticated ? (
              <>
                <span style={styles.userName}>Welcome, {user?.name}</span>
                <LogoutButton />
              </>
            ) : (
              <LoginButton />
            )}
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Home />} />

          {/* Protected Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post-item"
            element={
              <ProtectedRoute>
                <PostBid />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "#333",
    color: "#fff",
  },
  navLinks: {
    display: "flex",
    gap: "1rem",
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "1rem",
  },
  auth: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userName: {
    marginRight: "1rem",
  },
};

export default App;
