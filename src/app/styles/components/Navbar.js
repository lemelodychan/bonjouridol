import Logo from "../assets/logo_normal_white.svg";
import styles from "./navbar.module.scss"

export default function Navbar() {
    return (
        <div className="menu">
            <div className="logo">
                <img src={Logo} alt="Logo" />
            </div>

            <nav className="navbar" role="navigation" aria-label="main navigation">
                Menu ici
            </nav>
        </div>
    )
}