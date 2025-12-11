import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

describe('DashboardPage', () => {
  it('renders the dashboard overview', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Welcome to the LoyaltyGen Dashboard.')).toBeInTheDocument()
  })
})
