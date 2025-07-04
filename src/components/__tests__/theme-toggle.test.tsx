import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeToggle } from '../theme-toggle';
import { ThemeProvider } from '../theme-provider';

// Mock do hook useTheme
const mockSetTheme = vi.fn();
vi.mock('../theme-provider', async () => {
  const actual = await vi.importActual('../theme-provider');
  return {
    ...actual,
    useTheme: () => ({
      theme: 'light',
      setTheme: mockSetTheme,
    }),
  };
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it('deve renderizar o botão de toggle', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('deve mostrar ícone apropriado para o tema atual', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    
    // Verificar se há um ícone (svg) dentro do botão
    const icon = toggleButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('deve ser um botão clicável', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeEnabled();
  });
}); 