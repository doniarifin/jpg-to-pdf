import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import Home from "./pages/Home";
import Merge from "./pages/Merge";
import PdfToJpg from "./pages/PdfToJpg";
import Crop from "./pages/Crop";
import ImageCompress from "./pages/ImageCompress";
import SignPdf from "./pages/SignPdf";
import Footer from "./components/Footer";
import { useDarkMode } from "./hooks/useDarkMode";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? "bg-yellow-400 text-gray-900"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block w-full text-center px-4 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? "bg-yellow-400 text-gray-900"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
  }`;

function App() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useDarkMode();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-3 flex items-center gap-3">
          <NavLink
            to="/"
            end
            className="font-bold text-gray-800 dark:text-gray-100 mr-auto hover:text-brand-600 transition cursor-pointer"
          >
            PDF Tools
          </NavLink>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-3">
            <NavLink to="/" end className={navLinkClass}>
              JPG to PDF
            </NavLink>
            <NavLink to="/merge" className={navLinkClass}>
              Merge PDF
            </NavLink>
            <NavLink to="/pdf-to-jpg" className={navLinkClass}>
              PDF to JPG
            </NavLink>
            <NavLink to="/crop" className={navLinkClass}>
              Crop PDF
            </NavLink>
            <NavLink to="/sign" className={navLinkClass}>
              Sign PDF
            </NavLink>
            <NavLink to="/compress" className={navLinkClass}>
              Compress Image
            </NavLink>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition"
          >
            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <FontAwesomeIcon icon={open ? faXmark : faBars} />
          </button>
        </div>

        {/* Mobile expandable menu */}
        {open && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-6 md:px-10 py-3 flex flex-col gap-2 bg-white dark:bg-gray-900">
            <NavLink
              to="/"
              end
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              JPG to PDF
            </NavLink>
            <NavLink
              to="/merge"
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              Merge PDF
            </NavLink>
            <NavLink
              to="/pdf-to-jpg"
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              PDF to JPG
            </NavLink>
            <NavLink
              to="/crop"
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              Crop PDF
            </NavLink>
            <NavLink
              to="/sign"
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              Sign PDF
            </NavLink>
            <NavLink
              to="/compress"
              className={mobileNavLinkClass}
              onClick={() => setOpen(false)}
            >
              Compress Image
            </NavLink>
          </div>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<Merge />} />
        <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
        <Route path="/crop" element={<Crop />} />
        <Route path="/sign" element={<SignPdf />} />
        <Route path="/compress" element={<ImageCompress />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;