// src/components/Header.test.jsx
// Testes do componente Header — renderização e interações básicas de UI.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';

// Props mínimas que o Header precisa para renderizar sem erros
const defaultProps = {
  selectedStudent: null,
  studentProfile: null,
  prevStudent: null,
  nextStudent: null,
  setSelectedStudent: vi.fn(),
  isSyncing: false,
  onRefresh: vi.fn(),
  config: {},
  onOpenSettings: vi.fn(),
  showStickyName: false,
};

describe('Header', () => {
  it('renderiza o título "TutorDash"', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('TutorDash')).toBeInTheDocument();
  });

  it('renderiza o botão de configurações', () => {
    render(<Header {...defaultProps} />);
    // O botão de settings não tem texto — busca pelo role
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('chama onOpenSettings ao clicar no botão de configurações', () => {
    const onOpenSettings = vi.fn();
    render(<Header {...defaultProps} onOpenSettings={onOpenSettings} />);

    // O botão de settings não tem `title` — é o único botão sem título
    // mas quando onRefresh está presente, buscamos pelo que não tem title
    const allButtons = screen.getAllByRole('button');
    // O botão settings é sempre o último no grupo de ações à direita
    const settingsBtn = allButtons[allButtons.length - 1];
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renderiza botão de refresh quando onRefresh é fornecido', () => {
    render(<Header {...defaultProps} onRefresh={vi.fn()} />);
    const refreshBtn = screen.getByTitle('Atualizar dados em segundo plano');
    expect(refreshBtn).toBeInTheDocument();
  });

  it('desabilita o botão de refresh quando isSyncing=true', () => {
    render(<Header {...defaultProps} isSyncing={true} />);
    const refreshBtn = screen.getByTitle('Atualizar dados em segundo plano');
    expect(refreshBtn).toBeDisabled();
  });

  it('não mostra link de anotações quando config.formLink não está definido', () => {
    render(<Header {...defaultProps} config={{}} />);
    expect(screen.queryByText(/anotações/i)).not.toBeInTheDocument();
  });

  it('mostra link de anotações quando config.formLink está definido', () => {
    render(<Header {...defaultProps} config={{ formLink: 'https://forms.google.com/123' }} />);
    expect(screen.getByText(/anotações/i)).toBeInTheDocument();
  });

  it('renderiza o botão Adicionar ao lado esquerdo de anotações', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('chama onOpenLinksModal ao clicar no botão Adicionar', () => {
    const onOpenLinksModal = vi.fn();
    render(<Header {...defaultProps} onOpenLinksModal={onOpenLinksModal} />);
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(onOpenLinksModal).toHaveBeenCalledTimes(1);
  });

  it('não renderiza os botões Adicionar e Configurações quando hasLgpdConsent=false', () => {
    render(<Header {...defaultProps} hasLgpdConsent={false} />);
    expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /configurações/i })).not.toBeInTheDocument();
  });

  it('não renderiza os botões Adicionar e Configurações quando showActions=false (tela inicial)', () => {
    render(<Header {...defaultProps} hasLgpdConsent={true} showActions={false} />);
    expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /configurações/i })).not.toBeInTheDocument();
  });

  it('não exibe navegação de aluno quando selectedStudent é null', () => {
    render(<Header {...defaultProps} selectedStudent={null} showStickyName={false} />);
    expect(screen.queryByTitle('Aluno Anterior')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Próximo Aluno')).not.toBeInTheDocument();
  });

  it('exibe nome do aluno no header sticky quando showStickyName=true', () => {
    render(
      <Header
        {...defaultProps}
        selectedStudent={{ id: 1 }}
        studentProfile={{ nome: 'João Silva' }}
        showStickyName={true}
      />
    );
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('botão "Próximo Aluno" está desabilitado quando nextStudent é null', () => {
    render(
      <Header
        {...defaultProps}
        selectedStudent={{ id: 1 }}
        studentProfile={{ nome: 'João Silva' }}
        showStickyName={true}
        nextStudent={null}
      />
    );
    const nextBtn = screen.getByTitle('Próximo Aluno');
    expect(nextBtn).toBeDisabled();
  });

  it('botão "Aluno Anterior" está desabilitado quando prevStudent é null', () => {
    render(
      <Header
        {...defaultProps}
        selectedStudent={{ id: 1 }}
        studentProfile={{ nome: 'João Silva' }}
        showStickyName={true}
        prevStudent={null}
      />
    );
    const prevBtn = screen.getByTitle('Aluno Anterior');
    expect(prevBtn).toBeDisabled();
  });

  it('chama setSelectedStudent com nextStudent ao clicar em "Próximo"', () => {
    const setSelectedStudent = vi.fn();
    const next = { id: 2 };
    render(
      <Header
        {...defaultProps}
        selectedStudent={{ id: 1 }}
        studentProfile={{ nome: 'João Silva' }}
        showStickyName={true}
        nextStudent={next}
        setSelectedStudent={setSelectedStudent}
      />
    );
    fireEvent.click(screen.getByTitle('Próximo Aluno'));
    expect(setSelectedStudent).toHaveBeenCalledWith(next);
  });

  it('chama setSelectedStudent com prevStudent ao clicar em "Anterior"', () => {
    const setSelectedStudent = vi.fn();
    const prev = { id: 0 };
    render(
      <Header
        {...defaultProps}
        selectedStudent={{ id: 1 }}
        studentProfile={{ nome: 'João Silva' }}
        showStickyName={true}
        prevStudent={prev}
        setSelectedStudent={setSelectedStudent}
      />
    );
    fireEvent.click(screen.getByTitle('Aluno Anterior'));
    expect(setSelectedStudent).toHaveBeenCalledWith(prev);
  });

  it('exibe seletor de períodos quando há múltiplos períodos e permite alternar', () => {
    const onChangeProfile = vi.fn();
    const profiles = {
      Principal: { studentsUrl: '' },
      'Ensino Médio': { studentsUrl: '' }
    };
    render(
      <Header
        {...defaultProps}
        activeProfile="Principal"
        profiles={profiles}
        onChangeProfile={onChangeProfile}
      />
    );

    expect(screen.getByRole('button', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ensino Médio' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ensino Médio' }));
    expect(onChangeProfile).toHaveBeenCalledWith('Ensino Médio');
  });

  it('renderiza links adicionais rápidos do período ativo', () => {
    const configWithLinks = {
      customLinks: [
        { id: '1', title: 'Drive da Turma', url: 'https://drive.google.com/xyz' }
      ]
    };
    render(
      <Header
        {...defaultProps}
        config={configWithLinks}
        showActions={true}
      />
    );

    const link = screen.getByText('Drive da Turma');
    expect(link).toBeInTheDocument();
  });

  it('NÃO renderiza a tag "Gestão Escolar"', () => {
    render(<Header {...defaultProps} />);
    expect(screen.queryByText(/Gestão Escolar/i)).not.toBeInTheDocument();
  });

  it('permite renomear período chamando onRenameProfile via modal discreto', () => {
    const onRenameProfile = vi.fn();
    const profiles = {
      Principal: { studentsUrl: '' },
      'Ensino Fundamental': { studentsUrl: '' }
    };

    render(
      <Header
        {...defaultProps}
        activeProfile="Principal"
        profiles={profiles}
        onRenameProfile={onRenameProfile}
      />
    );

    const renameBtn = screen.getByRole('button', { name: /renomear principal/i });
    expect(renameBtn).toBeInTheDocument();
    fireEvent.click(renameBtn);

    expect(screen.getByText('Renomear Período')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Ex: Ensino Médio');
    fireEvent.change(input, { target: { value: 'Ensino Médio' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onRenameProfile).toHaveBeenCalledWith('Principal', 'Ensino Médio');
  });
});

