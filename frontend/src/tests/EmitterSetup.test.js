import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmitterSetup from '../pages/EmitterSetup';
import '@testing-library/jest-dom';

describe('EmitterSetup page', () => {
  test('adds a new smell and assigns to a slot', () => {
    render(<EmitterSetup />);

    // Open add smell dialog
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'TestSmell' } });
    // Category select (combobox role)
    const combo = screen.getByRole('combobox');
    fireEvent.mouseDown(combo);
    fireEvent.click(screen.getByRole('option', { name: /Food/i }));
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText(/TestSmell/i)).toBeInTheDocument();

    // Open assign dialog for slot 1
    const assignButtons = screen.getAllByRole('button', { name: /Assign Smell/i });
    fireEvent.click(assignButtons[0]);
    fireEvent.click(screen.getByText(/TestSmell/i));

    // Snackbar should appear
    expect(screen.getByText(/Assigned smell to cartridge/i)).toBeInTheDocument();
  });
});
