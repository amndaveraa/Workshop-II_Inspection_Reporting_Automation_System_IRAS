import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import sideBgImage from "../../assets/ipetro-login.png";
import "./login.css";


const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  
  try {
    const result = await loginUser(email, password, rememberMe);
    
    if (rememberMe) {
      localStorage.setItem("token", result.token);
    } else {
      sessionStorage.setItem("token", result.token);
    }

    // Shout to the rest of the app: "The token is here!"
    window.dispatchEvent(new Event("storage"));

    navigate("/app/dashboard");
  } catch (err: any) {
    setError(err.message || "Login failed");
  } finally {
    setIsLoading(false);
  }};
  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-container">
          <div className="login-brand">
            <div className="brand-logo-circle">
              <span style={{ fontSize: "24px" }}>🔒</span>
            </div>
            <div className="brand-text">
              <h2 className="brand-title">IRAS Pressure Vessel </h2>
              <p className="brand-subtitle">Inspection System</p>
            </div>
          </div>

          <div className="login-card">
            <h1 className="card-header">Sign in</h1>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div className="settings-input-container">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="settings-input settings-input--password" 
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <label className="checkbox-container">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}/>
                  <span>Remember me</span>
                </label>
                {/* <a href="#" className="forgot-link">Forgot password?</a> */}
              </div>

              <button type="submit" className="login-btn">{isLoading ? "Logging in..." : "Login"}</button>

             {error && <div className="login-error">{error}</div>}
              {/* <div className="demo-alert">
                <strong>Demo access</strong>
                <p>For now, you can use email <b>Demo Account</b> and password <b>Demo#123</b> that matches the configured demo users.</p>
              </div> */}
            </form>

            <p className="copyright-text">© 2025 IRAS Pressure Vessel Inspection System</p>
          </div>
        </div>
      </div>

      <div className="login-right" style={{ backgroundImage: `url(${sideBgImage})` }}>
        <div className="right-overlay">
          <h1>Professional Inspection Management</h1>
          <p>Streamline your pressure vessel inspections with advanced tracking, reporting, and analytics.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;