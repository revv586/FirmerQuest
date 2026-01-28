import { useState } from "react";
import axios from "axios";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-wrap">
      {/* Login card */}
      <div className="login-card">
        <div className="badge">Pharmacy Access</div>
        <h2 className="login-title">Lab Log Portal</h2>
        <p className="login-sub">Sign in to review lab activity and audit trails.</p>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="form-group">
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary" type="submit">Login</button>
        </form>

        {/* Error message */}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
