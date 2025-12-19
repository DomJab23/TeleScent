import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SensorData from '../pages/SensorData';
import '@testing-library/jest-dom';

// Mock apiClient
jest.mock('../config/apiConfig', () => {
  return {
    apiClient: {
      get: jest.fn()
    }
  };
});

// Mock EventSource to avoid real SSE connections
class MockEventSource {
  constructor() {
    this.close = jest.fn();
  }
  addEventListener() {}
}
global.EventSource = MockEventSource;

describe('SensorData page', () => {
  const { apiClient } = require('../config/apiConfig');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders device chips and ML card when data present', async () => {
    apiClient.get.mockResolvedValueOnce({
      devices: {
        dev1: {
          lastUpdate: new Date().toISOString(),
          dataCount: 1,
          latestReading: {
            deviceId: 'dev1',
            receivedAt: new Date().toISOString(),
            temperature: 20,
            humidity: 40,
            pressure: 100,
            gas: 1,
            voc_raw: 10,
            nox_raw: 5,
            voc: 2,
            no2: 3,
            ethanol: 1,
            co_h2: 1
          }
        }
      }
    });
    apiClient.get.mockResolvedValueOnce({
      predictions: {
        dev1: { scent: 'banana', confidence: 0.8, top_predictions: { banana: 0.8 } }
      }
    });

    render(<SensorData />);

    await waitFor(() => {
      expect(screen.getByText(/Connected Devices/i)).toBeInTheDocument();
      expect(screen.getAllByText(/banana/i).length).toBeGreaterThan(0);
    });
  });
});
