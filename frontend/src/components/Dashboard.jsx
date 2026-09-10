import React, { useState, useEffect, useRef } from 'react';
import '../styles/Dashboard.css';
import { 
  Layout, Shield, Terminal, Settings, LogOut, BarChart2, 
  Clock, FileText, Upload, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, MessageSquare, Send 
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [terminals, setTerminals] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [selectedVisualModel, setSelectedVisualModel] = useState('SP930');
  
  // Upload States
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Assistant chatbot states
  const [chatMessages, setChatMessages] = useState([
    { text: "Olá! Eu sou o <strong>NPA Agent</strong>, seu especialista em terminais Cielo. Como posso te ajudar hoje?", sender: 'bot' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const chatEndRef = useRef(null);
  const floatingChatEndRef = useRef(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [terminalsRes, revisionsRes] = await Promise.all([
        api.get('/terminals'),
        api.get('/terminals/revisions')
      ]);
      setTerminals(terminalsRes.data);
      setRevisions(revisionsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    window.setTabAndModel = (tabId, model) => {
      setActiveTab(tabId);
      if (model) {
        setSelectedVisualModel(model);
      }
    };
    return () => {
      delete window.setTabAndModel;
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (floatingChatEndRef.current) {
      floatingChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('accessToken');
      onLogout();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Upload Logic
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setUploadError('');
    } else {
      setUploadError('Por favor envie apenas arquivos PDF.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadSummary(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('bookFile', file);

    try {
      const response = await api.post('/terminals/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(pct);
        }
      });
      setUploadSummary(response.data.summary);
      setFile(null);
      // Reload updated database records
      await fetchData();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Erro ao processar o upload do documento.');
    } finally {
      setUploading(false);
    }
  };

  // Chatbot Send Message Logic
  const handleChatSend = async (textToSend) => {
    const msg = textToSend || chatInput.trim();
    if (!msg) return;

    setChatMessages(prev => [...prev, { text: msg, sender: 'user' }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await api.post('/terminals/assistant', { query: msg });
      setChatMessages(prev => [...prev, { text: response.data.response, sender: 'bot' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { text: 'Ocorreu um erro no assistente. Tente novamente mais tarde.', sender: 'bot' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="auth-container" style={{color: '#fff', fontSize: '18px', fontWeight: '500'}}>Carregando Book NPA...</div>;
  }
  // Calculate stats dynamically
  const totalModels = terminals.length;
  const latestRevision = revisions[0];
  const docVersion = latestRevision ? `v${latestRevision.version}` : 'v87';
  const revisionDate = latestRevision ? latestRevision.revision_date : '24/08/2026';

  // Compute category chart data
  const posCount = terminals.filter(t => t.category === 'POS').length;
  const pinpadCount = terminals.filter(t => t.category.toLowerCase().includes('pin')).length;
  const smartCount = terminals.filter(t => t.category.toLowerCase().includes('smart')).length;

  const categoryChartData = {
    labels: ['POS', 'PIN PAD', 'Smart Terminais'],
    datasets: [{
      data: [posCount, pinpadCount, smartCount],
      backgroundColor: ['#0069B4', '#7C3AED', '#059669'],
      borderWidth: 3,
      borderColor: '#fff'
    }]
  };

  // Compute connectivity chart data
  const wifiCount = terminals.filter(t => t.connectivity.toLowerCase().includes('wifi') || t.connectivity.toLowerCase().includes('wi-fi') || t.connectivity.toLowerCase().includes('dual band')).length;
  const mobileCount = terminals.filter(t => t.connectivity.toLowerCase().match(/gprs|3g|4g|cell/i)).length;
  const btCount = terminals.filter(t => t.connectivity.toLowerCase().match(/bluetooth|bt/i)).length;
  const usbSerialCount = terminals.filter(t => t.connectivity.toLowerCase().match(/usb|serial|dual/i)).length;

  const connChartData = {
    labels: ['WiFi', 'Móvel (3G/4G)', 'Bluetooth', 'USB/Serial'],
    datasets: [{
      label: 'Modelos',
      data: [wifiCount, mobileCount, btCount, usbSerialCount],
      backgroundColor: ['#00AEEF', '#0069B4', '#7C3AED', '#EA580C'],
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  // Tab definitions
  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'pos', label: 'Terminais POS' },
    { id: 'pinpad', label: 'PIN PAD' },
    { id: 'smart', label: 'Smart Terminais' },
    { id: 'versoes', label: 'Tabela de Versões' },
    { id: 'criterios', label: 'Critério de Validação' },
    { id: 'visual-criterios', label: 'Visual - Critério cosmético' },
    { id: 'historico', label: 'Histórico' },
    { id: 'upload', label: 'Upload Book' },
    { id: 'assistente', label: '💬 Assistente IA', customStyle: { color: 'var(--cielo-blue)', fontWeight: '600' } }
  ];

  // Map categories for tabs
  const filteredTerminals = () => {
    if (activeTab === 'pos') return terminals.filter(t => t.category === 'POS' || t.model.toUpperCase() === 'DX8000');
    if (activeTab === 'pinpad') return terminals.filter(t => t.category.toLowerCase().includes('pin'));
    if (activeTab === 'smart') return terminals.filter(t => t.category.toLowerCase().includes('smart') && t.model.toUpperCase() !== 'DX8000');
    return terminals;
  };

  // Generate operation guide based on terminal model
  const getOpGuide = (terminal) => {
    const model = terminal.model.toUpperCase();
    if (model.includes('SP930')) return { ligar: 'Pressionar tecla vermelha por 3s', desligar: 'Pressionar tecla vermelha por 3s' };
    if (model.includes('ME60')) return { ligar: 'Pressionar por 5s a tecla ligar', desligar: 'Pressionar por 5s a tecla desligar' };
    if (model.includes('Q92X')) return { ligar: 'Pressionar botão POWER lateral por 3s', desligar: 'Pressionar botão POWER lateral por 3s' };
    if (model.includes('DX8000')) return { ligar: 'Pressionar botão lateral superior por 3s', desligar: 'Pressionar botão lateral superior por 3s' };
    if (model.includes('PPC930')) return { ligar: 'Conectar à fonte de energia ou USB', desligar: 'Desconectar da fonte de energia ou cabo' };
    if (model.includes('S920')) return { ligar: 'Pressionar a tecla vermelha', desligar: 'Pressionar a tecla vermelha' };
    if (model.includes('MP15')) return { ligar: 'Segurar a tecla ligar por 3s', desligar: 'Segurar a tecla ligar por 3s' };
    if (model.includes('LIO')) return { ligar: 'Pressionar botão lateral por 3s', desligar: 'Pressionar botão lateral por 3s e escolher desligar na tela' };
    if (model.includes('GPOS720')) return { ligar: 'Pressionar botão lateral por 3s', desligar: 'Pressionar botão lateral por 3s' };
    return { ligar: 'Pressionar o botão Power lateral por 3s', desligar: 'Pressionar o botão Power lateral por 3s' };
  };

  const getTerminalTypeBadge = (t) => {
    const model = t.model.toUpperCase();
    if (model.includes('SP930')) return 'POS COMBO';
    if (model.includes('ME60')) return 'ZIP COMBO';
    if (model.includes('Q92X')) return 'POS COMBO';
    if (model.includes('DX8000')) return 'SMART POS';
    if (model.includes('PPC930')) return 'PIN PAD';
    if (model.includes('S920')) return 'TEF MÓVEL';
    if (model.includes('MP15')) return 'PINPAD BLUETOOTH';
    if (model.includes('LIO')) return 'LIO';
    if (model.includes('GPOS720')) return 'SMART TEF';
    if (model.includes('L400') || model.includes('L300')) return 'SMART';
    return t.category.toUpperCase();
  };

  const getCardGradient = (t, tab) => {
    const model = t.model.toUpperCase();
    if (tab === 'smart') {
      if (model.includes('LIO')) return 'linear-gradient(135deg, #064e3b 0%, #059669 100%)';
      if (model.includes('GPOS720')) return 'linear-gradient(135deg, #14532d 0%, #16A34A 100%)';
      if (model.includes('L400')) return 'linear-gradient(135deg, #1a2e05 0%, #4D7C0F 100%)';
      if (model.includes('L300')) return 'linear-gradient(135deg, #052e16 0%, #15803D 100%)';
      return 'linear-gradient(135deg, #064e3b 0%, #059669 100%)';
    }
    if (tab === 'pinpad') {
      if (model.includes('PPC930')) return 'linear-gradient(135deg, #4a1d96 0%, #7C3AED 100%)';
      if (model.includes('S920')) return 'linear-gradient(135deg, #3b0764 0%, #9333EA 100%)';
      if (model.includes('MP15')) return 'linear-gradient(135deg, #1e1b4b 0%, #4338CA 100%)';
      return 'linear-gradient(135deg, #4a1d96 0%, #7C3AED 100%)';
    }
    // POS (tab === 'pos')
    if (model.includes('SP930')) return 'linear-gradient(135deg, #003F7C 0%, #0069B4 100%)';
    if (model.includes('ME60')) return 'linear-gradient(135deg, #1a3d6b 0%, #1565C0 100%)';
    if (model.includes('Q92X')) return 'linear-gradient(135deg, #1b2a4a 0%, #0369A1 100%)';
    if (model.includes('DX8000')) return 'linear-gradient(135deg, #0f2744 0%, #075985 100%)';
    return 'linear-gradient(135deg, #003F7C 0%, #0069B4 100%)';
  };

  const renderCardFields = (t) => {
    const model = t.model.toUpperCase();
    const fields = [];

    // Versão SW / Versão
    const versionLabel = ['PPC930', 'S920', 'MP15'].includes(model) ? 'Versão' : 'Versão SW';
    fields.push(
      <div className="t-row" key="version">
        <span className="t-key">{versionLabel}</span>
        <span className="t-val" style={{fontFamily: 'DM Mono', fontSize: '11px', fontWeight: 'bold'}}>{t.software_version || '-'}</span>
      </div>
    );

    // Cielo Mobile (only for LIO ON)
    if (model.includes('LIO')) {
      fields.push(
        <div className="t-row" key="cielo-mobile">
          <span className="t-key">Cielo Mobile</span>
          <span className="t-val" style={{fontWeight: 'bold'}}>2.39.2 / 2.40.5</span>
        </div>
      );
    }

    // Conectividade
    fields.push(
      <div className="t-row" key="connectivity">
        <span className="t-key">Conectividade</span>
        <div className="t-conn-badges" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {t.connectivity.split(/[\s,e/&]+/).filter(c => c.trim().length > 1).map((c, i) => {
            const norm = c.toLowerCase().trim();
            let badgeClass = 'wifi';
            if (norm.match(/gprs|3g|4g|cell/)) badgeClass = 'gprs';
            else if (norm.match(/bluetooth|bt/)) badgeClass = 'bt';
            else if (norm.match(/usb/)) badgeClass = 'usb';
            else if (norm.match(/serial/)) badgeClass = 'serial';
            else if (norm.match(/dual/)) badgeClass = 'dual';
            return <span key={i} className={`conn-badge ${badgeClass}`}>{c}</span>;
          })}
        </div>
      </div>
    );

    // Firmware & Kernel (only for PPC930)
    if (model === 'PPC930') {
      fields.push(
        <div className="t-row" key="firmware">
          <span className="t-key">Firmware</span>
          <span className="t-val" style={{fontWeight: 'bold'}}>2.14</span>
        </div>
      );
      fields.push(
        <div className="t-row" key="kernel">
          <span className="t-key">Kernel</span>
          <span className="t-val" style={{fontWeight: 'bold'}}>1.15</span>
        </div>
      );
    } else {
      // Bateria mín. (for all except PPC930)
      fields.push(
        <div className="t-row" key="battery">
          <span className="t-key">Bateria mín.</span>
          <span className="t-val" style={{fontWeight: 'bold'}}>{t.battery_min ? `${t.battery_min}%` : 'N/A'}</span>
        </div>
      );

      // PCI or Senha Técnica
      if (model === 'DX8000' || model === 'S920') {
        fields.push(
          <div className="t-row" key="technical_password">
            <span className="t-key">Senha Técnica</span>
            <span className="t-val" style={{fontWeight: 'bold'}}>{t.technical_password || 'N/A'}</span>
          </div>
        );
      } else {
        let pciVal = '5.x';
        if (model === 'Q92X') pciVal = '—';
        else if (model === 'L400' || model === 'L300') pciVal = 'PTS 6.x';
        else if (model === 'GPOS720') pciVal = '5.X';
        
        fields.push(
          <div className="t-row" key="pci">
            <span className="t-key">PCI</span>
            <span className="t-val" style={{fontWeight: 'bold'}}>{pciVal}</span>
          </div>
        );
      }
    }

    // SAP
    fields.push(
      <div className="t-row" key="sap">
        <span className="t-key">SAP</span>
        <span className="t-val" style={{fontWeight: 'bold'}}><code>{t.sap_code}</code></span>
      </div>
    );

    return fields;
  };

  return (
    <div className="dashboard-root">
      {/* HEADER */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-area">
            <div className="logo-mark">C</div>
            <div className="logo-text">
              <h1>Book NPA</h1>
              <span>GERÊNCIA DE TERMINAIS · D04</span>
            </div>
          </div>
          <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="meta-pill">CLASSIFICAÇÃO: EXTERNA</span>
            <span className="meta-pill">REVISÃO: {revisionDate}</span>
            <span className="version-badge">{docVersion.toUpperCase()}</span>
            
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
            
            <span style={{ color: '#fff', fontSize: '13px' }}>
              Bem-vindo, <strong>{user.username}</strong>
            </span>
            <button onClick={handleLogout} style={{ border: 'none', background: 'rgba(255,77,77,0.15)', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
              <LogOut size={12} /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav className="nav-tabs">
        <div className="nav-inner">
          {tabs.map(tab => {
            if (tab.id === 'upload' && user.role !== 'Admin') return null;
            return (
              <button 
                key={tab.id} 
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                style={tab.customStyle}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'visao-geral' && (
          <div>
            {/* HIGHLIGHT BANNER */}
            <div className="highlight-banner">
              <div className="highlight-banner-text">
                <h2>Book NPA – Equipamentos Cielo</h2>
                <p>Versão {docVersion.replace('v', '')} - Logística | Qualidade Indoor - Atualizado em {revisionDate}</p>
              </div>
              <div className="highlight-banner-right">
                <span className="big-num">{totalModels}</span>
                <span className="small-label">Modelos Ativos</span>
              </div>
            </div>

            <div className="overview-grid">
              <div className="stat-card">
                <div className="stat-icon blue">📟</div>
                <div className="stat-num">{posCount}</div>
                <div className="stat-label">Terminais POS</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">🔐</div>
                <div className="stat-num">{pinpadCount}</div>
                <div className="stat-label">PIN PAD / PIN PAD BT</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">📱</div>
                <div className="stat-num">{smartCount}</div>
                <div className="stat-label">Smart Terminais Cielo</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">📋</div>
                <div className="stat-num">{docVersion.replace('v', '')}</div>
                <div className="stat-label">Versões do Documento</div>
              </div>
            </div>

            {/* CHARTS CONTAINER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Distribuição por Categoria</span></div>
                <div className="card-body" style={{ height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '180px', height: '180px' }}>
                    <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                  <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}><span style={{width:'10px', height:'10px', background:'#0069B4', borderRadius:'50%'}}></span> POS ({posCount})</div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}><span style={{width:'10px', height:'10px', background:'#7C3AED', borderRadius:'50%'}}></span> PIN PAD ({pinpadCount})</div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}><span style={{width:'10px', height:'10px', background:'#059669', borderRadius:'50%'}}></span> Smart ({smartCount})</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">Tipos de Conectividade por Terminal</span></div>
                <div className="card-body" style={{ height: '220px' }}>
                  <Bar data={connChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} />
                </div>
              </div>
            </div>

            {/* MODEL SUMMARY */}
            <div className="card">
              <div className="card-header"><span className="card-title">Resumo de todos os modelos ativos</span></div>
              <div className="card-body" style={{ padding: '0' }}>
                <table className="version-table">
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Nome Cielo</th>
                      <th>Categoria</th>
                      <th>Fabricante</th>
                      <th>Conectividade</th>
                      <th>Material SAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminals.map(t => (
                      <tr key={t.id} onClick={() => setSelectedTerminal(t)} style={{cursor: 'pointer'}}>
                        <td><strong>{t.model}</strong></td>
                        <td>{t.name}</td>
                        <td>
                          <span className={`cat-label ${
                            t.model.toUpperCase() === 'DX8000' 
                              ? 'cat-pos' 
                              : t.category.toLowerCase().includes('smart') 
                                ? 'cat-smart' 
                                : t.category.toLowerCase().includes('pin') 
                                  ? 'cat-pinpad' 
                                  : 'cat-pos'
                          }`}>
                            {t.model.toUpperCase() === 'DX8000' 
                              ? 'POS' 
                              : t.category.toLowerCase().includes('smart') 
                                ? 'Smart' 
                                : t.category.toLowerCase().includes('pin') 
                                  ? 'PIN PAD' 
                                  : 'POS'
                            }
                          </span>
                        </td>
                        <td>{t.manufacturer}</td>
                        <td>
                          <div className="t-conn-badges" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {t.connectivity.split(/[\s,e/&]+/).filter(c => c.trim().length > 1).map((c, i) => {
                              const norm = c.toLowerCase().trim();
                              let badgeClass = 'wifi';
                              if (norm.match(/gprs|3g|4g|cell/)) badgeClass = 'gprs';
                              else if (norm.match(/bluetooth|bt/)) badgeClass = 'bt';
                              else if (norm.match(/usb/)) badgeClass = 'usb';
                              else if (norm.match(/serial/)) badgeClass = 'serial';
                              else if (norm.match(/dual/)) badgeClass = 'dual';
                              return <span key={i} className={`conn-badge ${badgeClass}`}>{c}</span>;
                            })}
                          </div>
                        </td>
                        <td><span className="material-code" style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'var(--text-secondary)' }}>{t.sap_code}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TERMINALS TAB (pos, pinpad, smart) */}
        {['pos', 'pinpad', 'smart'].includes(activeTab) && (
          <div>
            <div className="section-header">
              <div>
                <div className="section-title">
                  {activeTab === 'pos' && 'Terminais POS'}
                  {activeTab === 'pinpad' && 'PIN PAD e PIN PAD Bluetooth'}
                  {activeTab === 'smart' && 'Cielo Smart Terminais'}
                </div>
                <div className="section-sub">
                  {activeTab === 'pos' && `${filteredTerminals().length} modelos ativos — equipamentos para ponto de venda`}
                  {activeTab === 'pinpad' && `${filteredTerminals().length} modelos ativos — captura TEF e TEF Móvel`}
                  {activeTab === 'smart' && `${filteredTerminals().length} modelos ativos — LIO ON, GPOS720, L400 e L300`}
                </div>
              </div>
            </div>

            <div className={`terminal-grid ${activeTab === 'pinpad' ? 'cols-3' : 'cols-4'}`}>
              {filteredTerminals().map(t => (
                <div key={t.id} className="terminal-card" onClick={() => setSelectedTerminal(t)}>
                  <div className="terminal-card-top" style={{ background: getCardGradient(t, activeTab) }}>
                    <div className="t-model">{t.model}</div>
                    <div className="t-name">{t.manufacturer.toUpperCase()} · {t.name.toUpperCase()}</div>
                    <div><span className="t-type-badge">{getTerminalTypeBadge(t)}</span></div>
                  </div>
                  <div className="terminal-card-body">
                    {renderCardFields(t)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Battery bar comparison */}
            {activeTab === 'pos' && (
              <div className="card">
                <div className="card-header"><span className="card-title">Requisito mínimo de bateria — POS</span></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {filteredTerminals().filter(t => t.battery_min > 0).map(t => (
                      <div key={t.id}>
                        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>{t.model}</div>
                        <div className="battery-bar"><div className="battery-fill" style={{ width: `${t.battery_min}%` }}></div></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>Mín. {t.battery_min}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VERSIONS TAB */}
        {activeTab === 'versoes' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Tabela Completa de Versões de Software Cielo</span></div>
            <div className="card-body" style={{ padding: '0' }}>
              <table className="version-table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Fabricante</th>
                    <th>Versão Homologada</th>
                    <th>Conectividade</th>
                    <th>Senha Técnica</th>
                    <th>Material SAP</th>
                    <th>Última Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.model}</strong></td>
                      <td>{t.manufacturer}</td>
                      <td><span className="version-code">{t.software_version || '-'}</span></td>
                      <td>{t.connectivity}</td>
                      <td><code>{t.technical_password || 'N/A'}</code></td>
                      <td><code>{t.sap_code}</code></td>
                      <td>{new Date(t.last_update).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VALIDATION CRITERIA TAB */}
        {activeTab === 'criterios' && (
          <div>
            <div className="section-header">
              <div>
                <div className="section-title">Critério de Validação de Terminais</div>
                <div className="section-sub">Diretrizes comparativas e informativas de itens em conformidade e não conformidade para homologação do Book NPA</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* APPROVED COLUMN */}
              <div className="card" style={{ borderTop: '4px solid #10B981' }}>
                <div className="card-header" style={{ background: '#ECFDF5' }}>
                  <span className="card-title" style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    🟢 CONFORME (Aprovado)
                  </span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                    O equipamento está apto para validação e homologação se atender integralmente a todos os requisitos físicos e lógicos a seguir:
                  </p>
                  
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.8', marginBottom: '20px' }}>
                    <li>✅ <strong>Tela em Perfeito Estado:</strong> Sem trincos, riscos profundos, manchas de cristal líquido ou falhas de pixels.</li>
                    <li>✅ <strong>Teclado Físico Íntegro:</strong> Todas as teclas legíveis, sem desgaste físico e com clique tátil preservado.</li>
                    <li>✅ <strong>Carcaça e Tampa da Bobina:</strong> Plásticos sem rachaduras e tampa da bobina fechando e travando firmemente.</li>
                    <li>✅ <strong>Conectividade Ativa:</strong> Modems WiFi, GPRS/3G/4G e Bluetooth conectando com sucesso na rede de testes.</li>
                    <li>✅ <strong>Parâmetros de Software:</strong> Versão carregada idêntica à versão homologada registrada na Tabela de Versões.</li>
                    <li>✅ <strong>Carga de Bateria:</strong> Bateria com saúde estável e nível de carga acima do mínimo especificado para atualização (30% ou 60%).</li>
                  </ul>

                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#F9FAFB', padding: '10px' }}>
                    <img 
                      src="/validation_approved.png" 
                      alt="Critério Conforme" 
                      style={{ width: '100%', height: 'auto', borderRadius: '6px', objectFit: 'contain', maxHeight: '350px' }} 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                      Demonstração de Terminal em Perfeitas Condições e Prontidão de Software.
                    </div>
                  </div>
                </div>
              </div>

              {/* REJECTED COLUMN */}
              <div className="card" style={{ borderTop: '4px solid #EF4444' }}>
                <div className="card-header" style={{ background: '#FEF2F2' }}>
                  <span className="card-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    🔴 NÃO CONFORME (Reprovado)
                  </span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                    O equipamento deve ser **rejeitado** e enviado para manutenção/troca caso apresente qualquer um dos seguintes defeitos:
                  </p>

                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.8', marginBottom: '20px' }}>
                    <li>❌ <strong>Danificação na Tela:</strong> Vidro trincado, quebrado, manchas escuras por vazamento de cristal ou touch inoperante.</li>
                    <li>❌ <strong>Problemas no Teclado:</strong> Teclas soltas, apagadas, emperradas ou sem feedback de acionamento.</li>
                    <li>❌ <strong>Gabinete Danificado:</strong> Carcaça quebrada, travas soltas ou tampa da bobina que não fecha (impedindo impressão).</li>
                    <li>❌ <strong>Falha de Conectividade:</strong> Terminal incapaz de registrar sinal de rede (SIM card) ou conectar no sinal WiFi local.</li>
                    <li>❌ <strong>Software Incompatível:</strong> Versão instalada desatualizada ou diferente da homologada (exige atualização forçada).</li>
                    <li>❌ <strong>Bateria com Defeito:</strong> Bateria estufada, viciada que não segura carga ou abaixo do mínimo exigido de 30%/60%.</li>
                  </ul>

                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#F9FAFB', padding: '10px' }}>
                    <img 
                      src="/validation_rejected.png" 
                      alt="Critério Não Conforme" 
                      style={{ width: '100%', height: 'auto', borderRadius: '6px', objectFit: 'contain', maxHeight: '350px' }} 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                      Exemplo de Danos Físicos e Alertas Críticos de Rejeição de Terminal.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BATTERY COMPARISON SECTION */}
            <div className="section-header" style={{ marginTop: '40px' }}>
              <div>
                <div className="section-title">Comparativo de Baterias (Conforme vs Não Conforme)</div>
                <div className="section-sub">Diferença visual e diretrizes para identificação de células de bateria saudáveis versus células danificadas ou estufadas</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* APPROVED BATTERY CARD */}
              <div className="card" style={{ borderTop: '4px solid #10B981' }}>
                <div className="card-header" style={{ background: '#ECFDF5' }}>
                  <span className="card-title" style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    🔋 BATERIA CONFORME (Aprovado)
                  </span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                    Célula de bateria em estado íntegro e seguro para operação:
                  </p>
                  
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.8', marginBottom: '20px' }}>
                    <li>✅ <strong>Superfície Plana:</strong> Corpo da bateria totalmente reto e plano, sem qualquer deformação.</li>
                    <li>✅ <strong>Contatos Limpos:</strong> Contatos dourados sem oxidação (zinabre), ferrugem ou arranhões severos.</li>
                    <li>✅ <strong>Encaixe Preciso:</strong> Insere-se suavemente no compartimento e a tampa traseira fecha sem pressão excessiva.</li>
                    <li>✅ <strong>Sem Vazamento:</strong> Sem resíduos químicos ou cheiro doce e pungente característico de vazamento de eletrólito.</li>
                  </ul>

                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#F9FAFB', padding: '10px' }}>
                    <img 
                      src="/battery_approved.png" 
                      alt="Bateria Conforme" 
                      style={{ width: '100%', height: 'auto', borderRadius: '6px', objectFit: 'contain', maxHeight: '250px' }} 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                      Bateria Homologada e Íntegra para Operação Diária.
                    </div>
                  </div>
                </div>
              </div>

              {/* REJECTED BATTERY CARD */}
              <div className="card" style={{ borderTop: '4px solid #EF4444' }}>
                <div className="card-header" style={{ background: '#FEF2F2' }}>
                  <span className="card-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    ⚠️ BATERIA ESTUFADA / NÃO CONFORME (Reprovado)
                  </span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                    A bateria deve ser imediatamente **substituída e descartada** se apresentar:
                  </p>

                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.8', marginBottom: '20px' }}>
                    <li>❌ <strong>Estufamento (Inchaço):</strong> Corpo expandido, apresentando ondulação perceptível ao toque ou visualmente.</li>
                    <li>❌ <strong>Dificuldade no Encaixe:</strong> Tampa traseira do terminal estufa ou não fecha devido ao volume da bateria.</li>
                    <li>❌ <strong>Oxidação nos Pinos:</strong> Presença de crostas verdes (zinabre) ou brancas nos terminais metálicos.</li>
                    <li>❌ <strong>Vazamentos ou Trincas:</strong> Presença de resíduos líquidos ou pó branco na célula, indicando danos químicos graves.</li>
                  </ul>

                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#F9FAFB', padding: '10px' }}>
                    <img 
                      src="/battery_rejected.png" 
                      alt="Bateria Estufada" 
                      style={{ width: '100%', height: 'auto', borderRadius: '6px', objectFit: 'contain', maxHeight: '250px' }} 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                      Risco de Segurança: Célula de Bateria com Inchaço Crítico (Não Utilizar!).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISUAL COSMETIC CRITERIA TAB */}
        {activeTab === 'visual-criterios' && (
          <div className="visual-container">
            <div className="visual-sidebar">
              <h3 className="visual-sidebar-title">Modelos</h3>
              <div className="visual-model-list">
                {['SP930', 'ME60', 'Q92X', 'DX8000', 'PPC930', 'MP15', 'LIO ON', 'GPOS720', 'L400', 'L300', 'N950U', 'N950K'].map((model) => (
                  <button
                    key={model}
                    className={`visual-model-btn ${selectedVisualModel === model ? 'active' : ''}`}
                    onClick={() => setSelectedVisualModel(model)}
                  >
                    <ChevronRight size={16} />
                    <span>{model}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="visual-content">
              <div className="visual-content-header">
                <div>
                  <h2 className="visual-title">Critério Cosmético - {selectedVisualModel}</h2>
                  <p className="visual-subtitle">Guia visual de aceitação e classificação cosmética para o modelo {selectedVisualModel}.</p>
                </div>
                <a
                  href={`/visual/${selectedVisualModel}.pdf`}
                  download={`${selectedVisualModel}_criterio_cosmetico.pdf`}
                  className="visual-download-btn"
                >
                  <FileText size={16} />
                  <span>Baixar PDF</span>
                </a>
              </div>
              <div className="visual-pdf-viewer">
                <iframe
                  src={`/visual/${selectedVisualModel}.pdf#toolbar=0&navpanes=0`}
                  title={`Critério Cosmético ${selectedVisualModel}`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', borderRadius: '8px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* REVISION HISTORY TAB */}
        {activeTab === 'historico' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Linha do Tempo de Revisões Recentes (Documento D04)</span></div>
              <div className="card-body">
                <div className="timeline">
                  {revisions.map((rev, index) => (
                    <div key={rev.id} className="tl-item">
                      <div className={`tl-dot ${index === 0 ? 'latest' : ''}`}></div>
                      <div className="tl-version">Versão {rev.version} {index === 0 ? '— ATUAL' : ''}</div>
                      <div className="tl-date">Revisado em {rev.revision_date}</div>
                      <div className="tl-desc">{rev.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Aprovações do Documento</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--cielo-light)', color: 'var(--cielo-dark)', display: 'flex', alignItems: 'center', justifySpace: 'center', fontWeight: '700', fontSize: '13px', justifyContent: 'center' }}>ES</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>Ermeson Santos</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Elaborador Técnico</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#E8F5E9', color: '#2E7D32', display: 'flex', alignItems: 'center', justifySpace: 'center', fontWeight: '700', fontSize: '13px', justifyContent: 'center' }}>DF</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>Daniel Francisco</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Revisor Operações</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FFF8E1', color: '#F57F17', display: 'flex', alignItems: 'center', justifySpace: 'center', fontWeight: '700', fontSize: '13px', justifyContent: 'center' }}>FC</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>Fabiana Carmelluti</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Aprovadora Logística</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD BOOK TAB */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Importação e Sincronização de Nova Versão do Book (PDF)</span>
              </div>
              <div className="card-body">
                <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6'}}>
                  Arraste ou selecione o novo arquivo PDF do manual **Book NPA** homologado. O sistema lerá e parseará os cabeçalhos, extrairá a nova tabela de versões com os códigos SAP correspondentes e inserirá automaticamente o novo log no histórico de revisões.
                </p>

                {user.role === 'Admin' ? (
                  <div>
                    <div 
                      className="upload-container"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="upload-icon" />
                      <div className="upload-title">
                        {file ? file.name : 'Selecione ou arraste o arquivo PDF do Book'}
                      </div>
                      <div className="upload-subtitle">
                        {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Apenas arquivos PDF (D04)'}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="file-input" 
                        accept="application/pdf"
                      />
                    </div>

                    {file && !uploading && (
                      <button 
                        onClick={handleUploadSubmit}
                        className="auth-btn"
                        style={{ marginTop: '20px' }}
                      >
                        Iniciar Atualização do Banco
                      </button>
                    )}

                    {uploading && (
                      <div className="upload-progress-container">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="progress-text">Analisando e parseando PDF: {uploadProgress}%</div>
                      </div>
                    )}

                    {uploadError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEE2E2', color: '#991B1B', padding: '12px', borderRadius: '8px', marginTop: '20px', fontSize: '13px' }}>
                        <AlertCircle size={16} />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {uploadSummary && (
                      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontWeight: '700', marginBottom: '12px', fontSize: '14px' }}>
                          <CheckCircle2 size={18} />
                          <span>Book Importado com Sucesso!</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#047857', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div>• Nova versão identificada: <strong>v{uploadSummary.documentVersion}</strong></div>
                          <div>• Data de revisão técnica: <strong>{uploadSummary.documentDate}</strong></div>
                          <div>• Total de terminais atualizados: <strong>{uploadSummary.terminalsParsed} modelos</strong></div>
                          <div>• Log de revisões processado: <strong>{uploadSummary.revisionsFound} itens</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFBEB', color: '#92400E', padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
                    <AlertCircle size={16} />
                    <span>Apenas usuários administradores (Admin) podem enviar atualizações de documento. Seu perfil atual é: <strong>{user.role}</strong>.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ASSISTANT IA TAB */}
        {activeTab === 'assistente' && (
          <div className="chatbot-container">
            <div className="chat-window">
              <div className="chat-header">
                <div className="chat-avatar">🤖</div>
                <div>
                  <div className="chat-title">NPA Assistente</div>
                  <div className="chat-status"><span style={{display: 'inline-block', width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', marginRight: '6px'}}></span>Online · Book NPA {docVersion}</div>
                </div>
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`chat-bubble ${msg.sender}`}
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                ))}
                {chatLoading && (
                  <div className="chat-bubble bot" style={{ display: 'flex', gap: '4px', padding: '10px 14px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#8A98AC', borderRadius: '50%', animation: 'bounce 1s infinite alternate' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#8A98AC', borderRadius: '50%', animation: 'bounce 1s infinite alternate 0.2s' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#8A98AC', borderRadius: '50%', animation: 'bounce 1s infinite alternate 0.4s' }}></span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="chat-suggestions">
                <button className="chat-sug-btn" onClick={() => handleChatSend('Qual a versão de software atual do LIO ON?')}>Versão LIO ON</button>
                <button className="chat-sug-btn" onClick={() => handleChatSend('Quais terminais possuem Bluetooth?')}>Bluetooth</button>
                <button className="chat-sug-btn" onClick={() => handleChatSend('Qual a senha técnica do SP930?')}>Senha SP930</button>
                <button className="chat-sug-btn" onClick={() => handleChatSend('Qual o código SAP do DX8000?')}>SAP DX8000</button>
                <button className="chat-sug-btn" onClick={() => handleChatSend('Quais os requisitos de bateria para POS?')}>Requisitos Bateria</button>
              </div>

              <div className="chat-input-area">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="Pergunte sobre qualquer terminal, SAP, senha ou versão..." 
                  className="chat-input"
                  disabled={chatLoading}
                />
                <button 
                  onClick={() => handleChatSend()}
                  className="chat-send-btn"
                  disabled={chatLoading}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="card">
                <div className="card-header"><span className="card-title">Perguntas Rápidas</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="chat-sug-btn" style={{textAlign: 'left', borderRadius: '8px'}} onClick={() => handleChatSend('Quais os terminais com bateria mínima de 60%?')}>Terminais com bateria mín. 60%</button>
                  <button className="chat-sug-btn" style={{textAlign: 'left', borderRadius: '8px'}} onClick={() => handleChatSend('Qual a versão de software homologada para o L300?')}>Software do terminal L300</button>
                  <button className="chat-sug-btn" style={{textAlign: 'left', borderRadius: '8px'}} onClick={() => handleChatSend('Me mostre o código SAP do N950U.')}>Código SAP do N950U</button>
                  <button className="chat-sug-btn" style={{textAlign: 'left', borderRadius: '8px'}} onClick={() => handleChatSend('Como ligar e desligar o terminal ME60?')}>Como operar o ME60</button>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header"><span className="card-title">Cobertura</span></div>
                <div className="card-body" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                  O assistente realiza buscas estruturadas diretamente no banco de dados para os <strong>{totalModels} terminais ativos</strong>, cobrindo:<br/><br/>
                  ✅ Códigos SAP de hardware/manuais<br/>
                  ✅ Senhas de acesso técnico<br/>
                  ✅ Requisitos mínimos de bateria<br/>
                  ✅ Versões homologadas em tempo real<br/>
                  ✅ Procedimentos de operação rápida
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* DETAIL MODAL OVERLAY */}
      <div className={`modal-overlay ${selectedTerminal ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && setSelectedTerminal(null)}>
        {selectedTerminal && (
          <div className="modal-box">
            <div className="modal-head">
              <button className="modal-close" onClick={() => setSelectedTerminal(null)}>✕</button>
              <div className="modal-title">{selectedTerminal.model}</div>
              <div className="modal-subtitle">{selectedTerminal.manufacturer.toUpperCase()} · {selectedTerminal.name.toUpperCase()}</div>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-section-title">Hardware</div>
                <div className="modal-row"><span className="modal-key">Fabricante</span><span className="modal-val">{selectedTerminal.manufacturer}</span></div>
                <div className="modal-row"><span className="modal-key">Conectividade</span><span className="modal-val">{selectedTerminal.connectivity}</span></div>
                <div className="modal-row"><span className="modal-key">Código SAP</span><span className="modal-val"><code>{selectedTerminal.sap_code}</code></span></div>
                <div className="modal-row"><span className="modal-key">Senha Técnica</span><span className="modal-val"><code>{selectedTerminal.technical_password}</code></span></div>
                <div className="modal-row"><span className="modal-key">Bateria Mínima</span><span className="modal-val">{selectedTerminal.battery_min ? `${selectedTerminal.battery_min}%` : 'N/A'}</span></div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title">Software</div>
                <div className="modal-row"><span className="modal-key">Versão Homologada</span><span className="modal-val"><span className="version-code">{selectedTerminal.software_version || '-'}</span></span></div>
                <div className="modal-row"><span className="modal-key">Categoria</span><span className="modal-val">{selectedTerminal.category}</span></div>
                <div className="modal-row"><span className="modal-key">Última Modificação</span><span className="modal-val">{new Date(selectedTerminal.last_update).toLocaleDateString('pt-BR')}</span></div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title">Operação Básica</div>
                <div className="modal-row"><span className="modal-key">Como Ligar</span><span className="modal-val">{getOpGuide(selectedTerminal).ligar}</span></div>
                <div className="modal-row"><span className="modal-key">Como Desligar</span><span className="modal-val">{getOpGuide(selectedTerminal).desligar}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB FLUTUANTE */}
      <button className="agent-fab" onClick={() => setIsAgentOpen(prev => !prev)} id="agentFab" title="Assistente Book NPA">
        🤖
        <span className="notif" id="agentNotif" style={{ display: chatMessages.length > 1 ? 'none' : 'block' }}></span>
      </button>

      {/* PAINEL FLUTUANTE */}
      <div className={`agent-panel ${isAgentOpen ? 'open' : ''}`} id="agentPanel">
        <div className="agent-head">
          <div className="agent-avatar">🤖</div>
          <div className="agent-head-info">
            <div className="agent-head-name">NPA Assistente</div>
            <div className="agent-head-status">
              <span className="status-dot"></span>Online · Book NPA {docVersion}
            </div>
          </div>
          <button className="agent-close-btn" onClick={() => setIsAgentOpen(false)}>✕</button>
        </div>
        <div className="agent-messages">
          {chatMessages.map((msg, i) => (
            <div 
              key={i} 
              className={`msg ${msg.sender}`}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          ))}
          {chatLoading && (
            <div className="msg bot typing">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={floatingChatEndRef} />
        </div>
        <div className="agent-suggestions">
          <span className="sug-chip" onClick={() => handleChatSend('Qual a versão do LIO ON?')}>LIO ON versão</span>
          <span className="sug-chip" onClick={() => handleChatSend('Quais terminais possuem Bluetooth?')}>Bluetooth</span>
          <span className="sug-chip" onClick={() => handleChatSend('Qual a senha técnica do SP930?')}>Senha SP930</span>
          <span className="sug-chip" onClick={() => handleChatSend('Qual a diferença entre L300 e L400?')}>L300 vs L400</span>
        </div>
        <div className="agent-input-row">
          <input 
            className="agent-input" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
            placeholder="Pergunte sobre os terminais..."
          />
          <button className="agent-send" onClick={() => handleChatSend()} disabled={chatLoading}>
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
