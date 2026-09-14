import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  User, UserPlus, Edit2, Trash2, Key, Shield, 
  CheckCircle2, AlertCircle, Eye, EyeOff, Search, Lock, X 
} from 'lucide-react';

const UserManager = ({ currentUser, onCurrentUserUpdate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Operador'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setFormData({ username: '', password: '', role: 'Operador' });
    setFormError('');
    setFormSuccess('');
    setShowPassword(false);
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setFormError('');
    setFormSuccess('');
    setShowPassword(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await api.post('/users', formData);
      setFormSuccess(res.data.message || 'Login criado com sucesso!');
      setTimeout(() => {
        setShowCreateModal(false);
        fetchUsers();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao criar login.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        username: formData.username,
        role: formData.role
      };
      if (formData.password && formData.password.trim().length > 0) {
        payload.password = formData.password;
      }

      const res = await api.put(`/users/${editingUser.id}`, payload);
      setFormSuccess(res.data.message || 'Login atualizado com sucesso!');

      // Se o usuário editado for o usuário atualmente logado, atualiza o estado global
      if (currentUser && currentUser.id === editingUser.id && onCurrentUserUpdate) {
        onCurrentUserUpdate(res.data.user);
      }

      setTimeout(() => {
        setEditingUser(null);
        fetchUsers();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao atualizar login.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setFormLoading(true);

    try {
      await api.delete(`/users/${deletingUser.id}`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-manager-container">
      {/* HEADER DA ABA */}
      <div className="um-header-card">
        <div>
          <h2 className="um-title">Gestão de Logins e Acessos</h2>
          <p className="um-subtitle">
            Crie, altere senhas e edite as permissões de acesso ao Book NPA.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <UserPlus size={18} /> Novo Login
        </button>
      </div>

      {/* CONTROLES E BUSCA */}
      <div className="um-controls-row">
        <div className="um-search-box">
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por usuário ou perfil..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="um-badge-count">
          Total de Logins: <strong>{users.length}</strong>
        </div>
      </div>

      {/* TABELA DE USUÁRIOS */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando lista de logins...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum login encontrado.
          </div>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil de Acesso</th>
                <th>Data de Criação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = currentUser && currentUser.id === u.id;
                let roleClass = 'role-badge-user';
                if (u.role === 'Admin') roleClass = 'role-badge-admin';
                else if (u.role === 'Operador') roleClass = 'role-badge-operator';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="um-user-cell">
                        <div className="um-avatar-circle">
                          <User size={16} />
                        </div>
                        <div className="um-user-info">
                          <span className="um-username">{u.username}</span>
                          {isSelf && <span className="um-self-tag">(Você)</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${roleClass}`}>
                        <Shield size={12} style={{ marginRight: '4px' }} />
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="um-actions-group">
                        <button 
                          className="btn-edit-user" 
                          onClick={() => openEditModal(u)}
                          title="Editar Login / Senha"
                        >
                          <Edit2 size={15} /> Editar
                        </button>
                        <button 
                          className="btn-delete-user" 
                          onClick={() => setDeletingUser(u)}
                          disabled={isSelf}
                          title={isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir Login'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CRIAR NOVO LOGIN */}
      {showCreateModal && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowCreateModal(false)}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-head">
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
              <div className="modal-title">Novo Login</div>
              <div className="modal-subtitle">Cadastre um novo usuário para acesso à plataforma</div>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="modal-body" style={{ padding: '24px' }}>
              {formError && (
                <div className="um-alert-error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="um-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="um-form-group">
                <label>Nome de Usuário (Login)</label>
                <div className="um-input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: joao.silva" 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="um-form-group">
                <label>Senha de Acesso</label>
                <div className="um-input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    minLength={6}
                    placeholder="Mínimo 6 caracteres" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button 
                    type="button" 
                    className="input-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="um-form-group">
                <label>Perfil de Acesso</label>
                <div className="um-input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="um-select"
                  >
                    <option value="Operador">Operador (Visualização e consultas)</option>
                    <option value="Admin">Administrador (Acesso total e gestão)</option>
                    <option value="Visualizador">Visualizador (Somente leitura)</option>
                  </select>
                </div>
              </div>

              <div className="um-modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Salvando...' : 'Criar Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR LOGIN */}
      {editingUser && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && setEditingUser(null)}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-head">
              <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
              <div className="modal-title">Editar Login</div>
              <div className="modal-subtitle">Atualizar credenciais de <strong>{editingUser.username}</strong></div>
            </div>
            
            <form onSubmit={handleEditSubmit} className="modal-body" style={{ padding: '24px' }}>
              {formError && (
                <div className="um-alert-error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="um-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="um-form-group">
                <label>Nome de Usuário (Login)</label>
                <div className="um-input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    required 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="um-form-group">
                <label>Nova Senha <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(deixe vazio para não alterar)</span></label>
                <div className="um-input-with-icon">
                  <Key size={18} className="input-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    minLength={6}
                    placeholder="Digite nova senha para alterar..." 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button 
                    type="button" 
                    className="input-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="um-form-group">
                <label>Perfil de Acesso</label>
                <div className="um-input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="um-select"
                  >
                    <option value="Operador">Operador (Visualização e consultas)</option>
                    <option value="Admin">Administrador (Acesso total e gestão)</option>
                    <option value="Visualizador">Visualizador (Somente leitura)</option>
                  </select>
                </div>
              </div>

              <div className="um-modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setEditingUser(null)}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingUser && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && setDeletingUser(null)}>
          <div className="modal-box" style={{ maxWidth: '400px' }}>
            <div className="modal-head" style={{ borderBottomColor: 'rgba(239,68,68,0.2)' }}>
              <button className="modal-close" onClick={() => setDeletingUser(null)}>✕</button>
              <div className="modal-title" style={{ color: '#DC2626' }}>Excluir Login</div>
              <div className="modal-subtitle">Confirmação de exclusão permanente</div>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
                Tem certeza que deseja remover o login <strong>"{deletingUser.username}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="um-modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setDeletingUser(null)}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={formLoading}
                >
                  {formLoading ? 'Excluindo...' : 'Excluir Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManager;
