import { useAuth } from "../context/AuthContext";

const { logout } = useAuth();

<button onClick={logout}>Logout</button>
