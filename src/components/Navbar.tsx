import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
      style={{ backgroundColor: "#0B3D4A" }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-display font-bold text-white text-[22px] leading-tight">
              DODILIGENCE
            </span>

          
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
