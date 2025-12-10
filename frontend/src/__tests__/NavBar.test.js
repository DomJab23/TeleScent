import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavBar from '../components/NavBar';
import { ColorModeContext } from '../contexts/ColorModeContext';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' })
  };
});

describe('NavBar', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const renderWithProviders = () =>
    render(
      <ColorModeContext.Provider value={{ mode: 'light', toggleColorMode: jest.fn() }}>
        <NavBar />
      </ColorModeContext.Provider>
    );

  test('logout removes token and navigates to login', async () => {
    localStorage.setItem('token', 'fake');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    renderWithProviders();

    const accountBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(accountBtn);

    // Confirm dialog
    const confirmBtn = await screen.findByRole('button', { name: /logout/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
