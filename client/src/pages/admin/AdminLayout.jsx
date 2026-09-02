import { NavLink, Outlet } from 'react-router-dom';
import { useSeo } from '../../components/RouteEffects.jsx';

export default function AdminLayout() {
  useSeo({ title: 'Admin', noindex: true });
  return (
    <div className="admin">
      <header className="admin__head">
        <h1>Deck builder</h1>
        <nav className="admin__nav">
          <NavLink to="/admin/designs" className="btn btn--ghost btn--sm">
            Designs
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
