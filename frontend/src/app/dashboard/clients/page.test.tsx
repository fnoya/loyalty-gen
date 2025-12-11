import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ClientsPage from './page'
import { apiRequest } from '@/lib/api'
import { useRouter } from 'next/navigation'

// Mock the api module
jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
}))

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Lucide icons to avoid issues in tests if any
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  MoreHorizontal: () => <span data-testid="icon-more" />,
  Search: () => <span data-testid="icon-search" />,
  Users: () => <span data-testid="icon-users" />,
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock ClientAvatar
jest.mock('@/components/clients/client-avatar', () => ({
  ClientAvatar: () => <div data-testid="client-avatar">Avatar</div>,
}));

describe('ClientsPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (apiRequest as jest.Mock).mockClear();
  });

  it('renders clients list', async () => {
    const mockClients = {
      data: [
        {
          id: '1',
          name: { firstName: 'John', firstLastName: 'Doe' },
          email: 'john@example.com',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ],
    };

    (apiRequest as jest.Mock).mockResolvedValue(mockClients);

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('navigates to client details when clicking a row', async () => {
    const mockClients = {
      data: [
        {
          id: 'client-123',
          name: { firstName: 'Jane', firstLastName: 'Smith' },
          email: 'jane@example.com',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ],
    };

    (apiRequest as jest.Mock).mockResolvedValue(mockClients);

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Click the row
    fireEvent.click(screen.getByText('Jane Smith').closest('tr')!);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/client-123');
  });
});
