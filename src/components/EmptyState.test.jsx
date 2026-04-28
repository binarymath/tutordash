// src/components/EmptyState.test.jsx
// Testes do componente EmptyState — cobre as duas variantes de UI:
//   1. canLoad=false → botão "Acrescentar Links"
//   2. canLoad=true  → botão "Iniciar Sincronização"

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  // ── Renderização base ────────────────────────────────────────
  it('renderiza o título "Workspace 360º"', () => {
    render(<EmptyState canLoad={false} onOpenSettings={vi.fn()} />);
    expect(screen.getByText('Workspace 360º')).toBeInTheDocument();
  });

  // ── Variante sem dados configurados (canLoad=false) ──────────
  describe('quando canLoad=false (planilhas não configuradas)', () => {
    it('exibe a mensagem de instruções para conectar dados', () => {
      render(<EmptyState canLoad={false} onOpenSettings={vi.fn()} />);
      expect(screen.getByText(/adicione os links das suas planilhas/i)).toBeInTheDocument();
    });

    it('exibe o botão "Acrescentar Links"', () => {
      render(<EmptyState canLoad={false} onOpenSettings={vi.fn()} />);
      expect(screen.getByRole('button', { name: /acrescentar links/i })).toBeInTheDocument();
    });

    it('chama onOpenSettings ao clicar em "Acrescentar Links"', () => {
      const onOpenSettings = vi.fn();
      render(<EmptyState canLoad={false} onOpenSettings={onOpenSettings} />);
      fireEvent.click(screen.getByRole('button', { name: /acrescentar links/i }));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('não exibe o botão "Iniciar Sincronização"', () => {
      render(<EmptyState canLoad={false} onOpenSettings={vi.fn()} />);
      expect(screen.queryByText(/iniciar sincronização/i)).not.toBeInTheDocument();
    });
  });

  // ── Variante com dados prontos (canLoad=true) ────────────────
  describe('quando canLoad=true (planilhas configuradas)', () => {
    it('exibe a mensagem de boas-vindas com planilhas prontas', () => {
      render(<EmptyState canLoad={true} isLoading={false} onLoad={vi.fn()} />);
      expect(screen.getByText(/suas planilhas estão configuradas/i)).toBeInTheDocument();
    });

    it('exibe o botão "Iniciar Sincronização"', () => {
      render(<EmptyState canLoad={true} isLoading={false} onLoad={vi.fn()} />);
      expect(screen.getByRole('button', { name: /iniciar sincronização/i })).toBeInTheDocument();
    });

    it('chama onLoad(false) ao clicar em "Iniciar Sincronização"', () => {
      const onLoad = vi.fn();
      render(<EmptyState canLoad={true} isLoading={false} onLoad={onLoad} />);
      fireEvent.click(screen.getByRole('button', { name: /iniciar sincronização/i }));
      expect(onLoad).toHaveBeenCalledWith(false);
    });

    it('desabilita o botão quando isLoading=true', () => {
      render(<EmptyState canLoad={true} isLoading={true} onLoad={vi.fn()} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('exibe indicador de loading (spinner) quando isLoading=true', () => {
      render(<EmptyState canLoad={true} isLoading={true} onLoad={vi.fn()} />);
      // O spinner SVG é renderizado pelo Loader2 do lucide-react
      const btn = screen.getByRole('button');
      expect(btn.querySelector('svg')).toBeTruthy();
    });

    it('não exibe o botão "Acrescentar Links"', () => {
      render(<EmptyState canLoad={true} isLoading={false} onLoad={vi.fn()} />);
      expect(screen.queryByText(/acrescentar links/i)).not.toBeInTheDocument();
    });
  });
});
