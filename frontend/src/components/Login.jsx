import React, { useState } from 'react';
import api from '../services/api';
import '../styles/Login.css';
import { User, Lock, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import loginBackground from '../assets/login_background.jpg';
import ctdiLogo from '../assets/ctdi_logo.png';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('accessToken', response.data.accessToken);
      onLogin(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* LEFT SIDE - HIGH TECH BACKGROUND IMAGE & SLOAGANS & CIRCUIT ANIMATIONS */}
      <div className="login-left-pane">
        <svg 
          viewBox="0 0 630 546" 
          className="login-bg-svg"
          preserveAspectRatio="xMinYMax slice"
        >
          {/* Base Mockup Image */}
          <image 
            href={loginBackground} 
            width="1024" 
            height="546" 
          />

          {/* Static Circuit Lines (for subtle background network) */}
          <g className="circuit-lines-static">
            <path d="M 410 350 Q 380 270 385 200" fill="none" stroke="rgba(0, 162, 255, 0.12)" strokeWidth="1" />
            <path d="M 410 350 Q 480 280 550 250" fill="none" stroke="rgba(0, 162, 255, 0.12)" strokeWidth="1" />
            <path d="M 410 350 Q 280 380 160 400" fill="none" stroke="rgba(0, 162, 255, 0.12)" strokeWidth="1" />
            <path d="M 410 350 Q 380 410 340 460" fill="none" stroke="rgba(0, 162, 255, 0.12)" strokeWidth="1" />
            <path d="M 410 350 Q 500 380 580 400" fill="none" stroke="rgba(0, 162, 255, 0.12)" strokeWidth="1" />
            
            <path d="M 160 400 Q 220 280 385 200" fill="none" stroke="rgba(0, 162, 255, 0.08)" strokeWidth="1" />
            <path d="M 385 200 Q 460 210 550 250" fill="none" stroke="rgba(0, 162, 255, 0.08)" strokeWidth="1" />
            <path d="M 550 250 Q 600 320 580 400" fill="none" stroke="rgba(0, 162, 255, 0.08)" strokeWidth="1" />
            <path d="M 580 400 Q 470 450 340 460" fill="none" stroke="rgba(0, 162, 255, 0.08)" strokeWidth="1" />
            <path d="M 340 460 Q 230 440 160 400" fill="none" stroke="rgba(0, 162, 255, 0.08)" strokeWidth="1" />
          </g>

          {/* Animated Circuit Pulses (Data Packets flowing) */}
          <g className="circuit-lines-animated">
            <path d="M 410 350 Q 380 270 385 200" className="pulse-path p-slow" />
            <path d="M 410 350 Q 480 280 550 250" className="pulse-path p-fast p-delay-1" />
            <path d="M 410 350 Q 280 380 160 400" className="pulse-path p-medium p-delay-2" />
            <path d="M 410 350 Q 380 410 340 460" className="pulse-path p-slow p-delay-3" />
            <path d="M 410 350 Q 500 380 580 400" className="pulse-path p-fast p-delay-4" />
            
            {/* Outer loops flowing in opposite direction */}
            <path d="M 385 200 Q 220 280 160 400" className="pulse-path p-medium p-reverse" />
            <path d="M 550 250 Q 460 210 385 200" className="pulse-path p-slow p-delay-1 p-reverse" />
            <path d="M 580 400 Q 600 320 550 250" className="pulse-path p-fast p-delay-2 p-reverse" />
            <path d="M 340 460 Q 470 450 580 400" className="pulse-path p-medium p-delay-3 p-reverse" />
            <path d="M 160 400 Q 230 440 340 460" className="pulse-path p-slow p-delay-4 p-reverse" />
          </g>

          {/* Node Connection Points */}
          <g className="circuit-nodes">
            {/* Central Chip */}
            <circle cx="410" cy="350" r="4" fill="#00e5ff" className="pulse-node node-center" />
            <circle cx="410" cy="350" r="8" fill="none" stroke="#00e5ff" strokeWidth="1" className="node-ring" />

            {/* Terminals */}
            <circle cx="385" cy="200" r="3" fill="#00e5ff" className="pulse-node node-t1" />
            <circle cx="550" cy="250" r="3" fill="#00e5ff" className="pulse-node node-t2" />
            <circle cx="160" cy="400" r="3" fill="#00e5ff" className="pulse-node node-t3" />
            <circle cx="340" cy="460" r="3" fill="#00e5ff" className="pulse-node node-t4" />
            <circle cx="580" cy="400" r="3" fill="#00e5ff" className="pulse-node node-t5" />
          </g>
        </svg>

        {/* Screen Reader Only texts for SEO & accessibility */}
        <div className="sr-only">
          <h1>NPA Workspace</h1>
          <h2>Conectividade que vai mais longe.</h2>
          <p>Validação visual de documentos com precisão, segurança e inovação.</p>
        </div>
      </div>

      {/* RIGHT SIDE - AUTHENTICATION FORM & CTDI LOGO */}
      <div className="login-right-pane">
        <div className="grid-spacer-top"></div>
        <div className="login-glass-card">
          {/* CTDI Official Logo */}
          <div className="login-logo-wrapper">
            <img src={ctdiLogo} alt="CTDI" className="login-ctdi-logo" />
          </div>

          <h2 className="login-welcome-title">Bem-vindo</h2>
          <p className="login-welcome-subtitle">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <div className="input-field-wrapper">
                <User size={18} className="input-icon-left" />
                <input
                  type="text"
                  className="auth-input-field"
                  placeholder="Usuário ou Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="input-group">
              <div className="input-field-wrapper">
                <Lock size={18} className="input-icon-left" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input-field"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-password-container">
              <a href="#forgot" className="forgot-password-link">Esqueci minha senha</a>
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="login-btn-submit" disabled={loading}>
              <span>{loading ? 'Entrando...' : 'Entrar'}</span>
              {!loading && <ArrowRight size={16} className="btn-arrow-icon" />}
            </button>
          </form>



          <div className="secure-environment-disclaimer">
            <Lock size={12} className="secure-icon" />
            <span>Ambiente seguro e monitorado</span>
          </div>
        </div>

        {/* Copyright at the very bottom */}
        <div className="login-copyright">
          <div style={{ marginBottom: '6px', opacity: 0.85, fontWeight: '500' }}>Created By: Felipe Bernardo</div>
          © 2026 Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;
