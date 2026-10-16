import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('exibe o titulo do front-end', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'SmartMarket — Front-end',
    )
  })
})
