import { Link } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <h2 className="navbar-logo">MyApp</h2>
      <div className="navbar-links">
        <Link to="/" className="navbar-link">Home</Link>
        <Link to="/about" className="navbar-link">About</Link>
        <Link to="/apply" className="navbar-link">Apply</Link>
        <Link to="/login" className="navbar-link">Login</Link>
      </div>
    </nav>
  )
}
