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
    expect(screen.queryByText(/link anotações/i)).not.toBeInTheDocument();
  });

  it('mostra link de anotações quando config.formLink está definido', () => {
    render(<Header {...defaultProps} config={{ formLink: 'https://forms.google.com/123' }} />);
    expect(screen.getByText(/link anotações/i)).toBeInTheDocument();
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
});
