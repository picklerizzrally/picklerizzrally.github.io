import { useEffect, useState } from "react";
import { LiveProvider } from "./lib/store";
import { ErrorBoundary, UIContext } from "./components/ui";
import { RegisterModal } from "./components/RegisterModal";
import Home from "./pages/Home";
import Live from "./pages/Live";
import TeamPage from "./pages/TeamPage";
import Admin from "./pages/Admin";

// Hash routes work on GitHub Pages without any server setup: #/live, #/team/abc, #/admin
function useRoute() {
  const read = () => (window.location.hash.startsWith("#/") ? window.location.hash.slice(2).split("/") : []);
  const [route, setRoute] = useState<string[]>(read);
  useEffect(() => {
    const on = () => {
      const next = read();
      setRoute(next);
      if (window.location.hash.startsWith("#/")) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App() {
  const [page, param] = useRoute();
  const [reg, setReg] = useState<{ open: boolean; div?: string }>({ open: false });
  useEffect(() => setReg({ open: false }), [page, param]); // close the form when the page changes

  let view;
  if (page === "live") view = <Live tab={param} key={param ?? "live"} />;
  else if (page === "team" && param) view = <TeamPage id={param} />;
  else if (page === "admin") view = <Admin />;
  else view = <Home />;

  return (
    <ErrorBoundary>
      <LiveProvider>
        <UIContext.Provider value={{ openRegistration: (div) => setReg({ open: true, div }) }}>
          {view}
          {reg.open && <RegisterModal initialDiv={reg.div} onClose={() => setReg({ open: false })} />}
        </UIContext.Provider>
      </LiveProvider>
    </ErrorBoundary>
  );
}
