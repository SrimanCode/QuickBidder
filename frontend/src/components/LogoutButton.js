import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LogoutButton = () => {
  const { logout, isAuthenticated } = useAuth0();

  // Use useEffect to watch the isAuthenticated state
  return isAuthenticated && <button onClick={logout}>Sign Out</button>;
};
export default LogoutButton;
