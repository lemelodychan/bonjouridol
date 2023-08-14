import React, { useState } from "react";
import { NavLink } from "react-router-dom";

import '../App.scss';
import './Navbar.scss';
import Logo from "../assets/logo_normal_white.svg";

const Navbar = () => {
  const [isOpen, setOpen] = useState(false);
  return (
    <div className="menu">
        <div className="logo">
            <img src={Logo} alt="React Logo" />
        </div>

        <nav className="navbar" role="navigation" aria-label="main navigation">
            <div className={`navbar-menu ${isOpen && "is-active"}`}>
                <NavLink className="navbar-item" activeClassName="is-active" to="/">
                    Home
                </NavLink>

                <NavLink className="navbar-item" activeClassName="is-active" to="/about">
                    About
                </NavLink>
            </div>
        </nav>
    </div>
  );
};

export default Navbar;