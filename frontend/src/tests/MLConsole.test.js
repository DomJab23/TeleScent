import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MLConsole from '../pages/MLConsole';
import '@testing-library/jest-dom';

jest.mock('../config/apiConfig', () => ({
  apiClient: {
    get: jest.fn()
  }
}));

describe('MLConsole page', () => {
  const { apiClient } = require('../config/apiConfig');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders recent predictions table when data present', async () => {
    apiClient.get.mockResolvedValueOnce({
      devices: {
        dev1: {
          lastUpdate: new Date().toISOString(),
          latestReading: {
            ml_prediction: {
              scent: 'banana',
              confidence: 0.85,
              top_predictions: { banana: 0.85, mango: 0.1, coffee: 0.05 }
            }
          }
        }
      }
    });

    render(<MLConsole />);

    await waitFor(() => {
      expect(screen.getByText(/Recent ML Predictions/i)).toBeInTheDocument();
      expect(screen.getAllByText(/banana/i).length).toBeGreaterThan(0);
    });
  });

  test('toggles auto-refresh chip', async () => {
    apiClient.get.mockResolvedValueOnce({ devices: {} });
    render(<MLConsole />);

    const chip = screen.getByText(/Auto-refresh ON/i);
    fireEvent.click(chip);
    expect(screen.getByText(/Auto-refresh OFF/i)).toBeInTheDocument();
  });
});
