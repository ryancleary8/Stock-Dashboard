import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext({
  pathname: '/',
  navigate: () => {}
});

function getPathname() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function BrowserRouter({ children }) {
  const [pathname, setPathname] = useState(getPathname);

  useEffect(() => {
    const onLocationChange = () => setPathname(getPathname());
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('pushstate', onLocationChange);
    window.addEventListener('replacestate', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('pushstate', onLocationChange);
      window.removeEventListener('replacestate', onLocationChange);
    };
  }, []);

  const navigate = (to, options = {}) => {
    if (!to || to === pathname) return;

    if (options.replace) {
      window.history.replaceState({}, '', to);
      window.dispatchEvent(new Event('replacestate'));
      return;
    }

    window.history.pushState({}, '', to);
    window.dispatchEvent(new Event('pushstate'));
  };

  const value = useMemo(() => ({ pathname, navigate }), [pathname]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function Routes({ children }) {
  const { pathname } = useContext(RouterContext);
  const routes = Array.isArray(children) ? children : [children];

  for (const route of routes) {
    if (!route) continue;
    if (route.props.path === pathname) return route.props.element;
    if (route.props.path === '*') return route.props.element;
  }

  return null;
}

export function Route() {
  return null;
}

export function Navigate({ to, replace }) {
  const { navigate } = useContext(RouterContext);

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);

  return null;
}

export function Link({ to, onClick, children, ...props }) {
  const { navigate } = useContext(RouterContext);

  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function useNavigate() {
  const { navigate } = useContext(RouterContext);
  return navigate;
}
