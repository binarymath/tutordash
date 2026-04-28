// src/components/ConfigModal.test.jsx
// Testes abrangentes do ConfigModal — renderização, inputs, salvar,
// perfis múltiplos, criação de perfil e loading state.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigModal from './ConfigModal';

// ── Dados de teste ────────────────────────────────────────────────────────────

const defaultProfiles = {
  Principal: {
    studentsUrl: 'https://sheet.example/students',
    notesUrl: 'https://sheet.example/notes',
    provaUrl: 'https://sheet.example/prova',
    conceitoUrl: 'https://sheet.example/conceito',
    formLink: 'https://forms.google.com/abc',
  },
};

const defaultProps = {
  activeProfile: 'Principal',
  profiles: defaultProfiles,
  changeProfile: vi.fn(),
  saveProfile: vi.fn(),
  onClose: vi.fn(),
  onLoad: vi.fn(),
  isLoading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Garante que window.prompt retorna null por padrão
  global.prompt = vi.fn().mockReturnValue(null);
});

// ── Renderização base ─────────────────────────────────────────────────────────

describe('ConfigModal — renderização', () => {
  it('exibe o título "Configuração 360º"', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText(/configuração 360º/i)).toBeInTheDocument();
  });

  it('exibe botão de fechar', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getAllByRole('button')[0]).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão X', () => {
    const onClose = vi.fn();
    render(<ConfigModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe labels de configuração', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText(/tutoria/i)).toBeInTheDocument();
    expect(screen.getByText(/planilha de anotações/i)).toBeInTheDocument();
    expect(screen.getByText(/prova paulista/i)).toBeInTheDocument();
    expect(screen.getByText(/histórico bimestral/i)).toBeInTheDocument();
  });
});

// ── Inputs de URL ─────────────────────────────────────────────────────────────

describe('ConfigModal — inputs de URL', () => {
  it('pré-preenche o campo de Tutoria com a URL salva', () => {
    render(<ConfigModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/link \(qualquer ficheiro sheets\)/i);
    expect(input.value).toBe('https://sheet.example/students');
  });

  it('pré-preenche o campo de Anotações', () => {
    render(<ConfigModal {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/link\.\.\./i);
    expect(inputs[0].value).toBe('https://sheet.example/notes');
  });

  it('pré-preenche o campo de Prova Paulista', () => {
    render(<ConfigModal {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/link\.\.\./i);
    expect(inputs[1].value).toBe('https://sheet.example/prova');
  });

  it('pré-preenche o campo de Histórico Bimestral', () => {
    render(<ConfigModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/link da folha de cálculo/i);
    expect(input.value).toBe('https://sheet.example/conceito');
  });

  it('pré-preenche o campo de Link do Forms', () => {
    render(<ConfigModal {...defaultProps} />);
    const formInput = screen.getByPlaceholderText(/cole o link do seu google forms/i);
    expect(formInput.value).toBe('https://forms.google.com/abc');
  });

  it('atualiza o campo de Tutoria ao digitar', () => {
    render(<ConfigModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/link \(qualquer ficheiro sheets\)/i);
    fireEvent.change(input, { target: { value: 'https://nova-url.com' } });
    expect(input.value).toBe('https://nova-url.com');
  });

  it('atualiza o campo de Anotações ao digitar', () => {
    render(<ConfigModal {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/link\.\.\./i);
    fireEvent.change(inputs[0], { target: { value: 'https://notas-url.com' } });
    expect(inputs[0].value).toBe('https://notas-url.com');
  });

  it('atualiza o campo de Prova Paulista ao digitar', () => {
    render(<ConfigModal {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/link\.\.\./i);
    fireEvent.change(inputs[1], { target: { value: 'https://prova-url.com' } });
    expect(inputs[1].value).toBe('https://prova-url.com');
  });

  it('atualiza o campo de Conceito ao digitar', () => {
    render(<ConfigModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/link da folha de cálculo/i);
    fireEvent.change(input, { target: { value: 'https://conceito-url.com' } });
    expect(input.value).toBe('https://conceito-url.com');
  });

  it('atualiza o campo de Forms ao digitar', () => {
    render(<ConfigModal {...defaultProps} />);
    const formInput = screen.getByPlaceholderText(/cole o link do seu google forms/i);
    fireEvent.change(formInput, { target: { value: 'https://forms.google.com/xyz' } });
    expect(formInput.value).toBe('https://forms.google.com/xyz');
  });
});

// ── Botão Salvar e Sincronizar ────────────────────────────────────────────────

describe('ConfigModal — botão Salvar', () => {
  it('está habilitado quando studentsUrl está preenchida', () => {
    render(<ConfigModal {...defaultProps} />);
    const saveBtn = screen.getByText(/salvar e sincronizar/i).closest('button');
    expect(saveBtn).not.toBeDisabled();
  });

  it('está desabilitado quando studentsUrl está vazia', () => {
    const profiles = { Principal: { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' } };
    render(<ConfigModal {...defaultProps} profiles={profiles} />);
    const saveBtn = screen.getByText(/salvar e sincronizar/i).closest('button');
    expect(saveBtn).toBeDisabled();
  });

  it('está desabilitado quando isLoading=true', () => {
    render(<ConfigModal {...defaultProps} isLoading={true} />);
    const allBtns = screen.getAllByRole('button');
    const saveBtn = allBtns[allBtns.length - 1];
    expect(saveBtn).toBeDisabled();
  });

  it('chama saveProfile, onLoad e onClose ao salvar', () => {
    const saveProfile = vi.fn();
    const onLoad = vi.fn();
    const onClose = vi.fn();
    render(<ConfigModal {...defaultProps} saveProfile={saveProfile} onLoad={onLoad} onClose={onClose} />);
    fireEvent.click(screen.getByText(/salvar e sincronizar/i).closest('button'));
    expect(saveProfile).toHaveBeenCalledWith('Principal', expect.objectContaining({
      studentsUrl: 'https://sheet.example/students',
    }));
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('salva com dados editados no formulário', () => {
    const saveProfile = vi.fn();
    render(<ConfigModal {...defaultProps} saveProfile={saveProfile} />);
    const input = screen.getByPlaceholderText(/link \(qualquer ficheiro sheets\)/i);
    fireEvent.change(input, { target: { value: 'https://editada.com' } });
    fireEvent.click(screen.getByText(/salvar e sincronizar/i).closest('button'));
    expect(saveProfile).toHaveBeenCalledWith('Principal', expect.objectContaining({
      studentsUrl: 'https://editada.com',
    }));
  });
});

// ── Tabs de perfis ────────────────────────────────────────────────────────────

describe('ConfigModal — tabs de perfis', () => {
  it('exibe a tab do perfil ativo', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByText('Principal')).toBeInTheDocument();
  });

  it('exibe múltiplos perfis como tabs', () => {
    const multiProfiles = {
      Principal: { studentsUrl: 'https://a.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
      Secundário: { studentsUrl: 'https://b.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
    };
    render(<ConfigModal {...defaultProps} profiles={multiProfiles} />);
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Secundário')).toBeInTheDocument();
  });

  it('chama changeProfile ao clicar em outra tab', () => {
    const changeProfile = vi.fn();
    const multiProfiles = {
      Principal: { studentsUrl: 'https://a.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
      Secundário: { studentsUrl: 'https://b.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
    };
    render(<ConfigModal {...defaultProps} profiles={multiProfiles} changeProfile={changeProfile} />);
    fireEvent.click(screen.getByText('Secundário'));
    expect(changeProfile).toHaveBeenCalledWith('Secundário');
  });

  it('exibe botão "+" para criar novo perfil', () => {
    render(<ConfigModal {...defaultProps} />);
    expect(screen.getByTitle('Novo Perfil')).toBeInTheDocument();
  });

  it('abre prompt ao clicar no botão "+"', () => {
    render(<ConfigModal {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Novo Perfil'));
    expect(global.prompt).toHaveBeenCalled();
  });

  it('não cria perfil quando prompt é cancelado (retorna null)', () => {
    global.prompt = vi.fn().mockReturnValue(null);
    const changeProfile = vi.fn();
    const saveProfile = vi.fn();
    render(<ConfigModal {...defaultProps} changeProfile={changeProfile} saveProfile={saveProfile} />);
    fireEvent.click(screen.getByTitle('Novo Perfil'));
    expect(changeProfile).not.toHaveBeenCalled();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('não cria perfil quando prompt retorna nome vazio', () => {
    global.prompt = vi.fn().mockReturnValue('   ');
    const changeProfile = vi.fn();
    render(<ConfigModal {...defaultProps} changeProfile={changeProfile} />);
    fireEvent.click(screen.getByTitle('Novo Perfil'));
    expect(changeProfile).not.toHaveBeenCalled();
  });

  it('cria novo perfil quando prompt retorna nome válido', () => {
    global.prompt = vi.fn().mockReturnValue('Novo Perfil');
    const changeProfile = vi.fn();
    // O componente chama changeProfile com o nome (não saveProfile)
    render(<ConfigModal {...defaultProps} changeProfile={changeProfile} />);
    fireEvent.click(screen.getByTitle('Novo Perfil'));
    expect(changeProfile).toHaveBeenCalledWith('Novo Perfil');
  });
});

// ── Troca de perfil ativo ─────────────────────────────────────────────────────

describe('ConfigModal — troca de perfil ativo', () => {
  it('atualiza os inputs quando o perfil ativo muda via props', () => {
    const multiProfiles = {
      Principal: { studentsUrl: 'https://a.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
      Secundário: { studentsUrl: 'https://b.com', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' },
    };
    const { rerender } = render(
      <ConfigModal {...defaultProps} profiles={multiProfiles} activeProfile="Principal" />
    );
    expect(screen.getByPlaceholderText(/link \(qualquer ficheiro sheets\)/i).value).toBe('https://a.com');

    rerender(
      <ConfigModal {...defaultProps} profiles={multiProfiles} activeProfile="Secundário" />
    );
    expect(screen.getByPlaceholderText(/link \(qualquer ficheiro sheets\)/i).value).toBe('https://b.com');
  });
});
