import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComprarCreditosPage from '../comprar-creditos-page';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock do hook de pacotes
vi.mock('@/hooks/queries/use-fetch-listable-pacotes.hook', () => ({
  useFetchListablePacotes: () => ({
    data: [
      { id: '1', nome: 'Pacote Básico', valor: 10, creditos_oferecidos: 100 },
      { id: '2', nome: 'Pacote Premium', valor: 50, creditos_oferecidos: 600 }
    ],
    isLoading: false,
    isError: false
  })
}));

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'cliente@teste.com' },
    profile: { id: 'user-1', saldo_gravacao: 0, saldo_ia: 0 }
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock global fetch para simular geração de PIX
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ComprarCreditosPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('deve renderizar pacotes e permitir seleção', async () => {
    renderWithProviders(<ComprarCreditosPage />);
    expect(screen.getByText('Pacote Básico')).toBeInTheDocument();
    expect(screen.getByText('Pacote Premium')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pacote Premium'));
    await waitFor(() => {
      expect(screen.getByText(/opções de pagamento/i)).toBeInTheDocument();
    });
  });

  it('deve renderizar QR Code ao escolher PIX', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        qrCodeBase64: 'data:image/png;base64,FAKEQRCODE',
        qrCodePayload: 'FAKEPAYLOAD',
        tempoExpiracaoSegundos: 300
      })
    });
    renderWithProviders(<ComprarCreditosPage />);
    fireEvent.click(screen.getByText('Pacote Básico'));
    await waitFor(() => {
      expect(screen.getByText(/opções de pagamento/i)).toBeInTheDocument();
    });
    const pixButton = screen.getAllByText(/pix/i).find(btn => btn.tagName === 'BUTTON');
    fireEvent.click(pixButton!);
    await waitFor(() => {
      expect(screen.getByText(/pix copia e cola|qr code|escaneie/i)).toBeInTheDocument();
    });
  });

  it('deve renderizar formulário de cartão ao escolher Cartão', async () => {
    renderWithProviders(<ComprarCreditosPage />);
    fireEvent.click(screen.getByText('Pacote Premium'));
    await waitFor(() => {
      expect(screen.getByText(/opções de pagamento/i)).toBeInTheDocument();
    });
    const cardButton = screen.getAllByText(/cartão/i).find(btn => btn.tagName === 'BUTTON');
    fireEvent.click(cardButton!);
    await waitFor(() => {
      // Buscar pelo placeholder real do input de número do cartão
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
    });
  });
}); 